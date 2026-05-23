# local-chat-app

A minimal **family-only web chat app** using a free-tier stack:

- **Firebase Authentication (Google sign-in)** for identity
- **Firestore** for real-time messaging
- **Browser Notifications API** for in-app alerts while the chat is open
- **Firebase Hosting** for free static hosting

## Why this fits the requirement

- ✅ Web-based chat application
- ✅ Restricted to family members via explicit email allowlist
- ✅ Free-tier friendly notifications while app is open
- ✅ Runs on Firebase free tier (Spark plan)

## Quick setup

1. Create a Firebase project (Spark/free tier).
2. Enable:
   - Authentication → Google provider
   - Firestore Database
3. Copy `firebase-config.example.js` to `firebase-config.js`.
4. Fill `firebaseConfig` and `allowedFamilyEmails` in `firebase-config.js`.
5. Update `firestore.rules` with the same family emails, then deploy rules.
6. Open `index.html` (or deploy to Firebase Hosting).

## Notification Behavior On Spark

- Click **Enable push notifications** to grant browser notification permission.
- While you are signed in and the chat is open, new messages from other family members trigger a browser notification.
- True background push delivery when the app is closed requires a trusted server sender (for example Cloud Functions on Blaze).

## Files

- `index.html` – UI
- `styles.css` – app styling
- `app.js` – auth/chat/push logic
- `firebase-config.example.js` – configuration template
- `firestore.rules` – server-side Firestore access control

## Security note

Client-side email checks are for UX only. Real access control is enforced by Firestore rules in `firestore.rules`.
