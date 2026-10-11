# Cloud security rehearsal — 10–11 October 2026

## Scope and production status

The separate Firebase project is `kidschat-security-stage-261010` (project number `694249484344`). Its hosted app is https://kidschat-security-stage-261010.web.app, its database is in `europe-west2`, and its default Storage bucket is in `us-east1`, matching production's respective regions.

Staging contains only generated test accounts, messages, images, audio and invalid push tokens. No production records, account identities, push credentials or media were copied to staging. The existing private local rehearsal separately exercised the real migration against the production snapshot without remote writes.

Production migration, final security rules, Functions and frontend have not been deployed. Production media download tokens remain intact. Authorized production preparation now includes the registered Enterprise App Check provider/API, its public Vercel build variable and the owner-approved Storage service-agent read permission recorded below. Production migration and release remain unperformed.

## Recovery backup completed

- A complete managed Firestore export finished in the private bucket `kidschat-4e9cd-security-recovery-20261010`, under `firestore/pre-cutover-20261010`.
- All 103 production Storage objects, including unreferenced files, were copied with their source generation recorded and CRC32C verified: 106,246,249 bytes. Cloud backup copies contain no reusable Firebase download tokens.
- The recovery bucket enforces public access prevention and uniform bucket-level access; versioning and seven-day soft delete are enabled. No public IAM grants were found.
- Local checksum-verified copies include all 103 media objects and all six managed export files. Original object metadata, rules release/source, all four deployed Functions configurations/source archives, database/index/project settings and the current Vercel deployment/configuration metadata were retained privately.
- The website rollback reference is `dpl_GJnG5uCWEsNo4KEh8yFr6YCgQMcT`.

The ignored local recovery directory is `security-backup/recovery-20261010`, with restricted directory/file permissions. Its original object metadata includes existing download tokens and must remain private. A managed export is not a point-in-time snapshot if concurrent writes occur; before cutover, freeze clients and confirm the source inventory and records are unchanged or take a fresh export. A full cloud restore has not been exercised. Restore through the documented managed-import path and generation-indexed Storage copies; do not blindly restore permissive rules or public download tokens.

## Completed checks

| Check | Result |
| --- | --- |
| Real migration on synthetic cloud data | Completed after reconciling and correcting the CORS method |
| Auth preservation | All 12 account verification/disabled/email/UID attributes unchanged |
| Membership preservation | Nine approvals retained, including four unverified accounts |
| Unverified access | Four approved unverified accounts remain denied |
| Message preservation | All 162 messages retain their text, UID, poll content and creation time |
| Media migration | 58 validated objects; 54 message attachments plus four avatars |
| Token revocation | No tokens remain on any staging family object; old synthetic token URL returns 403 |
| Push records | Four synthetic records cleared |
| CORS configuration | Exact staging origin and authenticated GET headers stored on bucket |
| Deployed Functions | All 11 ACTIVE; media trigger attached to the correct bucket in US East, database triggers in London |
| Actual media trigger | Generated image resized to 2048px and WebP, EXIF/token removed; SVG bytes disguised as PNG deleted |
| Live database and private-media authorization | All 15 REST checks passed before App Check enforcement: member reads, unverified/outsider denial, admin listing, nonadmin listing denial, participant-only DMs including for admins, client role escalation denial and exact-origin authenticated media CORS |
| Storage membership IAM | Owner-approved staging-only service-agent role granted and read back; successful downloads after approximately seven minutes of Google permission propagation |
| Staging App Check enforcement | Firestore and Storage configured ENFORCED and read back; both missing and invalid tokens rejected (Firestore 403, Storage 401) |
| Callable enforcement | Anonymous requests rejected; authenticated synthetic admin without App Check also rejected |
| Positive Enterprise App Check flow | Browser approval succeeded before enforcement; protected reads, photo upload, participant DM send and admin revocation succeeded after enforcement |
| Browser private media | All 49 album images and an avatar loaded as private blobs; generated tone played through completion without an audio error; all three participant DM images loaded |
| Browser upload and validation | Generated 2600×1900 image uploaded with explicit custom metadata, rendered privately and checked in Storage: WebP 2048×1497, validated, EXIF/token removed, private/no-store |
| Live account revocation | Cancel preserved access; confirmed removal signed out the existing member session, wrote an admin audit, removed push/presence and invalidated the existing refresh token |
| Browser verification flow | Approved unverified test account sees Verify your email; verified admin enters chat and sees all nine approvals |
| Public hosting boundary | CSP/frame/MIME headers present; source, diagnostic and backup paths return 404 |
| Local verification | 25 security unit tests and all 10 emulator rule tests pass, including explicit upload metadata, replacement denial and existing-session revocation; private real-data local rehearsal previously passed |

Live staging exposed and fixed two issues that the local model did not catch: deployment-time regions now use Firebase `defineString` parameters, and bucket CORS uses the real Storage SDK's `setCorsConfiguration` method. The local rehearsal adapter now uses the same method name. The first trigger deployment also required Google's newly created Eventarc service-agent permissions to propagate; the subsequent deployment completed successfully.

## Approved staging permission — applied and verified

Private browser downloads require Storage rules to read Firestore membership. The applied grant is:

- Project: `kidschat-security-stage-261010` only.
- Recipient: `service-694249484344@gcp-sa-firebasestorage.iam.gserviceaccount.com`, Google's Firebase Storage service agent.
- Role: `roles/firebaserules.firestoreServiceAgent`.
- Effect: the service agent can read staging's Firestore records to evaluate cross-service Storage rules. Staging contains synthetic test data only; this does not grant production access.

The owner explicitly approved this exact staging-only grant on 11 October (local time). It was applied with the existing IAM policy etag preserved, existing bindings retained, and the role read back. Final Storage rules were then deployed. Initial authorized reads returned 403 while Google propagated the permission; subsequent group and participant-only DM reads returned 200. Unverified members, outsiders and an admin outside the DM were denied. Successful media responses include the exact staging web.app origin. That staging-only action did not change production IAM; the separate later production grant is recorded below.

Firestore and Storage App Check enforcement were enabled only on staging and read back as ENFORCED. Missing and invalid App Check tokens now fail for a valid synthetic member: Firestore returns 403 and Storage returns 401. Some Storage requests were still allowed during initial propagation, so those early responses were not counted as passes. [Firebase documents enforcement propagation of up to 15 minutes](https://firebase.google.com/docs/app-check/enable-enforcement).

The earlier positive approval used a real Enterprise token. Hosted positive reads/uploads after enforcement, private-media rendering, participant DM sending and live revocation have now passed. The older browser confirmation no longer blocks the fresh session. A subsequent separate production approval was received and its service-agent grant applied, as recorded below. Production cutover still requires the remaining release checks. The earlier read-only check found this production role absent; staging approval was not used to authorize the production grant.

Staging also exposed cached unversioned JavaScript after a reload. The build now gives local JS/CSS content-based version URLs, including the generated public configuration, and versions the service worker's config import. Hosting headers require revalidation. Tests verify that changing a script changes its URL and changing the App Check public key changes both the config URL and worker import. All 25 security unit tests pass. Account removal now has an account-specific in-page confirmation with Cancel initially focused and a separate Confirm remove access button. Both were verified live: Cancel preserved the active membership, and Confirm removed access and ended the existing session.

Popup sign-in with the production OAuth providers, microphone permission/recording, push delivery, and physical Safari/Chrome devices still need appropriate live release verification. Staging uses its own email provider and domain-restricted Enterprise key; it is not a Vercel production deployment.

## Browser verification completed — 11 October 2026

The primary `web.app` origin loaded all 49 synthetic album photos, a private avatar and a new uploaded image through authenticated blob URLs with real Enterprise App Check. The generated voice fixture played to the end (2.008 seconds, readyState 4, no audio error). Its new message points to already validated synthetic audio; microphone recording was not exercised. The Alice/Bob DM loaded all three private images, and Alice sent a synthetic test message with App Check enforced. The alternate `firebaseapp.com` origin was used only for an independent member text/session test; media CORS is configured for the primary origin.

The live upload initially failed because requests without an explicit custom metadata map were denied by live Storage validation. Adding `{client: 'kidschat'}` to all photo, avatar and voice upload metadata made the browser photo flow succeed with the original rules. The live validator produced a 2048×1497 WebP from a generated 2600×1900 PNG, removed EXIF and download tokens, and set `private, no-store`. The message stores a private `gs://` reference. Emulator cases cover legitimate metadata for group photos, avatars and participant DM audio, reject forged validation markers, and still reject replacement of an existing file. A diagnostic simplification of the create guard failed the replacement-denial test and was reverted; final rules retain `resource == null`, and all ten rule tests passed afterward.

The generated pending member was approved earlier, then revoked through the real browser admin callable. Cancel first preserved its active membership with no revoke audit. Confirm subsequently changed membership to inactive, removed inert push and presence records, wrote the revoke audit under the synthetic admin UID and revoked its existing refresh token (refresh returned 400). Its independent browser session automatically signed out with “Your family access has been removed.” All four approved unverified test memberships remain preserved.

A separate cached-ID-token REST probe with valid server-issued App Check could not run because the owner lacks `iam.serviceAccounts.signBlob`. No additional credential or IAM grant was created for that probe. The live browser session and refresh-token results above passed with real Enterprise App Check; the emulator separately verifies existing-session database/media denial when membership is revoked. Missing/invalid App Check denials are separate enforcement checks, not evidence of membership denial.

The migration baseline preserved 162 messages and nine approvals. Subsequent disposable tests added the now-inactive pending membership, one photo message, one generated-voice fixture and one DM text message; do not treat those as changes to the original preservation baseline. Private sanitized evidence is saved under ignored `security-backup/cloud-preparation`, including browser-media, browser-DM, upload-validation and revocation results. Screenshots show the private upload/audio, participant DM and removed-member screen.

## Remaining production release gates

The corresponding production Storage service-agent grant is now approved, applied and read back. Its effective cross-service access must still be verified after propagation during release. Production must receive the verified maintenance freeze/migration/final rules, Functions and Vercel build in the documented order, followed by real production App Check and media checks before enforcement. OAuth provider sign-in, push delivery, microphone recording and physical-device checks remain unverified release items. Full cloud restore rehearsal also remains unperformed. See SECURITY-ROLLOUT.md; staging readiness does not constitute a completed production rollout.

The post-grant production guard at 07:33 UTC on 11 October confirms unchanged rules, all 103 object generations/metagenerations and bearer tokens, empty UID memberships, four Functions, and the same Vercel production deployment. Recovery backups remain private. No production migration or release occurred. The separately approved production IAM grant is recorded below.

## Approved production permission — applied and verified

- Project: `kidschat-4e9cd` (verified number `1083637524943`).
- Recipient: `service-1083637524943@gcp-sa-firebasestorage.iam.gserviceaccount.com`, the production Firebase Storage service agent.
- Role: `roles/firebaserules.firestoreServiceAgent`.
- Current role definition contains only `datastore.entities.get`: the agent can read Firestore documents to evaluate Storage rules, including current membership and DM participation. It grants no Firestore document writes.
- Scope: this one role binding in this one production project. The current policy was re-read immediately before applying, its etag was used for concurrency control, and all existing bindings were preserved.

At 07:30 UTC, this binding was absent and a private proposal was prepared without IAM writes. The owner then explicitly approved the production-only grant. At 07:32:28 UTC, the project/number, owner and current role definition were rechecked; the binding was applied and read back. Canonical policy comparison verified that only the approved binding changed, including preservation of other members, roles, conditions and audit configuration. Private before/after policies and the sanitized result are retained under `security-backup/cloud-preparation`. IAM readback confirms configuration; authenticated cross-service downloads must still be tested after propagation during cutover. No migration, rules, Functions or hosting deployment was performed by this grant.
