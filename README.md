# local-chat-app

A minimal **family-only web chat app** using a free-tier stack:

- **Firebase Authentication (Google sign-in)** for identity
- **Firestore** for real-time messaging
- **Firebase Cloud Messaging (optional)** for push notifications
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
6. Open `index.html` (or deploy to Firebase Hosting).

## Files

- `index.html` – UI
- `styles.css` – app styling
- `app.js` – auth/chat/push logic
- `firebase-config.example.js` – configuration template
- `firebase-messaging-sw.js` – service worker for notifications
- `firestore.rules` – server-side Firestore access control

## Security note

Client-side email checks are for UX only. Real access control is enforced by Firestore rules in `firestore.rules`.
