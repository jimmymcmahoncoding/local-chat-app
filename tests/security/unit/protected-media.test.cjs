const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const S=require('../../../security');
function setup(fetchImpl,getUser) {
 const revoked=[];let blobs=0;
 const ctx={ChatSecurity:S,fetch:fetchImpl,MutationObserver:class{observe(){}},document:{body:{}},AbortController,Blob,URL:{createObjectURL:()=>`blob:media-${++blobs}`,revokeObjectURL:url=>revoked.push(url)},setTimeout,clearTimeout};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('protected-media.js','utf8'),ctx);
 return {media:ctx.createProtectedMedia({bucket:'bucket',getUser,getAppCheckToken:async()=>'APP_CHECK',fetchImpl}),revoked};
}
const good=()=>new Response(new Uint8Array([1,2]),{headers:{'Content-Type':'image/webp'}});
test('authenticated media request strips download tokens, caches blobs and clears them on logout',async()=> {
 const user={uid:'alice',emailVerified:true,getIdToken:async()=>'ID_TOKEN'};let calls=0;
 const {media,revoked}=setup(async(url,options)=>{calls++;assert(!url.includes('SECRET'));assert.equal(options.headers.Authorization,'Firebase ID_TOKEN');assert.equal(options.headers['X-Firebase-AppCheck'],'APP_CHECK');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');return good();},()=>user);
 const url=await media.download('https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Falice%2Fa.webp?token=SECRET');
 assert.equal(url,'blob:media-1');assert.equal(await media.download('gs://bucket/avatars/alice/a.webp'),url);assert.equal(calls,1);
 media.clear();assert.deepEqual(revoked,[url]);
});
test('session changes abort downloads and prevent stale blobs becoming available',async()=> {
 let user={uid:'alice',emailVerified:true,getIdToken:async()=>'TOKEN'};let finish,signal;
 const {media}=setup((_url,options)=>{signal=options.signal;return new Promise(resolve=>{finish=resolve;});},()=>user);
 const task=media.download('gs://bucket/avatars/alice/a.webp');await new Promise(r=>setImmediate(r));
 user=null;media.clear();assert(signal.aborted);finish(good());await assert.rejects(task,/Session changed/);
 await assert.rejects(media.download('gs://bucket/avatars/alice/a.webp'),/Media unavailable/);
});
test('unsafe MIME types and wrong buckets cannot be downloaded',async()=> {
 const user={uid:'alice',emailVerified:true,getIdToken:async()=>'TOKEN'};
 const {media}=setup(async()=>new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}}),()=>user);
 await assert.rejects(media.download('gs://other/avatars/alice/a.webp'));
 await assert.rejects(media.download('gs://bucket/avatars/alice/a.webp'),/Unsupported media/);
});
