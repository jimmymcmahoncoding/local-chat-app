// Generates firebase-config.js from environment variables at Vercel build time.
// Do NOT commit the generated firebase-config.js — it is gitignored.
const fs = require('fs');

const required = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
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
    allowedFamilyEmails: [], // Deprecated: access control now uses Firestore allowedUsers collection
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    giphyApiKey: process.env.GIPHY_API_KEY || '',
};

fs.writeFileSync(
    'firebase-config.js',
    `globalThis.FAMILY_CHAT_CONFIG = ${JSON.stringify(config, null, 2)};\n`
);

console.log('firebase-config.js generated successfully.');
