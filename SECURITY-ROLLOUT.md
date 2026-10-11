# Security release and migration

This is a coordinated frontend, rules, Functions and data migration. Nothing in this change deploys itself. Do not publish the frontend or rules independently: the old application uses email membership documents and public attachment URLs; the new application uses verified UID membership and authenticated downloads.

Production readiness was checked on 10 October 2026; see [SECURITY-READINESS.md](SECURITY-READINESS.md) for confirmed targets and outstanding prerequisites. The owner confirmed that nobody currently uses the application, so an agreed maintenance window is unnecessary. Temporary maintenance rules are still required during the cutover to keep migration consistent.

## What changed

- Family membership is `members/{Auth UID}` with `email`, `active`, `isAdmin`. Email verification and exact current email binding are required. Client writes to memberships/roles are denied. Admin App Check callables perform approval/rejection/revocation atomically with an audit record.
- Message activity is `reactionsByUser: {UID: emoji}` and `votesByUser: {UID: option index}`. Rules permit only the authenticated user's own map entry to change. Poll rendering defensively handles old/malformed data.
- Media references are `gs://BUCKET/avatars/UID/FILE`, `gs://BUCKET/chat-media/group/UID/FILE`, or `gs://BUCKET/chat-media/direct/CONVERSATION/UID/FILE`. DM reads require participation, including for administrators. Direct-message typing is under its conversation. Storage listing and replacement are denied.
- Uploads remain unreadable until the server validates bytes. Images are resized and re-encoded to WebP without EXIF. Audio gets a container signature check, not a full codec inspection. Storage bearer download tokens are removed. The browser fetches media with its current ID token and optional App Check token, then uses session-scoped blob URLs. Logout/revocation clears those URLs and chat state.
- Link previews accept only HTTPS on port 443, reject nonpublic/mixed DNS answers, pin DNS into the connection, reject redirects and compressed/non-HTML responses, limit the response to 256 KiB and enforce a five-second total deadline. External preview images are no longer loaded.
- Push recipients are rechecked against membership and current Firebase Auth state. Notifications use a generic body; content is not sent to the lock screen. Message creates are limited to one per user per second, bound to a single message per batch. Test notifications have a server cooldown.
- Only an explicit asset allowlist is emitted to `dist/`. CSP, framing, MIME, referrer and permissions headers are configured for Vercel. Firebase/emoji dependencies are pinned; the old cached shell is retired.

## Before deployment

1. Run Node.js 22+, `npm ci` and `npm --prefix functions ci`. Run `npm run test:security` and `npm run test:rules` (Firebase CLI and Java 21+ required). The tests use `demo-kidschat-security`, never production. Run `npm audit` in both directories.
2. Register the web app with [Firebase App Check / reCAPTCHA Enterprise](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider). Add the actual hosted domain to reCAPTCHA and Firebase Auth's authorized domains. Supply `APP_CHECK_SITE_KEY` in the hosting build, alongside the existing `FIREBASE_*`, optional `GIPHY_API_KEY` and `VAPID_PUBLIC_KEY` settings. The site key is public; never use a service account key in the frontend. Production callables always enforce App Check. The KidsChat production provider is now registered; verify its public build variable and token exchange before enabling enforcement. Do not use the production domain-restricted key on unrelated preview hosts or point an isolated staging rehearsal at production resources.
3. Authenticate the migration runner using tightly scoped administrator Application Default Credentials. Take a managed Firestore export and Storage backup/versioned snapshot, and retain the current rules/config/Functions release. This is separate from the script's private JSON/media backup, which is useful for reconciliation but is not a full automated restore tool. Do not commit credentials or backups.
4. Ensure every legacy `allowedUsers/{email}` entry maps to an enabled Firebase Auth user. At least one administrator must be verified. By default, unverified approved accounts block migration. The owner chose to preserve the four unverified KidsChat accounts: use `--preserve-unverified` for this release. This retains their existing approval in UID membership records while rules, client sign-in and server authorization require actual email verification before access. The migration never changes Auth verification, deletes these accounts, or reactivates previously revoked UID memberships. Their access becomes available after they complete normal verification and refresh their session; they do not need a second approval solely because of migration.
5. Run the read-only preflight with the explicitly selected project and bucket:

   ```sh
   node scripts/migrate-security.cjs --project YOUR_PROJECT --bucket YOUR_BUCKET --preserve-unverified
   ```

   It checks identities, conversation IDs, media scopes, existence and sizes, then reports counts only. During apply it also validates all referenced bytes before the first remote mutation. A missing, malformed or cross-owner attachment stops migration for manual reconciliation; no message is silently dropped. Test migration on a disposable staging copy before production. SDK, CORS, IAM, App Check and trigger behavior cannot be fully confirmed by local rule/unit tests.

   For a private local copy and byte validation without remote writes, add `--prepare-rehearsal`. This saves affected documents, non-secret account attributes, bucket metadata, object metadata and referenced media under ignored `security-backup/rehearsal-*`, with restricted permissions. It never exports passwords, OAuth credentials or Auth tokens. Run `node scripts/rehearse-security.cjs security-backup/rehearsal-DIRECTORY` to execute the actual migration against that local copy using local database and Storage adapters. This exercises migration sequencing, media conversion, preservation, failure handling and reruns; it does not replace staging verification of Google IAM, bucket CORS, App Check or deployed triggers. Its copy of referenced files is not a complete backup of orphaned Storage media.

## Coordinated cutover

1. Put the hosted app into maintenance mode and freeze client data access using the command below. If the app has become actively used since the readiness check, tell family members to close it first.

   ```sh
   firebase deploy --project YOUR_PROJECT --config firebase.maintenance.json --only firestore:rules,storage
   ```

   Maintenance rules block SDK traffic. Existing bearer-token links continue working until the migration revokes them. Also confirm the bucket has no public IAM/ACL grants: Firestore/Storage rules cannot constrain public IAM access. Keep existing app clients blocked throughout the migration.
2. Apply the reviewed migration:

   ```sh
   node scripts/migrate-security.cjs --project YOUR_PROJECT --bucket YOUR_BUCKET \
     --preserve-unverified --apply --maintenance-confirmed --origin https://YOUR_APP_HOST
   ```

   The script backs up affected documents, bucket settings and referenced media under ignored `security-backup/` with restricted local file permissions. It migrates verified memberships, activity, pending requests and media scopes; strips image metadata; revokes tokens on all family media (including orphans); clears push/typing state; and configures authenticated download CORS for the exact app origin. Legacy media objects remain as inaccessible copies for later retention cleanup. Existing public attachment links intentionally stop working. Notifications re-register when members return.

   Migration is sequential, not a cross-service transaction. If it stops after mutation begins, keep maintenance rules active, inspect the backup and partial state, then reconcile and rerun. Preconditions detect changed documents/object generations. Reruns preserve revoked memberships and current roles. Do not blindly restore old public tokens or old permissive rules.
3. Deploy Functions first, while maintenance rules remain active:

   ```sh
   firebase deploy --project YOUR_PROJECT --only functions
   ```

   Approve the Firebase prompt granting Storage rules permission to consult Firestore. Functions require billing and the appropriate runtime/trigger IAM roles. Set `MEDIA_FUNCTION_REGION` to the bucket location and `FIRESTORE_FUNCTION_REGION` to the database location (both default to `us-central1`). The ignored local `functions/.env.kidschat-4e9cd` is prepared with `us-east1` and `europe-west2`, respectively. Re-create these settings if using another checkout. Confirm `validateMedia` is wired to the actual bucket and the existing Firestore Functions remain in `europe-west2`. The validator retries transient failures and never deletes a newer object generation. Set budget alerts and monitor failed triggers; `maxInstances` is a capacity bound, not a spending cap.
4. Build/publish the new `dist/` frontend, then deploy the final `firestore.rules` and `storage.rules` together using the normal `firebase.json`. Before final Storage rules, inspect and grant `roles/firebaserules.firestoreServiceAgent` to the target project's Firebase Storage service agent so rules can read Firestore membership. Inspect/authorize the exact project and recipient; staging approval does not authorize a production grant. Read back IAM and allow permission propagation, then verify private downloads. Enable App Check enforcement for Firestore and Storage once the registered frontend is confirmed to issue valid tokens. Read back enforcement and test both valid-token success and missing/invalid-token rejection after propagation; Firebase documents up to 15 minutes for enforcement to take effect. Add other hosting origins to bucket CORS only if they are intentionally supported. [Firebase authenticated downloads require CORS setup.](https://firebase.google.com/docs/storage/web/download-files)
5. Confirm the new service worker replaces the old root registration and removes `kidschat-shell-*` caches. Reopen the app on each device. Confirm approved verified members can sign in; unverified users see email verification; pending users see approval; admins can approve/reject/remove access; a removed member loses access immediately.
6. Verify group/DM text, photos, voice, reactions, polls and typing. Check an outsider/pending account gets denied for copied DM/media paths. Verify upload validation completes and authenticated downloads succeed; ensure old token URLs fail; inspect CSP violations while testing Google/Microsoft popup login, emoji, GIFs, App Check and notifications on mobile Safari and Chrome. Confirm only the approved asset allowlist is served; `/functions/index.js`, `/fcm-test.html`, test files and backups must return 404.

## Operational limits

Downloaded/saved content cannot be recalled from a device. Firebase administrators still have backend access; this change does not add end-to-end encryption. Disabling an Auth account alone can leave an already-issued ID token valid until expiry: use the admin **Remove access** action to close rules access immediately, which also revokes refresh tokens and saved push state. Generic notifications already queued by the push service may still arrive after revocation.

Storage creates are byte-limited but there is no per-family total upload quota or orphan-upload janitor yet. Message deletion triggers remove referenced private files; failed/abandoned uploads and untouched legacy copies need a retention policy. Rate limits target message creation and notification tests; typing/reaction writes still warrant usage monitoring. App Check is an abuse signal in addition to membership, not a replacement for authorization.

## Verified staging and applied production IAM — 11 October 2026

The cloud rehearsal and hosted browser checks are recorded in SECURITY-STAGING.md. Private media, photo upload/validation, generated voice playback, participant DM send and real callable revocation passed with staging App Check enforced. The final code includes explicit custom upload metadata; final Storage rules keep the no-replacement guard. All 25 unit and 10 emulator rule tests pass.

The owner separately approved `roles/firebaserules.firestoreServiceAgent` on `kidschat-4e9cd` for `service-1083637524943@gcp-sa-firebasestorage.iam.gserviceaccount.com`. It was applied and read back at 07:32 UTC. The role definition was verified to allow `datastore.entities.get` only, and current-policy etag and full canonical comparison ensured that only the approved binding changed. Private before/after policies and the result are retained. Allow cross-service permission propagation and require successful authenticated media reads during release before treating the grant as effective. Production migration and deployment have not begun.

## Production cutover — 11 October 2026

The owner authorized the cutover and separately approved the newly discovered Cloud Storage service-agent Pub/Sub publisher prerequisite. Both approved production grants were applied with fresh-policy etags and exact readback checks. Migration is complete: 12 Auth accounts unchanged, nine approvals retained including four awaiting verification, 181 retained documents preserved, 162 expected updates, 58 validated private attachments and no bearer tokens on any of the 157 current objects. An old public media link is denied.

The new website is promoted, all 11 Functions are ACTIVE in their intended regions, and final production rules match the reviewed files. Maintenance has ended. The live 12-asset allowlist, hashes, security headers and four private/source 404 checks passed. Production App Check enforcement and authenticated browser checks are tracked in [SECURITY-PRODUCTION.md](SECURITY-PRODUCTION.md); do not infer those checks passed from successful deployment alone. Code remains in the working tree without a Git commit or push.

Production Enterprise token issuance was subsequently confirmed by two successful exchanges in Google's aggregate request metrics. Firestore and Storage enforcement were enabled and read back as ENFORCED at 07:59 UTC. Signed-in production private-media and device verification remain pending; see SECURITY-PRODUCTION.md for the precise evidence and limits.

The first CSP omitted Firebase's popup GAPI script dependency. After correcting the two required script paths, real production Google login in Edge and private group-media reads passed with App Check enforced. Corrected deployment `dpl_ypgUY1P9WbFw5ecDu328sbKCbyEz` is promoted; all public asset hashes are unchanged. See SECURITY-PRODUCTION.md for verification counts and remaining platform/administrator-specific checks.

The subsequent read-only acceptance pass verified all three existing participant DM conversations, including 21 private photos, and repeated the successful cloud configuration and live asset/header checks. No production Function ERROR-or-higher logs were found from 08:00–08:34 UTC. Administrator Microsoft login, physical devices and production write-flow checks remain owner-assisted; see SECURITY-ACCEPTANCE.md. No new deployment, permission grant, account change or Git push was performed during this pass.

The owner subsequently reported a Microsoft credential conflict, including in InPrivate. Diagnostic deployment `dpl_8oU1mRUAeC7n3jYT3PobhWyc5Ddx` is now promoted after 27 passing unit tests, uploaded-file hash verification, and successful checks of all 12 live assets/headers and four private-path denials. It requests explicit Microsoft account selection and displays the returned email on a conflict without storing credentials or linking accounts. The requested administrator sign-in has reached Microsoft's passkey step and is awaiting owner completion. Backend rules, provider credentials, memberships and permissions were not changed for this diagnostic release. See SECURITY-PRODUCTION.md for precise evidence and limits.
