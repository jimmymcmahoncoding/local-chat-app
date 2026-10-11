'use strict';
const { activeMember } = require('./security');
async function authorize({db, auth, uid, admin = false}) {
  if (typeof uid !== 'string' || !uid) throw new Error('unauthenticated');
  const [snapshot,user] = await Promise.all([db.collection('members').doc(uid).get(),auth.getUser(uid)]);
  const member = snapshot.data();
  if (!activeMember(member,user) || (admin && member.isAdmin !== true)) throw new Error('permission-denied');
  return {member,user};
}
function targetUid(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('invalid-argument');
  return value;
}
module.exports = {authorize,targetUid};
