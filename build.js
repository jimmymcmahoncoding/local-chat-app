// Generates firebase-config.js from environment variables at Vercel build time.
// Do NOT commit the generated firebase-config.js — it is gitignored.
const fs = require('fs');
const path = require('path');
const {createHash} = require('node:crypto');

const required = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'APP_CHECK_SITE_KEY',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
    console.error('Missing required environment variables:', missing.join(', '));
    process.exit(1);
}

const config = {
    firebaseConfig: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
    },
    appCheckSiteKey: process.env.APP_CHECK_SITE_KEY || '',
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    giphyApiKey: process.env.GIPHY_API_KEY || '',
};

const output = path.join(__dirname, 'dist');
fs.rmSync(output, {recursive:true,force:true});
fs.mkdirSync(output);
// Only these public assets can be deployed. Source, tests, credentials and diagnostics stay private.
const assets = ['index.html','styles.css','app.js','security.js','protected-media.js','sw-init.js','firebase-messaging-sw.js','manifest.json','favicon.svg','icon-192.png','icon-512.png'];
for (const asset of assets) fs.copyFileSync(path.join(__dirname,asset),path.join(output,asset));
fs.writeFileSync(
    path.join(output, 'firebase-config.js'),
    `globalThis.FAMILY_CHAT_CONFIG = ${JSON.stringify(config, null, 2)};\n`
);

// Changing a security script or public configuration must change its browser URL,
// even when an older deployment gave that URL a long cache lifetime.
const version = (asset) => createHash('sha256').update(fs.readFileSync(path.join(output, asset))).digest('hex').slice(0, 16);
const workerPath = path.join(output, 'firebase-messaging-sw.js');
fs.writeFileSync(workerPath, fs.readFileSync(workerPath, 'utf8').replace("'./firebase-config.js'", `'./firebase-config.js?v=${version('firebase-config.js')}'`));
const indexPath = path.join(output, 'index.html');
fs.writeFileSync(indexPath, fs.readFileSync(indexPath, 'utf8').replace(/\b(src|href)="([^"?]+\.(?:js|css))"/g, (match, attribute, asset) => {
    return assets.includes(asset) || asset === 'firebase-config.js' ? `${attribute}="${asset}?v=${version(asset)}"` : match;
}));

console.log('Public assets generated in dist/.');
