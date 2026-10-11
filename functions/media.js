'use strict';
function ownedMedia(value, bucket, uid, scope) {
  if (typeof value !== 'string' || !value.startsWith(`gs://${bucket}/`)) return null;
  const object = value.slice(bucket.length + 6);
  const prefix = scope === 'avatars' ? `avatars/${uid}/` : `chat-media/${scope}/${uid}/`;
  if (!object.startsWith(prefix) || !/^[A-Za-z0-9_.-]+$/.test(object.slice(prefix.length)) || ['.','..'].includes(object.slice(prefix.length))) return null;
  return object;
}
function audioSignature(bytes, contentType) {
  if (contentType.startsWith('audio/webm')) return bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if (contentType.startsWith('audio/ogg')) return bytes.subarray(0,4).toString() === 'OggS';
  if (contentType === 'audio/mp4') return bytes.subarray(4,8).toString() === 'ftyp';
  return false;
}
class InvalidMedia extends Error {}
async function sanitizeMedia(bytes, contentType, maximum) {
  if (!bytes.length || bytes.length > maximum) throw new InvalidMedia('Invalid size');
  if (['image/jpeg','image/png','image/webp'].includes(contentType)) {
    try {
      const sharp = require('sharp');
      const image = sharp(bytes,{limitInputPixels:40000000,animated:false});
      const info = await image.metadata();
      // SVG/HEIF/etc. bytes disguised with a safe MIME type must never be parsed as accepted media.
      if (!['jpeg','png','webp'].includes(info.format) || (info.pages || 1) !== 1) throw new Error('Invalid image');
      const output = await image.rotate().resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer();
      if (output.length > maximum) throw new Error('Invalid size');
      return {bytes:output,contentType:'image/webp'};
    } catch { throw new InvalidMedia('Invalid image'); }
  }
  if (!audioSignature(bytes,contentType || '')) throw new InvalidMedia('Invalid audio');
  return {bytes,contentType:contentType.split(';')[0]};
}
module.exports = {ownedMedia,audioSignature,sanitizeMedia,InvalidMedia};
