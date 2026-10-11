const {test}=require('node:test');const assert=require('node:assert/strict');const {destination}=require('../../../scripts/migration-plan.cjs');
const {membershipPlan}=require('../../../scripts/migration-plan.cjs');
const {activeMember}=require('../../../functions/security');
const users=new Map([
 ['admin',{uid:'admin',email:'admin@example.com',emailVerified:true,disabled:false}],
 ['waiting',{uid:'waiting',email:'waiting@example.com',emailVerified:false,disabled:false}],
]);
const legacy=[{email:'admin@example.com',isAdmin:true},{email:'waiting@example.com',isAdmin:false}];
test('unverified legacy approval is preserved only explicitly and never verifies Auth',()=> {
 assert.throws(()=>membershipPlan(users,legacy,[]),/verification/);
 const plan=membershipPlan(users,legacy,[],true);
 assert.equal(plan.deferredVerification,1);assert.equal(plan.newMembers.length,2);
 assert.deepEqual(plan.memberMap.get('waiting'),{email:'waiting@example.com',active:true,isAdmin:false});
 assert.equal(users.get('waiting').emailVerified,false);
 assert.equal(activeMember(plan.memberMap.get('waiting'),users.get('waiting')),false);
 assert.equal(activeMember(plan.memberMap.get('waiting'),{...users.get('waiting'),emailVerified:true}),true);
 assert.equal(activeMember(plan.memberMap.get('waiting'),{...users.get('waiting'),emailVerified:true,email:'other@example.com'}),false);
});
test('migration preservation never reactivates revoked members or restores old roles',()=> {
 const existing=[['waiting',{email:'waiting@example.com',active:false,isAdmin:false}]];
 const plan=membershipPlan(users,[legacy[0],{...legacy[1],isAdmin:true}],existing,true);
 assert.deepEqual(plan.memberMap.get('waiting'),existing[0][1]);assert.equal(plan.newMembers.length,1);
 assert.throws(()=>membershipPlan(users,legacy,[['admin',{email:'admin@example.com',active:false,isAdmin:true}]],true),/No verified active administrator/);
});
test('unverified administrators cannot satisfy the migration administrator gate',()=> {
 const unverified=new Map([...users].map(([uid,u])=>[uid,{...u,emailVerified:false}]));
 assert.throws(()=>membershipPlan(unverified,legacy,[],true),/No verified active administrator/);
 const disabled=new Map(users);disabled.set('waiting',{...users.get('waiting'),disabled:true});
 assert.throws(()=>membershipPlan(disabled,legacy,[],true),/enabled Auth account/);
 assert.throws(()=>membershipPlan(users,[legacy[0],{email:'missing@example.com'}],[],true),/enabled Auth account/);
});
test('legacy media migrate into distinct group and DM scopes; tokens are discarded',()=> {
 const url='https://firebasestorage.googleapis.com/v0/b/bucket/o/photos%2Falice%2Fphoto.png?alt=media&token=SECRET';
 const group=destination(url,'bucket','alice','group');const dm=destination(url,'bucket','alice','direct/alice_bob');
 assert.equal(group.source,'photos/alice/photo.png');assert(group.target.startsWith('chat-media/group/alice/'));assert(dm.target.startsWith('chat-media/direct/alice_bob/alice/'));assert.notEqual(group.target,dm.target);assert(!JSON.stringify(group).includes('SECRET'));
});
test('migration rejects crossed owners, conversations, buckets and traversal',()=> {
 for(const url of ['gs://other/photos/alice/p.png','gs://bucket/photos/bob/p.png','gs://bucket/photos/alice/..','gs://bucket/chat-media/direct/alice_bob/alice/a.webp']) assert.throws(()=>destination(url,'bucket','alice','group'));
 assert.equal(destination('gs://bucket/avatars/alice/a.webp','bucket','alice','group',true).target,'avatars/alice/a.webp');
});
