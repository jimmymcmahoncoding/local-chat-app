const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const S=require('../../../security');
const {publicAddress,previewUrl,resolvePublic,fetchPreviewHtml,activeMember}=require('../../../functions/security');
const {authorize}=require('../../../functions/membership');
const {ownedMedia,sanitizeMedia,InvalidMedia}=require('../../../functions/media');
const {EventEmitter}=require('node:events');
const {Readable}=require('node:stream');
test('account-conflict guidance identifies only a valid returned email',()=> {
 const message=S.accountConflictMessage('person@example.com','microsoft.com');
 assert(message.includes('Microsoft returned the email person@example.com'));
 assert(message.includes('auth/account-exists-with-different-credential'));
 assert(!message.includes('Google'));
 for(const email of [undefined,{},'a'.repeat(255),'bad\n@example.com','<script>@example.com']) {
  assert(S.accountConflictMessage(email,'microsoft.com').includes('an email already registered here'));
 }
 assert(S.accountConflictMessage('person@example.com','google.com').includes('Use the sign-in method you previously used'));
});
test('real popup handler presents the conflict email without retaining or linking credentials',async()=> {
 const source=readFileSync('app.js','utf8');
 const code=source.slice(source.indexOf('  async function handleSignIn('),source.indexOf("  signInBtn.addEventListener('click'"));
 const credential={accessToken:'SECRET_ACCESS',idToken:'SECRET_ID'};
 const status={textContent:'Old error'};
 let signInCalls=0;
 const provider={providerId:'microsoft.com'};
 const ctx={ChatSecurity:S,authStatus:status,auth:{signInWithPopup:async(p)=>{signInCalls++;assert.equal(p,provider);assert.equal(status.textContent,'');throw {code:'auth/account-exists-with-different-credential',customData:{email:'person@example.com'},credential};}}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 await ctx.handleSignIn(provider);
 assert.equal(signInCalls,1);assert(status.textContent.includes('person@example.com'));
 assert(!status.textContent.includes('SECRET'));assert(!code.includes('linkWith'));assert(!code.includes('localStorage'));assert(!code.includes('sessionStorage'));
 ctx.auth.signInWithPopup=async()=>{throw {code:'auth/popup-closed-by-user',message:'Popup closed'};};
 await ctx.handleSignIn(provider);assert.equal(status.textContent,'Sign-in failed: Popup closed');
});
test('stored poll injection and malformed activity are harmless in the real renderer',()=> {
 const source=readFileSync('app.js','utf8');
 const code=source.slice(source.indexOf('  function buildPollHtml('),source.indexOf('  function buildLinkPreviewHtml('));
 const ctx={ChatSecurity:S,lastMessagesUser:{uid:'alice'},escapeHtml:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 const payload='<img src=x onerror=alert(1)>';
 const html=ctx.buildPollHtml({question:payload,options:['A','B'],votes:{0:{length:payload},1:['bob','bob']}},'id',false);
 assert(!html.includes(payload));assert(html.includes('1 vote'));assert(!html.includes('NaN'));assert(!html.includes('width:<'));
 assert.deepEqual(S.pollCounts({options:['a','b'],votesByUser:{alice:0,bob:1,c:10,d:'1'}}).counts,[1,1]);
 assert.deepEqual(S.reactions({reactions:{'❤️':{length:payload},'👍':['bob','bob',{}]}})['👍'],['bob']);
 assert.deepEqual(S.migrateActivity({type:'poll',options:['a','b'],votes:{0:['bob'],1:['bob','alice']}}).votesByUser,{bob:0,alice:1});
});
test('media URLs are HTTPS, bucket bound, scoped, and never use public tokens',()=> {
 assert.equal(S.httpsUrl('http://media.giphy.com/foo'),false);
 assert.equal(S.mediaLocation('https://firebasestorage.googleapis.com/v0/b/other/o/avatars%2Falice%2Fa.webp?token=x','bucket'),null);
 assert.equal(S.mediaLocation('gs://bucket/photos/alice/a.webp','bucket'),null);
 assert.equal(S.mediaLocation('gs://bucket/avatars/alice/..','bucket'),null);
 assert.equal(S.mediaLocation('https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Falice%2Fa.webp?token=SECRET','bucket').canonical,'gs://bucket/avatars/alice/a.webp');
 assert.equal(ownedMedia('gs://bucket/chat-media/direct/alice_bob/alice/a.webp','bucket','alice','group'),null);
});
test('preview fetch blocks internal IPs, credentials, unsafe protocols and mixed DNS',async()=> {
 for(const ip of ['0.0.0.0','127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','224.1.1.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1']) assert.equal(publicAddress(ip),false,ip);
 assert(publicAddress('8.8.8.8'));assert(publicAddress('2606:4700:4700::1111'));
 for(const url of ['http://example.com','https://localhost/','https://169.254.169.254/','https://user:password@example.com','https://example.com:8443/','https://service.internal']) assert.throws(()=>previewUrl(url));
 await assert.rejects(resolvePublic('example.com',async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]));
});
function mockRequest({status=200,type='text/html',body='<title>OK</title>',headers={},capture=()=>{}}={}) {
 return (url,options,callback)=> {
  capture(url,options);
  const request=new EventEmitter();request.destroy=()=>{};
  request.end=()=>queueMicrotask(()=>{
   const response=Readable.from([Buffer.from(body)]);response.statusCode=status;response.headers={'content-type':type,...headers};callback(response);
  });return request;
 };
}
const resolver=async()=>[{address:'8.8.8.8',family:4}];
test('preview connection pins validated DNS and refuses redirects and oversized responses',async()=> {
 let calls=0;
 const request=mockRequest({capture:(url,options)=>{calls++; assert.equal(url.hostname,'example.com');assert.equal(options.agent,false);options.lookup('example.com',{},(err,ip,family)=>{assert.equal(err,null);assert.equal(ip,'8.8.8.8');assert.equal(family,4);});}});
 assert.equal(await fetchPreviewHtml('https://example.com',{resolver,request}),'<title>OK</title>');assert.equal(calls,1);
 await assert.rejects(fetchPreviewHtml('https://example.com',{resolver,request:mockRequest({status:302,headers:{location:'https://127.0.0.1'}})}));
 await assert.rejects(fetchPreviewHtml('https://example.com',{resolver,maxBytes:2,request:mockRequest()}));
 await assert.rejects(fetchPreviewHtml('https://example.com',{resolver,request:mockRequest({headers:{'content-encoding':'gzip'}})}));
});
test('preview deadline includes DNS and never starts a late request',async()=> {
 let calls=0;
 await assert.rejects(fetchPreviewHtml('https://example.com',{timeoutMs:5,resolver:async()=>{await new Promise(r=>setTimeout(r,25));return resolver();},request:()=>{calls++;}}));
 await new Promise(r=>setTimeout(r,30));assert.equal(calls,0);
});
test('backend authorization checks verified current Auth user, membership, disabled state and roles',async()=> {
 const member={active:true,email:'alice@example.com',isAdmin:false};const user={emailVerified:true,email:'alice@example.com',disabled:false};
 assert(activeMember(member,user));
 for(const bad of [{...user,emailVerified:false},{...user,disabled:true},{...user,email:'other@example.com'}]) assert.equal(activeMember(member,bad),false);
 const args={db:{collection:()=>({doc:()=>({get:async()=>({data:()=>member})})})},auth:{getUser:async()=>user},uid:'alice'};
 await authorize(args);await assert.rejects(authorize({...args,admin:true}));member.active=false;await assert.rejects(authorize(args));await assert.rejects(authorize({...args,uid:undefined}));
});
test('backend checks actual image bytes, strips EXIF and rejects spoofed media',async()=> {
 const sharp=require('../../../functions/node_modules/sharp');
 const original=await sharp({create:{width:20,height:10,channels:3,background:'#123456'}}).jpeg().withExif({IFD0:{Artist:'Private person'}}).toBuffer();
 const clean=await sanitizeMedia(original,'image/jpeg',1024*1024);
 const meta=await sharp(clean.bytes).metadata();assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);assert.equal(clean.contentType,'image/webp');
 await assert.rejects(sanitizeMedia(Buffer.from('<svg></svg>'),'image/png',1000),InvalidMedia);
 await assert.rejects(sanitizeMedia(Buffer.from('<script>bad</script>'),'audio/webm',1000),InvalidMedia);
 await assert.rejects(sanitizeMedia(original,'image/jpeg',1),InvalidMedia);
 assert.equal((await sanitizeMedia(Buffer.from('OggSdata'),'audio/ogg;codecs=opus',1000)).contentType,'audio/ogg');
});
