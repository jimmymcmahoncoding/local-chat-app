const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {spawnSync}=require('node:child_process');
test('public build excludes backend, tests, diagnostics, local settings and backups',()=> {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kidschat-build-'));
 try {
  const assets=['index.html','styles.css','app.js','security.js','protected-media.js','sw-init.js','firebase-messaging-sw.js','manifest.json','favicon.svg','icon-192.png','icon-512.png'];
  for(const file of ['build.js',...assets]) fs.copyFileSync(file,path.join(dir,file));
  fs.writeFileSync(path.join(dir,'firebase-config.js'),'SECRET_LOCAL_CONFIGURATION');fs.writeFileSync(path.join(dir,'fcm-test.html'),'DIAGNOSTIC');
  const env={...process.env,FIREBASE_API_KEY:'test',FIREBASE_AUTH_DOMAIN:'test.firebaseapp.com',FIREBASE_PROJECT_ID:'test',FIREBASE_STORAGE_BUCKET:'test.appspot.com',FIREBASE_MESSAGING_SENDER_ID:'1',FIREBASE_APP_ID:'test',APP_CHECK_SITE_KEY:'test-site-key'};
  const run=spawnSync(process.execPath,['build.js'],{cwd:dir,env,encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  assert.deepEqual(fs.readdirSync(path.join(dir,'dist')).sort(),[...assets,'firebase-config.js'].sort());assert(!fs.readFileSync(path.join(dir,'dist/firebase-config.js'),'utf8').includes('SECRET_LOCAL_CONFIGURATION'));
  const html=()=>fs.readFileSync(path.join(dir,'dist/index.html'),'utf8');
  const reference=(file)=>html().match(new RegExp(`(?:src|href)="(${file.replaceAll('.', '\\.') }\\?v=[a-f0-9]+)"`))?.[1];
  const originalApp=reference('app.js'),originalConfig=reference('firebase-config.js');
  assert(originalApp&&originalConfig);assert(html().includes('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js'));
  fs.appendFileSync(path.join(dir,'app.js'),'\n// changed release\n');
  assert.equal(spawnSync(process.execPath,['build.js'],{cwd:dir,env,encoding:'utf8'}).status,0);
  assert.notEqual(reference('app.js'),originalApp);assert.equal(reference('firebase-config.js'),originalConfig);
  const originalWorker=fs.readFileSync(path.join(dir,'dist/firebase-messaging-sw.js'),'utf8');
  assert.equal(spawnSync(process.execPath,['build.js'],{cwd:dir,env:{...env,APP_CHECK_SITE_KEY:'new-site-key'},encoding:'utf8'}).status,0);
  assert.notEqual(reference('firebase-config.js'),originalConfig);assert.notEqual(fs.readFileSync(path.join(dir,'dist/firebase-messaging-sw.js'),'utf8'),originalWorker);
  const missing={...env};delete missing.APP_CHECK_SITE_KEY;assert.notEqual(spawnSync(process.execPath,['build.js'],{cwd:dir,env:missing}).status,0);
  const headers=JSON.parse(fs.readFileSync('vercel.json'));const csp=headers.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
  assert.equal(headers.outputDirectory,'dist');assert(!csp.split(';').find(v=>v.trim().startsWith('script-src')).includes('unsafe-inline'));assert(csp.includes("frame-ancestors 'none'"));
  // Firebase popup authentication loads api.js, then the GAPI iframe module.
  // Blocking either dependency rejects sign-in before the account chooser opens.
  const scripts=csp.split(';').find(v=>v.trim().startsWith('script-src')).trim().split(/\s+/).slice(1);
  for(const url of ['https://apis.google.com/js/api.js','https://apis.google.com/_/scs/abc-static/_/js/module']) assert(scripts.some(source=>url.startsWith(source)),'Firebase popup script blocked: '+url);
  assert(!scripts.includes('*'));assert(!scripts.includes('https:'));
  assert(headers.headers[0].headers.find(h=>h.key==='Cache-Control').value.includes('must-revalidate'));
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
