'use strict';
const {createHash}=require('node:crypto');
const {httpsUrl,mediaLocation}=require('../security');
function membershipPlan(users, legacy, existing, preserveUnverified=false) {
 const byEmail=new Map();
 for(const user of users.values()) if(user.email) {
  const email=user.email.toLowerCase();
  if(byEmail.has(email)) throw new Error('Duplicate Auth emails require manual review.');
  byEmail.set(email,user);
 }
 const memberMap=new Map(existing),newMembers=[];let deferredVerification=0;
 for(const entry of legacy) {
  const user=byEmail.get(entry.email.toLowerCase());
  if(!user||user.disabled||!/^[A-Za-z0-9_-]{1,128}$/.test(user.uid)) throw new Error('A legacy membership lacks an enabled Auth account.');
  if(!user.emailVerified&&!preserveUnverified) throw new Error('An approved account requires email verification or explicit preservation.');
  // Active records preserve approval. Rules and callables independently require
  // actual Auth verification before any access, including administrator access.
  // Never rewrite existing roles or reactivate a revoked membership on reruns.
  if(!memberMap.has(user.uid)) {
   const data={email:user.email.toLowerCase(),active:true,isAdmin:entry.isAdmin===true};
   newMembers.push({uid:user.uid,data});memberMap.set(user.uid,data);
   if(!user.emailVerified) deferredVerification++;
  }
 }
 if(![...memberMap.entries()].some(([uid,m])=>m.active&&m.isAdmin&&users.get(uid)?.emailVerified&&!users.get(uid)?.disabled&&users.get(uid)?.email?.toLowerCase()===m.email)) throw new Error('No verified active administrator; no writes performed.');
 return {byEmail,memberMap,newMembers,deferredVerification};
}
function legacyObject(value,bucket) {
 const modern=mediaLocation(value,bucket);if(modern) return modern.object;
 if(typeof value!=='string'||value.length>2048) throw new Error('Invalid media reference');
 let name;
 if(value.startsWith(`gs://${bucket}/`)) name=value.slice(bucket.length+6);
 else {
  if(!httpsUrl(value,['firebasestorage.googleapis.com'])) throw new Error('Invalid media origin');
  const url=new URL(value),match=url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
  if(!match||decodeURIComponent(match[1])!==bucket) throw new Error('Wrong media bucket');
  name=decodeURIComponent(match[2]);
 }
 if(!/^(photos|voice-messages|avatars)\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_.-]+$/.test(name)||name.split('/').some(p=>p==='.'||p==='..')) throw new Error('Invalid legacy media path');
 return name;
}
function destination(value,bucket,uid,scope,avatar=false) {
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error('Invalid owner');
 const name=legacyObject(value,bucket);
 const modern=mediaLocation(value,bucket);
 const prefix=avatar?`avatars/${uid}/`:`chat-media/${scope}/${uid}/`;
 if(modern) {if(!name.startsWith(prefix)) throw new Error('Media crosses owner or conversation');return {source:name,target:name};}
 const owner=name.split('/')[1];
 if(owner!==uid||(avatar?!name.startsWith('avatars/'):name.startsWith('avatars/'))) throw new Error('Media owner mismatch');
 const filename=createHash('sha256').update(name).digest('hex');
 return {source:name,target:prefix+filename};
}
module.exports={legacyObject,destination,membershipPlan};
