#!/usr/bin/env node
'use strict';
// Runs the real migration against a local snapshot and local adapters only.
// This cannot verify Google IAM, bucket CORS enforcement or deployed triggers.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {main}=require('./migrate-security.cjs');
const {activeMember}=require('../functions/security');
const root=path.resolve(__dirname,'../security-backup');
const source=path.resolve(process.argv[2]||'');
if(!source.startsWith(root+path.sep)||!fs.statSync(source).isDirectory()) throw new Error('Select a private rehearsal snapshot under security-backup/.');
const load=name=>JSON.parse(fs.readFileSync(path.join(source,name),'utf8'));
const originalDocs=load('firestore.json'),accounts=load('accounts.json'),inventory=load('inventory.json'),media=load('media.json');
const bucketData=load('bucket.json'),bucketName=bucketData.name;
const project='kidschat-4e9cd';
if(bucketName!=='kidschat-4e9cd.firebasestorage.app') throw new Error('The snapshot is not from the confirmed KidsChat bucket.');
const args=['--project',project,'--bucket',bucketName,'--preserve-unverified','--apply','--maintenance-confirmed','--origin','https://kidschat-family.vercel.app'];
const copy=value=>structuredClone(value);
function sandbox(corrupt=false){
 const records=new Map(originalDocs.map(d=>[d.path,{data:copy(d.data),version:copy(d.updateTime)}]));
 const objects=new Map(inventory.map(m=>[m.name,{meta:copy(m),bytes:null}]));
 for(const entry of media){const object=objects.get(entry.source);if(!object)throw new Error('Referenced object missing from inventory.');object.bytes=fs.readFileSync(path.join(source,entry.backupFile));}
 if(corrupt&&media.length)objects.get(media[0].source).bytes=Buffer.from('invalid-media-bytes');
 let writes=0,version=0,cors;
 function ref(docPath){return {path:docPath,collection:name=>collection(docPath+'/'+name),get:async()=>snapshot(docPath),create:async data=>{assert(!records.has(docPath),'Create precondition failed');records.set(docPath,{data:copy(data),version:++version});writes++;},update:async(patch,condition)=>{const current=records.get(docPath);assert(current,'Missing document');assert.deepEqual(condition.lastUpdateTime,current.version,'Document version changed');current.data={...current.data,...copy(patch)};current.version=++version;writes++;},delete:async condition=>{assert.deepEqual(condition.lastUpdateTime,records.get(docPath)?.version,'Delete version changed');records.delete(docPath);writes++;}};}
 function snapshot(docPath){const record=records.get(docPath);return {id:docPath.split('/').pop(),ref:ref(docPath),exists:!!record,updateTime:copy(record?.version),data:()=>copy(record?.data)};}
 function collection(prefix){return {doc:id=>ref(prefix+'/'+id),get:async()=>{const depth=prefix.split('/').length+1;const docs=[...records.keys()].filter(p=>p.startsWith(prefix+'/')&&p.split('/').length===depth).map(snapshot);return {docs,size:docs.length};}};}
 function file(name,options={}){return {name,getMetadata:async()=>{assert(objects.has(name),'Missing object metadata');return [copy(objects.get(name).meta)];},exists:async()=>[objects.has(name)],download:async()=>{const o=objects.get(name);assert(o?.bytes,'Missing source bytes');if(options.generation)assert.equal(String(options.generation),String(o.meta.generation),'Download generation changed');return [Buffer.from(o.bytes)];},save:async(bytes,options)=>{const old=objects.get(name);const generation=options.preconditionOpts.ifGenerationMatch;if(Number(generation)===0)assert(!old,'Destination already exists');else assert.equal(String(generation),String(old?.meta.generation),'Write generation changed');const meta={...old?.meta,...copy(options.metadata),name,size:String(bytes.length),generation:String(++version),metageneration:'1'};meta.metadata=Object.fromEntries(Object.entries(meta.metadata||{}).filter(([,v])=>v!==null));objects.set(name,{meta,bytes:Buffer.from(bytes)});writes++;},setMetadata:async(patch,options)=>{const o=objects.get(name);assert(o);assert.equal(String(options.preconditionOpts.ifMetagenerationMatch),String(o.meta.metageneration),'Metadata generation changed');o.meta={...o.meta,...copy(patch),metadata:{...o.meta.metadata,...patch.metadata},metageneration:String(Number(o.meta.metageneration)+1)};o.meta.metadata=Object.fromEntries(Object.entries(o.meta.metadata).filter(([,v])=>v!==null));writes++;}};}
 return {records,objects,services:{db:{collection},auth:{listUsers:async()=>({users:copy(accounts)})},bucket:{name:bucketName,file,getFiles:async()=>[[...objects.keys()].map(name=>file(name))],getMetadata:async()=>[copy(bucketData)],setCorsConfiguration:async value=>{cors=copy(value);writes++;}}},get writes(){return writes;},get cors(){return cors;}};
}
async function run(){
 const runs=path.join(root,'local-rehearsal-runs');fs.mkdirSync(runs,{recursive:true,mode:0o700});
 if(media.length){const broken=sandbox(true);await assert.rejects(()=>main({args,services:broken.services,backupRoot:runs}));assert.equal(broken.writes,0,'Invalid media caused mutations');}
 const local=sandbox();await main({args,services:local.services,backupRoot:runs});
 const members=[...local.records].filter(([p])=>p.startsWith('members/'));
 assert.equal(members.length,9);assert.equal(accounts.filter(a=>!a.emailVerified).length,5);
 for(const account of accounts.filter(a=>!a.emailVerified))assert.equal(activeMember(local.records.get('members/'+account.uid)?.data,account),false);
 for(const entry of media){const object=local.objects.get(entry.target);assert.equal(object.meta.metadata.validated,'true');assert(!object.meta.metadata.firebaseStorageDownloadTokens);assert(object.bytes?.length);}
 assert([...local.objects.values()].every(o=>!o.meta.metadata?.firebaseStorageDownloadTokens));
 for(const [p] of local.records)assert(!p.startsWith('fcmTokens/')&&!p.startsWith('typingIndicators/'));
 assert.deepEqual(local.cors[0].origin,['https://kidschat-family.vercel.app']);
 for(const original of originalDocs.filter(d=>d.path.startsWith('messages/')||d.path.includes('/messages/'))){assert(local.records.has(original.path),'Message was dropped');const current=local.records.get(original.path).data;for(const key of ['text','uid','question','options','createdAt'])assert.deepEqual(current[key],original.data[key],'Message content changed');}
 const revoked=members.find(([,m])=>m.data.isAdmin!==true);assert(revoked);revoked[1].data.active=false;revoked[1].data.isAdmin=false;
 await main({args,services:local.services,backupRoot:runs});assert.equal(local.records.get(revoked[0]).data.active,false);assert.equal(local.records.get(revoked[0]).data.isAdmin,false);
 const summary={mode:'isolated-local-rehearsal',accountsUnchanged:accounts.length,members:members.length,unverifiedApprovedAccounts:members.filter(([p])=>accounts.find(a=>a.uid===p.split('/')[1])?.emailVerified===false).length,mediaValidated:media.length,tokenObjects:inventory.length,invalidMediaPreventedWrites:true,messagesPreserved:true,revocationPreservedOnRerun:true,productionWrites:0,cloudIamCorsAndTriggersVerified:false};
 fs.writeFileSync(path.join(source,'rehearsal-result.json'),JSON.stringify(summary,null,2),{mode:0o600});console.log(JSON.stringify(summary,null,2));
}
run().catch(error=>{console.error('Local rehearsal failed:',error.code||error.name);process.exitCode=1;});
