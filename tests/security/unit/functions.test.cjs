const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function backend({records={},users={},storage,messaging}={}) {
 const data=new Map(Object.entries(records));const usersMap=new Map(Object.entries(users));const calls=[];let audit=0;
 const docRef=key=>({path:key,id:key.split('/').at(-1),get:async()=>snapshot(key),delete:async()=>data.delete(key)});
 const snapshot=key=>({exists:data.has(key),data:()=>data.get(key),ref:docRef(key),id:key.split('/').at(-1)});
 const db={collection:name=>({doc:id=>docRef(`${name}/${id||`audit-${++audit}`}`),get:async()=>({docs:[...data.keys()].filter(k=>k.startsWith(name+'/')&&k.split('/').length===2).map(snapshot)})}),runTransaction:async handler=>{const writes=[];const result=await handler({get:ref=>ref.get(),set:(ref,value)=>writes.push(()=>data.set(ref.path,value)),update:(ref,value)=>writes.push(()=>data.set(ref.path,{...data.get(ref.path),...value})),delete:ref=>writes.push(()=>data.delete(ref.path))});writes.forEach(write=>write());return result;}};
 const auth={getUser:async uid=>{if(!usersMap.has(uid)) {const error=new Error('missing');error.code='auth/user-not-found';throw error;}return usersMap.get(uid);},revokeRefreshTokens:async uid=>calls.push(['revoke',uid])};
 const wrap=(options,handler)=>{handler.options=options;return handler;};
 const mocks={
  'firebase-functions/params':{defineString:(name,options)=>({name,...options})},
  'firebase-functions/v2/firestore':{onDocumentCreated:wrap,onDocumentDeleted:wrap,onDocumentUpdated:wrap},'firebase-functions/v2/storage':{onObjectFinalized:wrap},
  'firebase-functions/v2/https':{onCall:wrap,HttpsError:class extends Error{constructor(code,message){super(message);this.code=code;}}},
  'firebase-admin/app':{initializeApp:()=>{}},'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>123}},'firebase-admin/auth':{getAuth:()=>auth},'firebase-admin/storage':{getStorage:()=>storage},'firebase-admin/messaging':{getMessaging:()=>messaging},
 };
 const ctx={exports:{},process:{env:{}},require:name=>mocks[name]||require(path.resolve('functions',name))};vm.createContext(ctx);vm.runInContext(fs.readFileSync('functions/index.js','utf8'),ctx);
 return {functions:ctx.exports,data,calls};
}
const member=(uid,admin=false)=>({email:`${uid}@example.com`,active:true,isAdmin:admin});
const user=uid=>({email:`${uid}@example.com`,emailVerified:true,disabled:false});
test('admin approval atomically binds a verified UID, clears pending state and writes an audit record',async()=> {
 const {functions,data}=backend({records:{'members/admin':member('admin',true),'pendingUsers/alice':{email:'alice@example.com'}},users:{admin:user('admin'),alice:user('alice')}});
 assert.equal(functions.approveMember.options.enforceAppCheck,true);
 await functions.approveMember({auth:{uid:'admin'},data:{uid:'alice'}});
 assert.equal(data.get('members/alice').active,true);assert.equal(data.get('members/alice').isAdmin,false);assert(!data.has('pendingUsers/alice'));
 const audit=[...data].find(([key])=>key.startsWith('adminAudit/'))[1];assert.equal(audit.action,'approve');assert.equal(audit.actor,'admin');
});
test('nonadmins and unverified targets cannot change approvals',async()=> {
 const records={'members/admin':member('admin',true),'members/bob':member('bob'),'pendingUsers/alice':{email:'alice@example.com'}};
 const {functions,data}=backend({records,users:{admin:user('admin'),bob:user('bob'),alice:{...user('alice'),emailVerified:false}}});
 await assert.rejects(functions.approveMember({auth:{uid:'bob'},data:{uid:'alice'}}),e=>e.code==='permission-denied');
 await assert.rejects(functions.approveMember({auth:{uid:'admin'},data:{uid:'alice'}}),e=>e.code==='failed-precondition');
 assert(data.has('pendingUsers/alice'));assert(!data.has('members/alice'));assert.equal([...data.keys()].filter(k=>k.startsWith('adminAudit/')).length,0);
});
test('revocation removes push/presence, disables membership and revokes refresh tokens',async()=> {
 const {functions,data,calls}=backend({records:{'members/admin':member('admin',true),'members/alice':member('alice'),'fcmTokens/alice':{token:'old'},'presence/alice':{}},users:{admin:user('admin')}});
 await functions.revokeMember({auth:{uid:'admin'},data:{uid:'alice'}});
 assert.equal(data.get('members/alice').active,false);assert(!data.has('fcmTokens/alice'));assert(!data.has('presence/alice'));assert.deepEqual(calls,[['revoke','alice']]);
 await assert.rejects(functions.revokeMember({auth:{uid:'admin'},data:{uid:'admin'}}),e=>e.code==='failed-precondition');
});
test('push notifications exclude revoked and disabled users and disclose no message content',async()=> {
 const sent=[];const {functions,data}=backend({records:{'members/alice':member('alice'),'members/bob':member('bob'),'members/revoked':{...member('revoked'),active:false},'members/disabled':member('disabled'),'fcmTokens/bob':{token:'BOB'},'fcmTokens/revoked':{token:'REVOKED'},'fcmTokens/disabled':{token:'DISABLED'}},users:{alice:user('alice'),bob:user('bob'),revoked:user('revoked'),disabled:{...user('disabled'),disabled:true}},messaging:{sendEachForMulticast:async payload=>{sent.push(payload);return{responses:[{success:true}]};}}});
 await functions.sendMessageNotification({data:{data:()=>({uid:'alice',text:'SECRET',displayName:'Alice'})},params:{messageId:'id'}});
 assert.equal(sent.length,1);assert.deepEqual(Array.from(sent[0].tokens),['BOB']);assert(!JSON.stringify(sent).includes('SECRET'));assert(!data.has('fcmTokens/revoked'));assert(!data.has('fcmTokens/disabled'));
});
test('media validator does not delete uploads on infrastructure failure',async()=> {
 let deletes=0;const storage={bucket:()=>({file:()=>({download:async()=>{throw new Error('Temporary storage outage');},delete:async()=>{deletes++;}})})};
 const {functions}=backend({storage});assert.equal(functions.validateMedia.options.retry,true);
 await assert.rejects(functions.validateMedia({data:{name:'chat-media/group/alice/file.webp',bucket:'bucket',generation:'123',contentType:'image/webp',size:10}}));assert.equal(deletes,0);
});
test('media validator deletes malformed bytes from the event generation only',async()=> {
 const selections=[],deletes=[];const storage={bucket:()=>({file:(name,options)=>{selections.push(options);return{download:async()=>[Buffer.from('not an image')],delete:async()=>deletes.push(options),save:async()=>assert.fail('Unsafe bytes saved')};}})};
 const {functions}=backend({storage});await functions.validateMedia({data:{name:'chat-media/group/alice/file.webp',bucket:'bucket',generation:'123',contentType:'image/webp',size:12}});
 assert.equal(deletes.length,1);assert.equal(deletes[0].generation,'123');
});
