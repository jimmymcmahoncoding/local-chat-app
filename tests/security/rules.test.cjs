const {test,before,after,beforeEach} = require('node:test');
const fs = require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails} = require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,query,where,updateDoc,deleteDoc,writeBatch,serverTimestamp,Timestamp} = require('firebase/firestore');
const {ref,uploadBytes,getBytes,listAll,deleteObject} = require('firebase/storage');
let env;
const projectId = 'demo-kidschat-security';
const bucket = `${projectId}.appspot.com`;
const context = (uid,verified=true,email=`${uid}@example.com`) => env.authenticatedContext(uid,{email,email_verified:verified});
const db = uid => context(uid).firestore();
const textMessage = (uid,extra={}) => ({uid,text:'Hello',displayName:uid,avatar:'😀',avatarUrl:'',createdAt:serverTimestamp(),...extra});
async function send(database,path,data,extraPath) {
 const batch=writeBatch(database); batch.set(doc(database,path),data);
 batch.set(doc(database,`sendLimits/${data.uid}`),{lastSent:serverTimestamp(),messagePath:path});
 if(extraPath) batch.set(doc(database,extraPath),data);
 return batch.commit();
}
before(async()=> { env=await initializeTestEnvironment({projectId,firestore:{rules:fs.readFileSync('firestore.rules','utf8')},storage:{rules:fs.readFileSync('storage.rules','utf8')}}); });
after(async()=> {await env?.cleanup();});
beforeEach(async()=> {
 await env.clearFirestore(); await env.clearStorage();
 await env.withSecurityRulesDisabled(async ctx=> {
  const database=ctx.firestore();
  for(const uid of ['alice','bob','carol','admin','revoked']) await setDoc(doc(database,`members/${uid}`),{email:`${uid}@example.com`,active:uid!=='revoked',isAdmin:uid==='admin'});
  await setDoc(doc(database,'directMessages/alice_bob'),{participants:['alice','bob'],updatedAt:Timestamp.now(),lastMessage:''});
  await setDoc(doc(database,'messages/existing'),textMessage('bob',{createdAt:Timestamp.now()}));
  await setDoc(doc(database,'messages/poll'),textMessage('bob',{createdAt:Timestamp.now(),type:'poll',text:'[Poll]',question:'Q?',options:['A','B'],votesByUser:{bob:0},reactionsByUser:{bob:'❤️'},seenBy:{bob:true}}));
  for(const path of ['chat-media/group/alice/ready.webp','chat-media/direct/alice_bob/alice/ready.webp','avatars/alice/ready.webp']) await uploadBytes(ref(ctx.storage(`gs://${bucket}`),path),new Uint8Array([1]),{contentType:'image/webp',customMetadata:{validated:'true'}});
 });
});
test('only verified, approved UID and matching email can read family data',async()=> {
 await assertSucceeds(getDoc(doc(db('alice'),'messages/existing')));
 for(const ctx of [env.unauthenticatedContext(),context('pending'),context('revoked'),context('alice',false),context('alice',true,'other@example.com')]) await assertFails(getDoc(doc(ctx.firestore(),'messages/existing')));
 await assertFails(setDoc(doc(db('alice'),'members/alice'),{active:true,isAdmin:true}));
 await assertFails(getDocs(collection(db('alice'),'members')));
 await assertSucceeds(getDocs(collection(db('admin'),'members')));
 await assertFails(getDocs(collection(db('admin'),'allowedUsers')));
});
test('pending requests require verified identity; roles and approvals are backend-only',async()=> {
 const pending=context('pending').firestore();
 await assertSucceeds(setDoc(doc(pending,'pendingUsers/pending'),{email:'pending@example.com',displayName:'P',requestedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(pending,'pendingUsers/forged'),{email:'pending@example.com',displayName:'P',requestedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(context('unknown',false).firestore(),'pendingUsers/unknown'),{email:'unknown@example.com',displayName:'P',requestedAt:serverTimestamp()}));
 await assertFails(deleteDoc(doc(db('admin'),'pendingUsers/pending')));
 await assertFails(getDocs(collection(db('alice'),'pendingUsers')));
 await assertSucceeds(getDocs(collection(db('admin'),'pendingUsers')));
});
test('messages require a paired rate record bound to one specific message',async()=> {
 const database=db('alice');
 await assertFails(setDoc(doc(database,'messages/unpaired'),textMessage('alice')));
 await assertFails(send(database,'messages/one',textMessage('alice'),'messages/two'));
 await assertSucceeds(send(database,'messages/first',textMessage('alice')));
 await assertFails(send(database,'messages/fast',textMessage('alice')));
 await assertFails(send(db('pending'),'messages/attack',textMessage('pending')));
});
test('message schemas reject unsafe URLs, malformed photos and seeded activity',async()=> {
 const database=db('alice');
 for(const payload of [
 {type:'photos',text:'[Photos]',photoUrls:[{evil:true}]},
 {mentions:[123]}, {mentions:[null]}, {mentions:['alice,bob']},
 {type:'photos',text:'[Photos]',photoUrls:[`gs://${bucket}/chat-media/group/alice/a.webp;gs://${bucket}/chat-media/group/alice/b.webp`] }, {votesByUser:{bob:0}},
 {type:'photo',text:'[Photo]',photoUrl:`gs://${bucket}/chat-media/direct/alice_bob/alice/a.webp`},
 {type:'photo',text:'[Photo]',photoUrl:`gs://${bucket}/chat-media/group/bob/a.webp`},
 {type:'gif',text:'[GIF]',gifUrl:'http://media.giphy.com/foo'},
 {type:'poll',text:'[Poll]',question:'Q',options:['a','b'],votesByUser:{bob:0}},
 {reactionsByUser:{bob:'❤️'}}, {votes:{0:{length:'<img onerror=alert(1)>'}}},
 ]) await assertFails(send(database,'messages/bad',textMessage('alice',payload)));
 await assertSucceeds(send(database,'messages/photo',textMessage('alice',{type:'photo',text:'[Photo]',photoUrl:`gs://${bucket}/chat-media/group/alice/a.webp`} )));
});
test('each member may change only their own vote, reaction and receipt',async()=> {
 const database=db('alice'),poll=doc(database,'messages/poll');
 await assertSucceeds(updateDoc(poll,{'votesByUser.alice':1,'reactionsByUser.alice':'👍','seenBy.alice':true}));
 for(const payload of [{'votesByUser.bob':1},{votesByUser:{alice:0}},{'votesByUser.alice':2},{'votesByUser.alice':'0'},{'reactionsByUser.bob':'🔥'},{'reactionsByUser.alice':'<svg>'},{'seenBy.bob':false},{'seenBy.alice':'yes'},{votes:{0:['bob','alice']}},{reactions:{'👍':['bob']}}]) await assertFails(updateDoc(poll,payload));
 await assertFails(updateDoc(doc(database,'messages/existing'),{text:'Hijacked',editedAt:serverTimestamp()}));
});
test('DM messages and typing are participant-only including for admins',async()=> {
 const path='directMessages/alice_bob';
 await assertSucceeds(getDoc(doc(db('alice'),path)));
 for(const uid of ['carol','admin','pending','revoked']) await assertFails(getDoc(doc(db(uid),path)));
 await assertSucceeds(setDoc(doc(db('alice'),`${path}/typingIndicators/alice`),{displayName:'Alice',isTyping:true,updatedAt:serverTimestamp()}));
 await assertFails(getDocs(collection(db('carol'),`${path}/typingIndicators`)));
 await assertFails(setDoc(doc(db('alice'),'typingIndicators/alice'),{roomId:'alice_bob',displayName:'Alice',isTyping:true,updatedAt:serverTimestamp()}));
 await assertSucceeds(send(db('alice'),`${path}/messages/first`,textMessage('alice')));
 await assertFails(getDoc(doc(db('carol'),`${path}/messages/first`)));
 await assertSucceeds(getDocs(query(collection(db('alice'),'directMessages'),where('participants','array-contains','alice'))));
 await assertFails(getDocs(collection(db('alice'),'directMessages')));
});
test('new conversations cannot enroll pending members or mutate participants',async()=> {
 const database=db('alice');
 await assertFails(setDoc(doc(database,'directMessages/alice_pending'),{participants:['alice','pending'],updatedAt:serverTimestamp(),lastMessage:''}));
 await assertFails(setDoc(doc(database,'directMessages/wrong-id'),{participants:['alice','carol'],updatedAt:serverTimestamp(),lastMessage:''}));
 await assertSucceeds(setDoc(doc(database,'directMessages/alice_carol'),{participants:['alice','carol'],updatedAt:serverTimestamp(),lastMessage:''}));
 await assertFails(updateDoc(doc(database,'directMessages/alice_bob'),{participants:['alice','carol'],updatedAt:serverTimestamp(),lastMessage:''}));
});
test('storage denies pending, revoked, outsiders, lists and forged validation markers',async()=> {
 const group='chat-media/group/alice/ready.webp',dm='chat-media/direct/alice_bob/alice/ready.webp';
 const storage=(uid,verified=true)=>context(uid,verified).storage(`gs://${bucket}`);
 await assertSucceeds(getBytes(ref(storage('alice'),group)));
 await assertSucceeds(getBytes(ref(storage('bob'),dm)));
 for(const [uid,verified] of [['pending',true],['revoked',true],['alice',false]]) await assertFails(getBytes(ref(storage(uid,verified),group)));
 for(const uid of ['carol','admin']) await assertFails(getBytes(ref(storage(uid),dm)));
 await assertFails(listAll(ref(storage('alice'),'chat-media/group/alice')));
 await assertFails(uploadBytes(ref(storage('alice'),'chat-media/group/bob/new.webp'),new Uint8Array([1]),{contentType:'image/webp'}));
 await assertFails(uploadBytes(ref(storage('alice'),'chat-media/group/alice/new.webp'),new Uint8Array([1]),{contentType:'image/webp',customMetadata:{client:'kidschat',validated:'true'}}));
 await assertFails(uploadBytes(ref(storage('alice'),'chat-media/group/alice/x.svg'),new Uint8Array([1]),{contentType:'image/svg+xml'}));
 await assertFails(uploadBytes(ref(storage('alice'),'photos/alice/legacy.webp'),new Uint8Array([1]),{contentType:'image/webp'}));
 await assertSucceeds(uploadBytes(ref(storage('alice'),'chat-media/group/alice/new.webp'),new Uint8Array([1]),{contentType:'image/webp',customMetadata:{client:'kidschat'}}));
 await assertFails(getBytes(ref(storage('alice'),'chat-media/group/alice/new.webp')));
 await assertFails(uploadBytes(ref(storage('alice'),group),new Uint8Array([1]),{contentType:'image/webp'}));
 await assertFails(deleteObject(ref(storage('carol'),dm)));
 await assertSucceeds(uploadBytes(ref(storage('alice'),'avatars/alice/new.webp'),new Uint8Array([1]),{contentType:'image/webp',customMetadata:{client:'kidschat'}}));
 await assertFails(uploadBytes(ref(storage('alice'),'avatars/alice/forged.webp'),new Uint8Array([1]),{contentType:'image/webp',customMetadata:{client:'kidschat',validated:'true'}}));
});
test('revocation immediately closes stored media and messages to an existing session',async()=> {
 const alice=context('alice'),database=alice.firestore(),storage=alice.storage(`gs://${bucket}`);
 await assertSucceeds(getDoc(doc(database,'messages/existing')));
 await env.withSecurityRulesDisabled(ctx=>updateDoc(doc(ctx.firestore(),'members/alice'),{active:false}));
 await assertFails(getDoc(doc(database,'messages/existing')));
 await assertFails(getBytes(ref(storage,'chat-media/group/alice/ready.webp')));
});
test('legitimate maximum-size message fields and supported media types stay usable',async()=> {
 const database=db('alice');
 const common={mentions:Array.from({length:20},(_,i)=>`member${i}`),replyTo:{text:'Reply',displayName:'Bob',messageId:'existing'}};
 const variants=[
 {...common},
 {...common,type:'gif',text:'[GIF]',gifUrl:'https://media1.giphy.com/media/example/giphy.gif'},
 {...common,type:'sticker',text:'[Sticker]',sticker:'😀'},
 {...common,type:'voice',text:'[Voice message]',audioUrl:`gs://${bucket}/chat-media/group/alice/v.webm`,duration:120},
 {...common,type:'photos',text:'[Photos]',photoUrls:Array.from({length:10},(_,i)=>`gs://${bucket}/chat-media/group/alice/p${i}.webp`)},
 {...common,type:'poll',text:'[Poll]',question:'Choose',options:['a','b','c','d'],votesByUser:{}},
 ];
 for(const [index,variant] of variants.entries()) {
  await env.withSecurityRulesDisabled(ctx=>deleteDoc(doc(ctx.firestore(),'sendLimits/alice')));
  await assertSucceeds(send(database,`messages/valid${index}`,textMessage('alice',variant))).catch(error=>{error.message += ` (valid case ${index})`; throw error;});
 }
 await assertSucceeds(setDoc(doc(database,'userProfiles/alice'),{displayName:'Alice',avatar:'😀',avatarUrl:`gs://${bucket}/avatars/alice/a.webp`}));
 await assertSucceeds(setDoc(doc(database,'presence/alice'),{displayName:'Alice',avatar:'😀',online:true,lastSeen:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(database,'fcmTokens/alice'),{token:'TOKEN',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(db('bob'),'fcmTokens/alice')));
 const storage=context('alice').storage(`gs://${bucket}`);
 await assertFails(uploadBytes(ref(storage,'chat-media/group/alice/too-big.webp'),new Uint8Array(10*1024*1024+1),{contentType:'image/webp'}));
 await assertSucceeds(uploadBytes(ref(storage,'chat-media/direct/alice_bob/alice/audio.webm'),new Uint8Array([1]),{contentType:'audio/webm;codecs=opus',customMetadata:{client:'kidschat'}}));
 await assertFails(uploadBytes(ref(context('carol').storage(`gs://${bucket}`),'chat-media/direct/alice_bob/carol/audio.webm'),new Uint8Array([1]),{contentType:'audio/webm'}));
});
