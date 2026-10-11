const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const { getMessaging } = require('firebase-admin/messaging');
const { fetchPreviewHtml, activeMember } = require('./security');
const { authorize, targetUid } = require('./membership');
const { ownedMedia, sanitizeMedia, InvalidMedia } = require('./media');
initializeApp();
const callableOptions = {enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true', maxInstances: 5};
// Deployment discovery runs before runtime .env variables are loaded. Params let
// the CLI resolve each project's regions before validating and creating triggers.
const firestoreRegion = defineString('FIRESTORE_FUNCTION_REGION', {default:'us-central1'});
const mediaRegion = defineString('MEDIA_FUNCTION_REGION', {default:'us-central1'});
const firestoreOptions = {region:firestoreRegion,maxInstances:5};

async function requireMember(request, admin = false) {
  try { return await authorize({db:getFirestore(),auth:getAuth(),uid:request.auth?.uid,admin}); }
  catch (error) { throw new HttpsError(error.message === 'unauthenticated' ? 'unauthenticated' : 'permission-denied', 'Verified family membership required.'); }
}
function uidFromRequest(request) {
  try { return targetUid(request.data?.uid); }
  catch { throw new HttpsError('invalid-argument','A valid user ID is required.'); }
}
async function adminTransaction(request, action, uid) {
  await requireMember(request, true);
  const db = getFirestore();
  return db.runTransaction(async transaction => {
    const actor = await transaction.get(db.collection('members').doc(request.auth.uid));
    if (!actor.data()?.active || actor.data()?.isAdmin !== true) throw new HttpsError('permission-denied','Admin access required.');
    const pending = await transaction.get(db.collection('pendingUsers').doc(uid));
    const target = await transaction.get(db.collection('members').doc(uid));
    // Clients cannot demote or revoke their own administrator account.
    if (uid === request.auth.uid) throw new HttpsError('failed-precondition','You cannot change your own membership.');
    if (action === 'approve') {
      if (!pending.exists) throw new HttpsError('not-found','No pending request.');
      const user = await getAuth().getUser(uid);
      if (!user.emailVerified || user.disabled || String(user.email || '').toLowerCase() !== pending.data().email) throw new HttpsError('failed-precondition','The account must verify its email first.');
      if (target.data()?.active) throw new HttpsError('already-exists','Already a member.');
      transaction.set(db.collection('members').doc(uid), {email:user.email.toLowerCase(),active:true,isAdmin:false,approvedAt:FieldValue.serverTimestamp()});
      transaction.delete(db.collection('rejectedUsers').doc(uid));
    } else if (action === 'reject') {
      if (!pending.exists || target.data()?.active) throw new HttpsError('failed-precondition','No pending request to reject.');
      transaction.set(db.collection('rejectedUsers').doc(uid),{rejectedAt:FieldValue.serverTimestamp()});
    } else {
      if (!target.exists) throw new HttpsError('not-found','Member not found.');
      transaction.update(db.collection('members').doc(uid),{active:false,revokedAt:FieldValue.serverTimestamp()});
      transaction.delete(db.collection('fcmTokens').doc(uid));
      transaction.delete(db.collection('presence').doc(uid));
    }
    transaction.delete(db.collection('pendingUsers').doc(uid));
    transaction.set(db.collection('adminAudit').doc(),{actor:request.auth.uid,target:uid,action,createdAt:FieldValue.serverTimestamp()});
    return {success:true};
  });
}
exports.approveMember = onCall(callableOptions, request => adminTransaction(request,'approve',uidFromRequest(request)));
exports.rejectMember = onCall(callableOptions, request => adminTransaction(request,'reject',uidFromRequest(request)));
exports.revokeMember = onCall(callableOptions, async request => {
  const uid = uidFromRequest(request);
  const result = await adminTransaction(request,'revoke',uid);
  await getAuth().revokeRefreshTokens(uid);
  return result;
});

exports.sendMessageNotification = onDocumentCreated({...firestoreOptions,document:'messages/{messageId}'}, async event => {
  const data = event.data?.data();
  if (!data?.uid) return;
  const db = getFirestore();
  try { await authorize({db,auth:getAuth(),uid:data.uid}); } catch { return; }
  const tokens = await db.collection('fcmTokens').get();
  const recipients = new Map();
  await Promise.all(tokens.docs.map(async doc => {
    if (doc.id === data.uid || typeof doc.data().token !== 'string' || doc.data().token.length > 4096) return;
    try {
      await authorize({db,auth:getAuth(),uid:doc.id});
      recipients.set(doc.data().token, doc.id);
    } catch (error) {
      if (error.message !== 'permission-denied' && error.code !== 'auth/user-not-found') throw error;
      await db.runTransaction(async transaction => {
        const latest = await transaction.get(doc.ref);
        if (latest.data()?.token === doc.data().token) transaction.delete(doc.ref);
      });
    }
  }));
  const entries = [...recipients.entries()];
  for (let offset = 0; offset < entries.length; offset += 500) {
    const chunk = entries.slice(offset,offset+500);
    // Notification content is private by default, including lock screens.
    const response = await getMessaging().sendEachForMulticast({
      tokens:chunk.map(([token]) => token),
      notification:{title:'KidsChat',body:'New family message'},
      data:{messageId:event.params.messageId},
      webpush:{notification:{icon:'/icon-192.png',badge:'/icon-192.png',tag:`msg-${event.params.messageId}`},fcmOptions:{link:'https://kidschat-family.vercel.app/'}},
    });
    await Promise.all(response.responses.map(async (result,index) => {
      if (['messaging/invalid-registration-token','messaging/registration-token-not-registered'].includes(result.error?.code)) {
        const [token,uid] = chunk[index];
        await db.runTransaction(async transaction => {
          const ref = db.collection('fcmTokens').doc(uid);
          const latest = await transaction.get(ref);
          if (latest.data()?.token === token) transaction.delete(ref);
        });
      }
    }));
  }
});

const URL_RE = /https:\/\/[^\s<>"']+/i;
async function generatePreview(event) {
  const data = event.data?.data();
  if (!data || data.type) return;
  const match = String(data.text || '').match(URL_RE);
  if (!match) return;
  let html;
  try { html = await fetchPreviewHtml(match[0]); } catch { return; }
  const meta = prop => {
    const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${prop}["'][^>]*content=["']([^"']{1,500})["']`,'i'));
    return match?.[1] || '';
  };
  const title = (meta('og:title') || html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1] || '').slice(0,100);
  if (!title) return;
  // A transaction prevents a deleted or edited message from regaining a stale preview.
  await getFirestore().runTransaction(async transaction => {
    const current = await transaction.get(event.data.ref);
    if (!current.exists || current.data().text !== data.text || current.data().editedAt) return;
    transaction.update(event.data.ref,{linkPreview:{url:match[0],title,description:meta('og:description').slice(0,200),siteName:new URL(match[0]).hostname}});
  });
}
exports.generateLinkPreview = onDocumentCreated({...firestoreOptions,document:'messages/{messageId}'},generatePreview);
exports.generateDMLinkPreview = onDocumentCreated({...firestoreOptions,document:'directMessages/{convId}/messages/{msgId}'},generatePreview);

exports.sendTestNotification = onCall(callableOptions, async request => {
  await requireMember(request);
  const db = getFirestore();
  const uid = request.auth.uid;
  await db.runTransaction(async transaction => {
    const ref = db.collection('notificationLimits').doc(uid);
    const last = await transaction.get(ref);
    if (last.exists && Date.now() - last.data().sentAt.toMillis() < 60000) throw new HttpsError('resource-exhausted','Wait a minute before testing again.');
    transaction.set(ref,{sentAt:FieldValue.serverTimestamp()});
  });
  const snap = await db.collection('fcmTokens').doc(uid).get();
  if (!snap.data()?.token) throw new HttpsError('not-found','Enable notifications on this device first.');
  await requireMember(request);
  try {
    await getMessaging().send({token:snap.data().token,notification:{title:'KidsChat',body:'Notifications are working.'},webpush:{fcmOptions:{link:'https://kidschat-family.vercel.app/'}}});
    return {success:true};
  } catch { throw new HttpsError('internal','Could not deliver the test notification.'); }
});

// Read access stays closed until the server validates the bytes and strips metadata
// and reusable download tokens. Client-supplied validation markers are forbidden.
exports.validateMedia = onObjectFinalized({region:mediaRegion,maxInstances:5,concurrency:1,memory:'512MiB',retry:true}, async event => {
  const object = event.data;
  if (!/^(chat-media\/(group\/[^/]+|direct\/[^/]+\/[^/]+)|avatars\/[^/]+)\/[^/]+$/.test(object.name || '')) return;
  if (object.metadata?.validated === 'true') return;
  const bucket = getStorage().bucket(object.bucket);
  const version = bucket.file(object.name,{generation:object.generation});
  const current = bucket.file(object.name);
  const maximum = object.name.startsWith('avatars/') ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  try {
    if (Number(object.size) > maximum || Number(object.size) <= 0) throw new InvalidMedia('Invalid size');
    const [bytes] = await version.download({validation:'crc32c'});
    const sanitized = await sanitizeMedia(bytes,object.contentType,maximum);
    await current.save(sanitized.bytes,{
      resumable:false,preconditionOpts:{ifGenerationMatch:object.generation},
      metadata:{contentType:sanitized.contentType,cacheControl:'private, no-store',metadata:{validated:'true',firebaseStorageDownloadTokens:null}},
    });
  } catch (error) {
    if ([404,412].includes(error.code)) return; // Deleted, superseded, or already validated by another delivery.
    if (!(error instanceof InvalidMedia)) throw error; // Retry infrastructure failures without deleting valid uploads.
    await version.delete({ignoreNotFound:true});
  }
});
async function removeAttachments(event, scope) {
  const data = event.data?.data();
  if (!data?.uid) return;
  const bucket = getStorage().bucket();
  const values = [data.audioUrl,data.photoUrl,...(Array.isArray(data.photoUrls) ? data.photoUrls : [])];
  await Promise.all(values.map(async value => {
    const name = ownedMedia(value,bucket.name,data.uid,scope);
    if (name) await bucket.file(name).delete({ignoreNotFound:true});
  }));
}
exports.cleanupGroupMedia = onDocumentDeleted({...firestoreOptions,document:'messages/{messageId}'}, event => removeAttachments(event,'group'));
exports.cleanupDMMedia = onDocumentDeleted({...firestoreOptions,document:'directMessages/{convId}/messages/{msgId}'}, event => removeAttachments(event,`direct/${event.params.convId}`));
exports.cleanupAvatar = onDocumentUpdated({...firestoreOptions,document:'userProfiles/{uid}'}, async event => {
  const before = event.data.before.data().avatarUrl;
  if (!before || before === event.data.after.data().avatarUrl) return;
  const bucket = getStorage().bucket();
  const name = ownedMedia(before,bucket.name,event.params.uid,'avatars');
  if (name) await bucket.file(name).delete({ignoreNotFound:true});
});
