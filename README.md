# local-chat-app

A minimal **family-only web chat app** using a free-tier stack:

- **Firebase Authentication (Google sign-in)** for identity
- **Firestore** for real-time messaging
- **Firebase Cloud Messaging (optional)** for push notifications
- **Cloud Functions for Firebase** (optional) to automatically fan out push notifications to family members
- **Firebase Hosting** for free static hosting

## Why this fits the requirement

- ✅ Web-based chat application
- ✅ Restricted to family members via explicit email allowlist
- ✅ Push notifications supported (optional setup)
- ✅ Runs on Firebase free tier (Spark plan)

## Quick setup

1. Create a Firebase project (Spark/free tier).
2. Enable:
   - Authentication → Google provider
   - Firestore Database
   - Cloud Messaging (optional, for push)
3. Copy `firebase-config.example.js` to `firebase-config.js`.
4. Fill `firebaseConfig`, `allowedFamilyEmails`, and optional `vapidPublicKey` in `firebase-config.js`.
5. Update `firestore.rules` with the same family emails, then deploy rules.
6. Optional (recommended for automatic family push alerts): deploy `functions/index.js`.
7. Open `index.html` (or deploy to Firebase Hosting).

## Automatic Family Push Notifications

The app now stores each signed-in user's push token in Firestore when **Enable push notifications** is clicked.

To notify all other family members whenever a new message is posted:

1. Install Firebase CLI and login:
   - `npm install -g firebase-tools`
   - `firebase login`
2. Inside `functions/`, install dependencies:
   - `npm install`
3. From repo root, deploy the trigger function:
   - `firebase deploy --only functions:notifyFamilyOnMessage`

How it works:

- Client writes token docs into `deviceTokens`.
- `notifyFamilyOnMessage` triggers on `messages/{messageId}`.
- Function sends notification to enabled tokens except the sender.
- Invalid/stale tokens are deleted automatically.

## Files

- `index.html` – UI
- `styles.css` – app styling
- `app.js` – auth/chat/push logic
- `firebase-config.example.js` – configuration template
- `firebase-messaging-sw.js` – service worker for notifications
- `firestore.rules` – server-side Firestore access control
- `functions/index.js` – push fan-out trigger on new messages

## Security note

Client-side email checks are for UX only. Real access control is enforced by Firestore rules in `firestore.rules`.
