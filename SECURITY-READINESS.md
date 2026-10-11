# Production security readiness

Checked on 10 October 2026 using read-only cloud APIs and the public production website. No production data, account, rule, configuration or deployment was changed. Local CLI authentication may refresh its existing session. This is a readiness assessment, not a completed migration rehearsal or release verification.

The sections below record the initial inspection. The authorized follow-up setup and current status are recorded at the end of this document.

## Confirmed targets

| Item | Confirmed production target |
| --- | --- |
| Website | https://kidschat-family.vercel.app |
| Vercel project | `kidschat`, under `jimmymcmahoncodings-projects` |
| Firebase project | `kidschat-4e9cd` |
| Firebase web app | `1:1083637524943:web:8814fc2f505ee7c5f48aba` |
| Storage bucket | `kidschat-4e9cd.firebasestorage.app` |
| Storage location | `us-east1` |
| Firestore location | `europe-west2` |

The production site's public Firebase configuration matches these targets. The production domain is verified in Vercel and listed among Firebase Authentication's authorized domains. Firebase project access and Vercel inspection succeeded. Billing is enabled; Vercel uses Node.js 24, and the existing Firebase Functions use Node.js 22.

Email/password, Google and Microsoft sign-in are enabled. Provider secrets were not displayed or saved; popup sign-in still needs browser verification against the new CSP after deployment.

## Accounts

- Firebase Authentication contains 12 accounts: 7 verified and enabled, 5 unverified, none disabled.
- The legacy approved list contains 9 accounts, all with matching Auth accounts. One verified, enabled administrator is available.
- Four approved accounts are unverified. The owner explicitly chose to preserve them pending normal email verification. Do not delete them, mark them verified, or give them access before verification.
- The new UID membership collection and pending-request collection are empty.

The current migration script stops if any approved legacy account is unverified. Before migration, implement and rehearse a way to preserve those four accounts while deferring access until actual verification. Keep their Auth records and existing data; do not silently discard them or bypass the verification requirement. The counts above do not identify family members or expose their personal details.

## App Check and hosting

- Vercel has all six required `FIREBASE_*` build-variable names for production and preview, plus the optional GIF and push-key variables. Values were not displayed or saved. Variable presence alone does not establish that every value is correct for a future deployment.
- `APP_CHECK_SITE_KEY` is absent. The current production frontend does not configure App Check.
- Firebase's reCAPTCHA v3 configuration reports no registered site secret; the Enterprise configuration has no site key. Provider registration is therefore incomplete. Merely receiving a default configuration object from the API does not mean the app is registered.
- The reCAPTCHA Enterprise API is disabled. Listing its domain/key configuration failed for that reason, confirmed through the Service Usage API. Enable it during provider setup if Enterprise is selected.
- App Check service responses contain no explicit enforcement mode. No enabled enforcement was observed. Read back and verify enforcement after registration and token testing.
- The production root response has no CSP, frame, MIME, referrer or permissions headers from the new local configuration. Those headers will arrive with the coordinated release.
- The Vercel dashboard still names `.` as the output directory. The local `vercel.json` specifies `dist` and an explicit build command. Verify those overrides on the staged release before promotion.
- Git hosting targets this repository's `main` branch. Do not push the frontend or rules in isolation while the coordinated migration remains incomplete.

Register the production domain with App Check and add the public site key to the intended build environment. The current frontend integration uses reCAPTCHA v3; Firebase recommends Enterprise for new integrations. If Enterprise is selected, update the browser provider initialization and test it before release. See [Firebase's provider guidance](https://firebase.google.com/docs/app-check/web/recaptcha-provider). Never put a provider secret or service-account credential into frontend variables.

## Storage and recovery

- No public IAM grants were found on the project or bucket, and no public object ACLs were found across the complete inventory of 103 objects.
- All 103 objects have reusable Firebase download tokens, totalling about 106 MB. These links still need revocation during migration; private IAM alone does not revoke bearer links.
- No bucket CORS configuration was returned. Configure authenticated downloads for the exact production origin as part of migration.
- Uniform bucket-level access is disabled; public access prevention is inherited. Consider explicitly enforcing public access prevention and reviewing ACL use as follow-up hardening.
- The bucket has seven-day soft delete. No enabled object versioning was returned. Firestore point-in-time recovery and deletion protection are disabled. These settings do not replace the release backups required by the rollout procedure.
- Configure `MEDIA_FUNCTION_REGION=us-east1` for this project before deploying the Storage validator. Existing Firestore event functions use `europe-west2`; preserve that region for their deployment. Verify trigger compatibility and runtime IAM in staging. See [Firebase function location guidance](https://firebase.google.com/docs/functions/locations).

## Migration credentials and remaining checks

The Firebase CLI session can inspect the project, but the migration runner uses Application Default Credentials separately. No ADC file or `GOOGLE_APPLICATION_CREDENTIALS` setting was present. Running the production migration script without `--apply` failed with `app/invalid-credential` before its data preflight completed. No migration was applied.

Establish administrator ADC through the normal Google Cloud sign-in flow, without sharing credentials in chat. Then run the read-only migration preflight with the targets above and rehearse the deferred-account plan on staging. This assessment did not confirm backup/export permissions, deployment-specific service-agent permissions, App Check token exchange, authenticated browser downloads or new trigger delivery.

The application is currently unused, so no scheduled maintenance window is needed. Keep the temporary access freeze, backups and coordinated migration/deployment order described in [SECURITY-ROLLOUT.md](SECURITY-ROLLOUT.md).

## Authorized prerequisite setup completed on 10 October 2026

- Enabled the reCAPTCHA Enterprise API in `kidschat-4e9cd`.
- Created a score-based Enterprise key restricted to `kidschat-family.vercel.app`, with all-domain access disabled, and registered it against the confirmed Firebase web app. Registration was read back successfully; App Check tokens have a one-hour lifetime. Enforcement was not changed.
- Added the public `APP_CHECK_SITE_KEY` variable to the verified KidsChat Vercel project's production environment, and confirmed its target through the API. No production deployment ran. Preview hosting still requires separate staging resources and a key permitting its actual host.
- Updated the local frontend to initialize the Enterprise App Check provider before Firebase service access.
- Prepared the ignored local `functions/.env.kidschat-4e9cd` with `MEDIA_FUNCTION_REGION=us-east1` and `FIRESTORE_FUNCTION_REGION=europe-west2`. Local Functions metadata confirms the validator and Firestore triggers resolve to those regions. No Functions deployment ran.
- Added an explicit `--preserve-unverified` migration option. This preserves the existing approval of the four unverified accounts without changing their Auth verification status. Rules, browser sign-in and backend authorization still deny access until actual verification. Reruns preserve revoked memberships and current roles, and at least one verified active administrator remains mandatory.
- All 23 security unit tests and 10 emulator rule tests passed. Additional migration assertions confirm that unverified preserved accounts fail backend authorization, normal verification enables access for the matching email, and an email mismatch remains denied. Syntax checks and `git diff --check` passed.

The normal Google Cloud Application Default Credentials authorization flow was opened and is awaiting completion in the owner's browser. No ADC file has been created yet. After completing authorization, run:

```sh
node scripts/migrate-security.cjs --project kidschat-4e9cd \
  --bucket kidschat-4e9cd.firebasestorage.app --preserve-unverified
```

This command is read-only. Production migration, backups, staging rehearsal, App Check token exchange, final rules and application deployment remain outstanding. The existing media download tokens have not been revoked.

### Migration sign-in check

The first completed ADC sign-in was checked through Google's user-info endpoint and effective IAM permission tests. It belongs to a different Google account from the Firebase project owner and has no tested project or bucket permissions; reading the KidsChat project is denied. Do not run the migration with those credentials. The authorization flow was reopened for the existing Firebase project owner, with cloud-platform and identity scopes. Confirm the resulting account and effective permissions before running the preflight. No IAM grants or production data were changed to accommodate the incorrect account.

### Corrected credentials and production preflight

The second sign-in was confirmed as `jimmymcmayt@gmail.com`, the KidsChat project owner. The project is accessible, required database read/write and export permissions were returned, and ADC now has `kidschat-4e9cd` as its quota project. Bucket permission tests returned bucket read/update and object list/create/delete permissions. Object reads were subsequently confirmed by successfully reading attachment metadata and downloading all 58 referenced media files; object-level ACLs can grant access beyond the bucket-level permission test. Object update permission and runtime/service-agent access still need release verification.

The read-only production migration preflight passed: 9 new UID memberships, 4 accounts with deferred email verification, 162 message/profile updates, 58 referenced media objects, no pending requests, 4 push-token records to clear and 103 objects whose download tokens require revocation. The byte-validation preparation also validated all 58 referenced files. No production account, message, media object, rule or deployment was changed by these checks.

### Isolated local migration rehearsal

A private snapshot of the affected production records and referenced media was created under ignored `security-backup/rehearsal-951qiD`, with restricted directory/file permissions and no passwords or OAuth credentials. The real migration was executed against this copy using local database and Storage adapters, then rerun after revoking one copied membership.

Results: all 12 Auth account attributes remained unchanged; all 9 approvals were preserved; all 4 unverified approved accounts remained denied by backend authorization; all messages retained their text, sender, poll content and creation time; all 58 referenced media objects were validated; the 103 copied legacy bearer-token objects lost their tokens; push and typing records were cleared only in the copy; and the revoked membership remained revoked on rerun. A corrupted-media case was rejected with zero adapter writes. The rehearsal produced no production writes.

This was a local rehearsal with production data, not a cloud staging deployment. It does not confirm cloud object-update permissions, runtime/service-agent IAM, browser CORS, App Check token exchange, trigger delivery or the hosted application's end-to-end flow. Those live checks and a complete recovery backup remain necessary before production cutover. The application and final security rules have not been deployed, and production media tokens remain intact.

### Recovery backup and synthetic cloud rehearsal

A complete private recovery backup and a real Firebase cloud migration rehearsal are now available. See [SECURITY-STAGING.md](SECURITY-STAGING.md) for targets, verified results and remaining checks. All 103 production media objects and the complete managed Firestore export were backed up with verified local copies; current rules, Functions source/configuration and the Vercel rollback reference were retained.

The isolated staging project contains only generated data. The cloud migration preserved 12 test accounts, nine approvals and 162 messages, kept four approved unverified accounts denied, validated 58 media objects, revoked old test download tokens and configured exact-origin CORS. All 11 Functions are ACTIVE. Actual trigger delivery and nine live Firestore authorization checks passed. Two cloud-only issues were fixed: deployment regions now use Firebase parameters, and CORS uses the real Storage SDK method. All 25 security unit tests and the private real-data local rehearsal passed after these fixes.

The owner explicitly approved the exact staging-only cross-service Storage role on 11 October (local time); it was granted and read back. All 15 live database/private-media REST checks passed after Google IAM propagation. Staging Firestore and Storage now enforce App Check and reject missing/invalid tokens. Hosted positive media reads/uploads after enforcement, participant DM sending and live revocation have now passed; see the completed browser verification in SECURITY-STAGING.md. Production's corresponding role is absent and has not been granted. A positive browser approval with a real Enterprise App Check token succeeded, and its membership, pending cleanup and audit entry were verified. Production accounts, data, rules, media tokens, Functions and frontend remain unchanged by this rehearsal.

### Staging grant and release-cache verification — 11 October 2026

The build now versions local JS/CSS/config URLs by content, versions the service worker config import and requires hosting revalidation. This prevents previously cached unversioned security scripts/config from surviving a new build. The expanded build assertions and all 25 security unit tests pass. Staging account removal now uses an account-specific in-page confirmation; live Cancel/Confirm verification passed. Confirm ended the disposable member’s existing browser session, revoked its refresh token, removed push/presence and wrote the admin audit.

The final read-only production guard confirms all 103 source generations/metagenerations and download tokens unchanged, legacy rules unchanged, no UID migration, four Functions and the same Vercel production deployment. See SECURITY-STAGING.md for the exact role, cloud evidence and remaining release gates.

### Browser media and revocation verification — 11 October 2026

After browser recovery, all 49 synthetic album photos, a private avatar, three participant DM images and generated voice playback passed with Enterprise App Check enforced. A generated photo uploaded through the real frontend, appeared privately, and was verified as validated WebP 2048×1497 with no EXIF/download token and private/no-store delivery. Alice sent a synthetic participant DM successfully. Uploads now include an explicit custom metadata map: the live endpoint denied requests without it. All 25 security unit tests and 10 emulator rule tests passed with the final restrictive rules; file replacement and forged-validation denials remain intact.

The real browser admin revoke callable passed audit, membership, push/presence cleanup and refresh-token rejection checks. The existing member session signed out automatically. A separate cached-ID REST probe with valid server-issued App Check was unavailable due to missing signBlob permission; no extra IAM was granted, and existing-session database/media revocation remains covered by emulator tests. Production rules, all 103 media generations/metagenerations and bearer tokens, empty UID memberships, four Functions and the Vercel deployment were confirmed unchanged at 07:27 UTC. The production service-agent grant subsequently received separate approval and was applied/read back at 07:32 UTC; production migration/release, effective cross-service access and platform/device release checks remain pending.

### Approved production Storage permission — 11 October 2026

The owner explicitly approved `roles/firebaserules.firestoreServiceAgent` in `kidschat-4e9cd` for `service-1083637524943@gcp-sa-firebasestorage.iam.gserviceaccount.com`. The verified role contains only `datastore.entities.get`. The current project number, owner and role definition were checked, the current IAM policy was re-read, and its etag used when applying the single binding. Readback and full canonical policy comparison confirmed the grant and preservation of every other binding and audit configuration. This confirms the configured permission; effective cross-service media reads remain a cutover check after propagation. Production migration/rules/Functions/frontend deployment were not started by this action.

A post-grant read-only guard at 07:33 UTC confirmed unchanged production rules, all 103 object generations/metagenerations and tokens, empty UID memberships, four Functions and the same Vercel deployment. Only the expressly approved IAM binding was changed.

### Production core release — 11 October 2026

This supersedes the historical preparation status above. The approved production migration, website promotion, all 11 security Functions and final Firestore/Storage rules are now deployed and verified. All Auth attributes and approvals are preserved, including the four accounts awaiting normal verification. Private media conversion and old bearer-link revocation passed preservation checks. The newly required production Cloud Storage service-agent Pub/Sub publisher grant received separate explicit owner approval and was applied with exact-policy readback. See [SECURITY-PRODUCTION.md](SECURITY-PRODUCTION.md) for live evidence and the remaining App Check/browser release gates.

Production App Check token issuance is now confirmed by two successful Enterprise token exchanges in Google metrics. Firestore and Storage enforcement were enabled and read back as ENFORCED at 07:59 UTC. The remaining release verification requires the owner's signed-in family app session and device checks; cloud owner authentication alone cannot provide that session.

### Production Google login correction verified

The CSP was corrected to allow Firebase's two GAPI script paths after the owner reproduced Google sign-in failure in normal browsers. Corrected deployment `dpl_ypgUY1P9WbFw5ecDu328sbKCbyEz` is promoted. Real Edge sign-in and positive private reads now pass with App Check enforced: all seven group photos loaded privately and six voice files downloaded as private blobs. All 25 security tests and all 12 live asset/header checks pass. This satisfies the positive production private-media gate; administrator-specific and mobile/device follow-up limits are detailed in SECURITY-PRODUCTION.md.
