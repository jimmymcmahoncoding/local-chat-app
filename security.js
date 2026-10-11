/* Shared, dependency-free validation for rendering and migrations. */
(function (root, factory) {
  const security = factory();
  if (typeof module === 'object' && module.exports) module.exports = security;
  else root.ChatSecurity = security;
})(globalThis, function () {
  'use strict';
  const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function accountConflictMessage(email, providerId) {
    // Show only the returned account email, never OAuth credentials or raw error data.
    const validEmail = typeof email === 'string' && email.length <= 254 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email);
    const identity = validEmail ? `the email ${email}` : 'an email already registered here';
    const source = providerId === 'microsoft.com' ? 'Microsoft' : 'The sign-in provider';
    const next = providerId === 'microsoft.com'
      ? 'Try again and choose the Microsoft account you previously used. If this continues, report the email shown here and this error code.'
      : 'Use the sign-in method you previously used for this account.';
    return `${source} returned ${identity}, but Firebase could not match this sign-in to the existing account. ${next} (auth/account-exists-with-different-credential)`;
  }
  function pollCounts(data) {
    const options = Array.isArray(data.options) ? data.options.filter(x => typeof x === 'string').slice(0, 4) : [];
    const counts = options.map(() => 0);
    const voters = new Set();
    if (isRecord(data.votesByUser)) {
      for (const [uid, option] of Object.entries(data.votesByUser)) {
        if (uid && Number.isInteger(option) && option >= 0 && option < counts.length) {
          counts[option]++; voters.add(uid);
        }
      }
    } else if (isRecord(data.votes)) {
      // Read legacy polls defensively until migration; never trust arbitrary .length.
      counts.forEach((_, option) => {
        if (!Array.isArray(data.votes[option])) return;
        for (const uid of data.votes[option]) {
          if (typeof uid === 'string' && uid && !voters.has(uid)) { counts[option]++; voters.add(uid); }
        }
      });
    }
    return { options, counts, total: counts.reduce((sum, n) => sum + n, 0) };
  }
  function reactions(data) {
    const result = Object.fromEntries(EMOJIS.map(emoji => [emoji, []]));
    if (isRecord(data.reactionsByUser)) {
      for (const [uid, emoji] of Object.entries(data.reactionsByUser)) {
        if (uid && EMOJIS.includes(emoji)) result[emoji].push(uid);
      }
    } else if (isRecord(data.reactions)) {
      for (const emoji of EMOJIS) {
        if (Array.isArray(data.reactions[emoji])) result[emoji] = [...new Set(data.reactions[emoji].filter(uid => typeof uid === 'string' && uid))];
      }
    }
    return result;
  }
  function httpsUrl(value, hosts) {
    if (typeof value !== 'string' || value.length > 2048) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && (!hosts || hosts.includes(url.hostname));
    } catch { return false; }
  }
  function mediaLocation(value, bucket) {
    if (typeof value !== 'string' || !bucket || value.length > 1024) return null;
    try {
      let object;
      if (value.startsWith(`gs://${bucket}/`)) object = value.slice(bucket.length + 6);
      else {
        if (!httpsUrl(value, ['firebasestorage.googleapis.com'])) return null;
        const url = new URL(value);
        const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
        if (!match || decodeURIComponent(match[1]) !== bucket) return null;
        object = decodeURIComponent(match[2]);
      }
      // Public tokens from old URLs are intentionally ignored; downloads require auth.
      if (!/^(avatars\/[^/]+\/[^/]+|chat-media\/group\/[^/]+\/[^/]+|chat-media\/direct\/[^/]+\/[^/]+\/[^/]+)$/.test(object)) return null;
      if (object.split('/').some(part => part === '.' || part === '..' || /[\x00-\x1f\\?#]/.test(part))) return null;
      return { bucket, object, canonical: `gs://${bucket}/${object}` };
    } catch { return null; }
  }
  function migrateActivity(data) {
    const votesByUser = {};
    if (!isRecord(data.votesByUser) && isRecord(data.votes)) {
      for (let option = 0; option < Math.min(data.options?.length || 0, 4); option++) {
        if (!Array.isArray(data.votes[option])) continue;
        for (const uid of data.votes[option]) if (typeof uid === 'string' && uid && !Object.hasOwn(votesByUser, uid)) Object.defineProperty(votesByUser, uid, {value:option,enumerable:true,writable:true,configurable:true});
      }
    }
    const reactionsByUser = {};
    if (!isRecord(data.reactionsByUser)) {
      for (const [emoji, uids] of Object.entries(reactions(data))) for (const uid of uids) Object.defineProperty(reactionsByUser, uid, {value:emoji,enumerable:true,writable:true,configurable:true});
    }
    return { ...(!isRecord(data.reactionsByUser) && {reactionsByUser}), ...(!isRecord(data.votesByUser) && data.type === 'poll' && {votesByUser}) };
  }
  return { EMOJIS, isRecord, accountConflictMessage, pollCounts, reactions, httpsUrl, mediaLocation, migrateActivity };
});
