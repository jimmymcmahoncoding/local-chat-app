# KidsChat

A private family chat using Firebase Authentication, Firestore, Cloud Storage and Cloud Functions, with a static frontend hosted on Vercel. Features include group and direct messages, photos, voice, GIFs, polls, reactions, presence, typing and browser push notifications.

Family access requires a verified Firebase Auth account and an active UID-bound membership. Administrators approve requests or remove access in the Family Access panel. Firestore and Storage rules enforce access independently of the UI.

## Setup and security release

Read [SECURITY-ROLLOUT.md](SECURITY-ROLLOUT.md) before deploying this release. Existing installations require a coordinated membership/media migration. The backend uses Node.js 22 and requires Firebase billing for Functions/Storage; the frontend build emits only public assets into `dist/`.

For local development, copy `firebase-config.example.js` to ignored `firebase-config.js`, configure the public web app values, and serve the project over HTTP. Production runs `node build.js` with the required `FIREBASE_*` environment variables plus `APP_CHECK_SITE_KEY`; optional variables are `GIPHY_API_KEY` and `VAPID_PUBLIC_KEY`. The App Check site key must be registered for the actual hosted domain.

## Verification

```sh
npm ci
npm --prefix functions ci
npm run test:security
npm run test:rules
```

Rules tests require Firebase CLI and Java 21+ and run solely against `demo-kidschat-security`. Existing Playwright tests target a configured app and may write messages; do not point them at production as part of a security test.

Local demo UI testing can set `emulators: true` in the ignored web configuration with `projectId: 'demo-kidschat-security'`. The switch only works on localhost/127.0.0.1; run Auth, Firestore, Storage and Functions on their default emulator ports. Production builds do not emit this switch.

Notification content is private by default. Media uses authenticated downloads rather than reusable public URLs, and logout clears local chat content and blob URLs. See the rollout document for limits and required production checks.
