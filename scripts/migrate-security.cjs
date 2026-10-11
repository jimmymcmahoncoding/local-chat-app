#!/usr/bin/env node
'use strict';
// Read-only by default. Apply only during the access freeze in SECURITY-ROLLOUT.md.
const fs=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');const {createHash}=require('node:crypto');
const adminRequire=createRequire(path.resolve(__dirname,'../functions/package.json'));
const {initializeApp,applicationDefault}=adminRequire('firebase-admin/app');
const {getAuth}=adminRequire('firebase-admin/auth');const {getFirestore,FieldValue}=adminRequire('firebase-admin/firestore');const {getStorage}=adminRequire('firebase-admin/storage');
const {migrateActivity}=require('../security');const {destination,membershipPlan}=require('./migration-plan.cjs');const {sanitizeMedia}=require('../functions/media');
async function main({args=process.argv.slice(2),services,backupRoot=path.resolve(__dirname,'../security-backup')}={}) {
 const flag=name=>args.includes(name);const option=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
 if(flag('--help')) {console.log('Usage: node scripts/migrate-security.cjs --project PROJECT --bucket BUCKET [--preserve-unverified] [--prepare-rehearsal] [--apply --maintenance-confirmed --origin https://APP_HOST]');return;}
 const projectId=option('--project'),bucketName=option('--bucket'),apply=flag('--apply'),origin=option('--origin');
 if(apply&&flag('--prepare-rehearsal')) throw new Error('Rehearsal preparation and apply cannot be combined.');
 if(!projectId||!bucketName||!/^[-a-z0-9]+$/.test(projectId)||!/^[a-z0-9.-]+$/.test(bucketName)) throw new Error('Explicit valid project and bucket are required.');
 if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.FIREBASE_STORAGE_EMULATOR_HOST||process.env.STORAGE_EMULATOR_HOST) throw new Error('Use the separate demo tests for emulators.');
 if(apply&&(!flag('--maintenance-confirmed')||!origin||new URL(origin).origin!==origin||new URL(origin).protocol!=='https:')) throw new Error('Apply requires maintenance mode and the exact HTTPS app origin.');
 if(!services) initializeApp({credential:applicationDefault(),projectId,storageBucket:bucketName});
 const {db,auth,bucket}=services||{db:getFirestore(),auth:getAuth(),bucket:getStorage().bucket()};
 const users=new Map();let pageToken;
 do {const page=await auth.listUsers(1000,pageToken);for(const user of page.users) users.set(user.uid,user);pageToken=page.pageToken;}while(pageToken);
 const [legacy,members,pending,group,conversations,profiles,tokens,typing]=await Promise.all(['allowedUsers','members','pendingUsers','messages','directMessages','userProfiles','fcmTokens','typingIndicators'].map(name=>db.collection(name).get()));
 const {byEmail,memberMap,newMembers,deferredVerification}=membershipPlan(users,legacy.docs.map(doc=>({email:doc.id,isAdmin:doc.data().isAdmin})),members.docs.map(doc=>[doc.id,doc.data()]),flag('--preserve-unverified'));
 const messageDocs=[...group.docs];const backups=[...legacy.docs,...members.docs,...pending.docs,...group.docs,...conversations.docs,...profiles.docs,...tokens.docs,...typing.docs];
 for(const conversation of conversations.docs) {
  const p=conversation.data().participants;
  if(!Array.isArray(p)||p.length!==2||p.some(uid=>typeof uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(uid))||p[0]===p[1]||[...p].sort().join('_')!==conversation.id) throw new Error('A conversation has invalid participants; review it before migration.');
  const children=await conversation.ref.collection('messages').get();messageDocs.push(...children.docs);backups.push(...children.docs);
 }
 const files=new Map(),patches=[];
 function mediaPatch(doc,scope,isProfile=false) {
  const data=doc.data(),uid=isProfile?doc.id:data.uid,patch=isProfile?{}:migrateActivity(data);
  for(const field of ['avatarUrl','photoUrl','audioUrl','photoUrls']) {
   if(!data[field]||Array.isArray(data[field])&&data[field].length===0) continue;
   const values=field==='photoUrls'?data[field]:[data[field]];
   if(!Array.isArray(values)) throw new Error('Malformed attachment list requires manual review.');
   const converted=values.map(value=> {
    const entry=destination(value,bucketName,uid,scope,field==='avatarUrl');
    files.set(entry.target,{...entry,avatar:field==='avatarUrl'});return `gs://${bucketName}/${entry.target}`;
   });
   if(JSON.stringify(field==='photoUrls'?converted:converted[0])!==JSON.stringify(data[field])) patch[field]=field==='photoUrls'?converted:converted[0];
  }
  if(Object.keys(patch).length) patches.push({doc,patch});
 }
 for(const doc of messageDocs) {const pieces=doc.ref.path.split('/');mediaPatch(doc,pieces[0]==='messages'?'group':`direct/${pieces[1]}`);}
 for(const doc of profiles.docs) mediaPatch(doc,'avatars',true);
 // Metadata preflight happens before any remote mutation. Missing media requires explicit manual reconciliation.
 for(const entry of files.values()) {
  const [metadata]=await bucket.file(entry.source).getMetadata();
  if(Number(metadata.size)> (entry.avatar?5:10)*1024*1024||Number(metadata.size)<=0) throw new Error('An attachment exceeds the migration size limit.');
  entry.metadata=metadata;
 }
 const pendingPlans=[];
 for(const doc of pending.docs) {
  if(users.has(doc.id)) continue;
  const user=byEmail.get(String(doc.data().email||doc.id).toLowerCase());
  if(user?.emailVerified&&!user.disabled&&!memberMap.get(user.uid)?.active) pendingPlans.push({doc,uid:user.uid,data:{email:user.email.toLowerCase(),displayName:String(doc.data().displayName||'Family member').slice(0,50),requestedAt:doc.data().requestedAt||FieldValue.serverTimestamp()}});
 }
 const [inventory]=await bucket.getFiles();const revoke=inventory.filter(file=>/^(photos|voice-messages|avatars|chat-media)\//.test(file.name));
 console.log(JSON.stringify({mode:apply?'apply':'dry-run',newMembers:newMembers.length,deferredVerification,messageUpdates:patches.length,mediaObjects:files.size,pendingRequests:pendingPlans.length,tokensToClear:tokens.size,objectsToRevoke:revoke.length},null,2));
 if(!apply&&!flag('--prepare-rehearsal')) {console.log('Dry run complete. No remote data changed.');return;}
 fs.mkdirSync(backupRoot,{recursive:true,mode:0o700});
 const backupDir=fs.mkdtempSync(path.join(backupRoot+path.sep,apply?'apply-':'rehearsal-'));fs.chmodSync(backupDir,0o700);
 fs.writeFileSync(path.join(backupDir,'firestore.json'),JSON.stringify(backups.map(doc=>({path:doc.ref.path,data:doc.data(),updateTime:doc.updateTime})),null,2),{mode:0o600});
 const [bucketMetadata]=await bucket.getMetadata();fs.writeFileSync(path.join(backupDir,'bucket.json'),JSON.stringify(bucketMetadata,null,2),{mode:0o600});
 // First download, back up and validate all referenced bytes. Invalid input stops before any cloud write.
 for(const entry of files.values()) {
  const version=bucket.file(entry.source,{generation:entry.metadata.generation});
  const [bytes]=await version.download({validation:'crc32c'});
  const key=createHash('sha256').update(entry.source).digest('hex');
  fs.writeFileSync(path.join(backupDir,key+'.media'),bytes,{mode:0o600});
  fs.writeFileSync(path.join(backupDir,key+'.json'),JSON.stringify(entry.metadata,null,2),{mode:0o600});
  const sanitized=await sanitizeMedia(bytes,entry.metadata.contentType,(entry.avatar?5:10)*1024*1024);
  const outputPath=path.join(backupDir,createHash('sha256').update(entry.target).digest('hex')+'.sanitized');
  fs.writeFileSync(outputPath,sanitized.bytes,{mode:0o600});
  entry.sanitized={contentType:sanitized.contentType,path:outputPath};
 }
 if(!apply) {
  const allMetadata=[];for(const file of revoke) {const [metadata]=await file.getMetadata();allMetadata.push(metadata);}
  fs.writeFileSync(path.join(backupDir,'inventory.json'),JSON.stringify(allMetadata,null,2),{mode:0o600});
  fs.writeFileSync(path.join(backupDir,'accounts.json'),JSON.stringify([...users.values()].map(u=>({uid:u.uid,email:u.email,emailVerified:u.emailVerified,disabled:u.disabled})),null,2),{mode:0o600});
  fs.writeFileSync(path.join(backupDir,'media.json'),JSON.stringify([...files.values()].map(e=>({source:e.source,target:e.target,metadata:e.metadata,avatar:e.avatar,backupFile:createHash('sha256').update(e.source).digest('hex')+'.media'})),null,2),{mode:0o600});
  console.log(JSON.stringify({mode:'rehearsal-preparation',validatedMedia:files.size,backupDir,remoteWrites:0}));return {backupDir};
 }
 for(const entry of files.values()) {
  const target=bucket.file(entry.target);
  // An existing destination is a prior partial migration; validate its bytes rather than overwrite silently.
  if(entry.source!==entry.target&&(await target.exists())[0]) {
   const [meta]=await target.getMetadata();if(meta.metadata?.validated!=='true'||meta.metadata?.firebaseStorageDownloadTokens) throw new Error('Unexpected migration destination.');
  } else await target.save(fs.readFileSync(entry.sanitized.path),{resumable:false,preconditionOpts:{ifGenerationMatch:entry.source===entry.target?entry.metadata.generation:0},metadata:{contentType:entry.sanitized.contentType,cacheControl:'private, no-store',metadata:{validated:'true',firebaseStorageDownloadTokens:null}}});
 }
 for(const {doc,patch} of patches) await doc.ref.update(patch,{lastUpdateTime:doc.updateTime});
 for(const {uid,data} of newMembers) await db.collection('members').doc(uid).create({...data,approvedAt:FieldValue.serverTimestamp(),migratedAt:FieldValue.serverTimestamp()});
 for(const plan of pendingPlans) {
  const dest=db.collection('pendingUsers').doc(plan.uid);if(!(await dest.get()).exists) await dest.create(plan.data);
  await plan.doc.ref.delete({lastUpdateTime:plan.doc.updateTime});
 }
 for(const doc of [...tokens.docs,...typing.docs]) await doc.ref.delete({lastUpdateTime:doc.updateTime});
 // Remove reusable tokens from all existing family objects, including orphaned files.
 for(const file of revoke) {
  const [metadata]=await file.getMetadata();
  if(metadata.metadata?.firebaseStorageDownloadTokens) await file.setMetadata({metadata:{firebaseStorageDownloadTokens:null},cacheControl:'private, no-store'},{preconditionOpts:{ifMetagenerationMatch:metadata.metageneration}});
 }
 await bucket.setCorsConfiguration([{origin:[origin],method:['GET'],responseHeader:['Content-Type','Authorization','X-Firebase-AppCheck'],maxAgeSeconds:3600}]);
 console.log('Migration complete. Private backup saved under security-backup/. Deploy the coordinated release per SECURITY-ROLLOUT.md.');
}
module.exports={main};
if(require.main===module) main().catch(error=>{console.error('Migration stopped:',error.code||'validation-error',error.message?.startsWith('No ')?error.message:'Review the preflight or partial migration before retrying. No credentials or attachment URLs were logged.');process.exitCode=1;});
