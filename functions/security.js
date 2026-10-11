'use strict';
const { isIP, BlockList } = require('node:net');
const dns = require('node:dns/promises');
const https = require('node:https');
const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) blocked.addSubnet(address,prefix,'ipv4');
const ipv6Global = new BlockList();
ipv6Global.addSubnet('2000::',3,'ipv6');
for (const [address,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]]) blocked.addSubnet(address,prefix,'ipv6');
function publicAddress(address) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address,'ipv4');
  if (family === 6) return ipv6Global.check(address,'ipv6') && !blocked.check(address,'ipv6');
  return false;
}
function previewUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Unsafe preview URL');
  const hostname = url.hostname.replace(/^\[|\]$/g,'');
  if (!hostname.includes('.') && !isIP(hostname)) throw new Error('Unsafe preview host');
  if (/\.(localhost|local|internal|test|invalid)$/i.test(hostname) || hostname === 'localhost' || (isIP(hostname) && !publicAddress(hostname))) throw new Error('Unsafe preview host');
  url.hash = '';
  return url;
}
async function resolvePublic(hostname, resolver = dns.lookup) {
  const host = hostname.replace(/^\[|\]$/g,'');
  const answers = isIP(host) ? [{address:host,family:isIP(host)}] : await resolver(host,{all:true,verbatim:true});
  if (!answers.length || answers.some(answer => !publicAddress(answer.address))) throw new Error('Unsafe preview address');
  return answers[0];
}
async function fetchPreviewHtml(value, {resolver = dns.lookup, request = https.request, timeoutMs = 5000, maxBytes = 256 * 1024} = {}) {
  const url = previewUrl(value);
  // The deadline covers DNS, connection, headers and body. The validated answer is
  // pinned into the actual connection lookup, with the original hostname for TLS.
  let deadline;
  let activeRequest;
  let expired = false;
  const timeout = new Promise((_, reject) => {
    deadline = setTimeout(() => { expired = true; activeRequest?.destroy(); reject(new Error('Preview timeout')); }, timeoutMs);
  });
  try {
    return await Promise.race([timeout,(async () => {
      const answer = await resolvePublic(url.hostname,resolver);
      if (expired) throw new Error('Preview timeout');
      return new Promise((resolve,reject) => {
        activeRequest = request(url, {
          method:'GET', agent:false,
          headers:{'User-Agent':'KidsChatPreview/1.0','Accept':'text/html','Accept-Encoding':'identity'},
          lookup:(_host, options, callback) => options.all ? callback(null,[answer]) : callback(null,answer.address,answer.family),
        }, response => {
          // Redirects are rejected, not followed. A fresh untrusted hostname never
          // gets to bypass the pinned lookup.
          if (response.statusCode !== 200 || !/^text\/html(?:;|$)/i.test(response.headers['content-type'] || '') || (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') || Number(response.headers['content-length'] || 0) > maxBytes) {
            response.destroy(); reject(new Error('Unsupported preview response')); return;
          }
          let size = 0;
          const chunks = [];
          response.on('data', chunk => {
            size += chunk.length;
            if (size > maxBytes) { response.destroy(); reject(new Error('Preview too large')); }
            else chunks.push(chunk);
          });
          response.on('end',() => resolve(Buffer.concat(chunks).toString('utf8')));
          response.on('error',reject);
          response.on('aborted',() => reject(new Error('Preview aborted')));
        });
        activeRequest.on('error',reject);
        activeRequest.end();
      });
    })()]);
  } finally { clearTimeout(deadline); activeRequest?.destroy(); }
}
function activeMember(member, user) {
  return !!member && member.active === true && !!user && user.emailVerified === true && !user.disabled && member.email === String(user.email || '').toLowerCase();
}
module.exports = { publicAddress, previewUrl, resolvePublic, fetchPreviewHtml, activeMember };
