const {test}=require('node:test');const assert=require('node:assert/strict');
const {main}=require('../../../scripts/migrate-security.cjs');
const target=['--project','kidschat-4e9cd','--bucket','kidschat-4e9cd.firebasestorage.app'];
test('apply requires an access freeze and exact HTTPS origin before touching services',async()=> {
 const services=new Proxy({}, {get(){throw new Error('Services were touched before validation');}});
 for(const args of [[...target,'--apply'],[...target,'--apply','--maintenance-confirmed','--origin','http://app.example'],[...target,'--apply','--maintenance-confirmed','--origin','https://app.example/path']])await assert.rejects(main({args,services}),/Apply requires maintenance mode/);
});
test('read-only rehearsal preparation cannot be combined with apply',async()=> {
 await assert.rejects(main({args:[...target,'--prepare-rehearsal','--apply','--maintenance-confirmed','--origin','https://app.example'],services:{}}),/cannot be combined/);
});
