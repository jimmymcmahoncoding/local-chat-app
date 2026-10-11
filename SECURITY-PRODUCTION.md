# Production security release — 11 October 2026

The security migration, backend Functions, final access rules and website are deployed to production. Firestore and Storage App Check enforcement are enabled. Google sign-in and authenticated private group-media reads are verified in Edge after correcting the popup script policy. Administrator access has been recovered through the approved Google account grant, with Family access confirmed in the owner's screenshot. Microsoft sign-in remains unresolved. The four approved unverified accounts retain approval and must complete normal email verification before access.

## Release targets

| Item | Verified target |
| --- | --- |
| Website | https://kidschat-family.vercel.app |
| Firebase project | `kidschat-4e9cd` / `1083637524943` |
| Web app | `1:1083637524943:web:8814fc2f505ee7c5f48aba` |
| Storage bucket | `kidschat-4e9cd.firebasestorage.app` / `us-east1` |
| Firestore | `(default)` / `europe-west2` |
| Vercel project | `kidschat`, `jimmymcmahoncodings-projects` |
| Current deployment | `dpl_8oU1mRUAeC7n3jYT3PobhWyc5Ddx`, READY |
| Google popup CSP correction | `dpl_ypgUY1P9WbFw5ecDu328sbKCbyEz` |
| Initial coordinated build | `dpl_2TjBiwBk9H31bhGmVpxq5H8b5s9E` |
| Pre-migration website backup | `dpl_GJnG5uCWEsNo4KEh8yFr6YCgQMcT` |

The current website was built from the working tree based on commit `e9c56e96379889887c8134d93382b1df42c64713`, including the local security changes. That deployment was made without a Git commit or push. Only 12 allowed public assets were uploaded from an isolated Build Output directory; no source, credentials or backups were uploaded. The subsequent validated local source-release preparation is described in [SECURITY-GIT-RELEASE.md](SECURITY-GIT-RELEASE.md); Git publication and its resulting deployment await owner approval.

## Preservation and access checks

Before the client freeze, all 185 affected documents and all 12 Auth account attributes matched the private backup snapshot. Actual deny-all maintenance rule sources were read back before migration. The migration and independent preservation verification then confirmed:

- All 12 Auth account records unchanged.
- All nine approvals retained, including four unverified accounts whose authorization remains denied until verification.
- All 181 retained documents preserved with 162 expected migration updates.
- All 58 referenced attachments validated and converted to private media references.
- No bearer download tokens on any of the 157 current Storage objects; a previous public photo link returns 403.
- Push and typing records cleared, and authenticated-download CORS restricted to the exact family origin.

All 11 Functions report ACTIVE with Node.js 22: four callables in `us-central1`, six Firestore triggers in `europe-west2`, and the retry-enabled media validator in `us-east1`, bound to the correct bucket. The published final Firestore and Storage rule sources match the reviewed files. Maintenance ended when those final rules were released.

The security release checks passed: 25 security unit tests, 10 emulator rule tests and zero reported vulnerabilities in both dependency audits. The subsequent Microsoft diagnostic update passed all 27 security unit tests, including two new error-handling checks. All 12 live asset hashes and security headers passed verification; all four tested source/private paths returned 404. The new regional Functions artifact repository has Firebase CLI's default one-day image cleanup policy; original Function sources remain backed up privately.

## Approved production permissions

Each grant had separate explicit owner approval, verified project/recipient/role, a freshly read IAM policy with etag, and exact canonical readback confirming that only the approved binding changed during that grant:

| Recipient | Role | Purpose |
| --- | --- | --- |
| `service-1083637524943@gcp-sa-firebasestorage.iam.gserviceaccount.com` | `roles/firebaserules.firestoreServiceAgent` | Storage rules consult Firestore membership; verified permission is `datastore.entities.get` only. Applied 07:32 UTC. |
| `service-1083637524943@gs-project-accounts.iam.gserviceaccount.com` | `roles/pubsub.publisher` | Storage publishes upload events for the media validator; verified permission is `pubsub.topics.publish` only. Applied 07:52 UTC. |

The second prerequisite was discovered when Firebase deployment stopped, then prepared for review and applied after the owner approved it. It permits publishing to project Pub/Sub topics, without subscriber reads, Storage object access or document writes. No extra runtime administrator or Token Creator role was granted for testing.

## App Check and production login

The Enterprise provider uses a SCORE key restricted to `kidschat-family.vercel.app`. After initial service setup errors, Google Cloud Monitoring recorded two HTTP 200 responses for production `TokenExchangeService.ExchangeRecaptchaEnterpriseToken`. On that evidence, Firestore and Storage enforcement were enabled and independently read back as ENFORCED at 07:59 UTC. Administrator callables enforce App Check independently. [Firebase documents enforcement propagation of up to 15 minutes](https://firebase.google.com/docs/app-check/enable-enforcement).

The initial CSP omitted Firebase's Google popup script dependency and caused `auth/internal-error` before the account chooser opened. The correction permits only `https://apis.google.com/js/` and `https://apis.google.com/_/scs/` for its loader and iframe module, retaining the other restrictions. [Firebase SDK popup loader source](https://github.com/firebase/firebase-js-sdk/blob/main/packages/auth/src/platform_browser/iframe/gapi.ts). The corrected deployment changes headers only; all 12 public asset hashes are unchanged. A regression check for these dependencies passes with all 25 unit tests.

The corrected production site opened Google's account chooser in Edge, then showed an authenticated family chat. DOM-only verification confirmed both GAPI scripts loaded, all seven group photos loaded from private blob URLs, and all six group voice files had downloaded blob sources, with metadata loaded for one. This occurred with production App Check enforced, confirming effective live cross-service private media access. Browser credentials were not extracted or reused for API testing. No production messages, uploads, approvals or revocations were sent for this check; ordinary sign-in may update presence/read receipt state.

Anonymous requests with missing/invalid App Check headers returned 403 from both data services. Those results do not isolate App Check rejection from membership rejection. Valid-member negative App Check tests and the full upload/validation/revocation flows passed on synthetic staging; they are not claimed as production tests.

## Remaining verification and recovery

The subsequent production verification opened all three existing participant DM conversations in the approved Google member's Edge session. They rendered nine, one and one message elements respectively, with no conversation error status. All 21 private photos in the first conversation finished loading from authenticated blob URLs. No messages or files were sent; opening a conversation may update normal read/typing state. This verifies positive participant reads, while outsider-denial and revocation coverage remains in the emulator and synthetic staging checks.

At 08:32 UTC, fresh cloud checks again confirmed all 11 Functions ACTIVE in the expected regions, final rule sources unchanged and both data services ENFORCED. At 08:33 UTC, all 12 live asset hashes/security headers and all four private/source-path 404 checks passed again. A complete Cloud Logging query found zero ERROR-or-higher entries for Cloud Run revisions or Cloud Functions in the production project between 08:00 and 08:34 UTC. This is a bounded observation, not ongoing monitoring or proof that every flow has executed.

The owner has since confirmed successful mobile access and production photo/voice upload checks, as recorded below. Administrator-specific Microsoft login remains unresolved; real production administrator revocation remains untested. Synthetic staging coverage is recorded in SECURITY-STAGING.md. The embedded browser still reported popup initialization failure during its cached-page check; Edge is the independently verified production login route. Remaining checks and follow-up work are listed in [SECURITY-ACCEPTANCE.md](SECURITY-ACCEPTANCE.md).

A read-only production provider check at 08:38 UTC confirmed Microsoft is enabled with both client ID and client secret configured. The one active verified administrator's existing Auth record is linked to `microsoft.com`, with no password provider linked. Provider credential values and account identities were not output or retained in the summary evidence. A fresh browser sign-in is still needed to verify the current Microsoft application secret and callback flow; no provider or account setting was changed.

The owner's subsequent Microsoft attempt returned `auth/account-exists-with-different-credential`; administrator acceptance is therefore unresolved. At 08:56 UTC, the nominated administrator email still resolved to the existing active verified administrator with Microsoft as its only linked provider and a prior login on 30 May. The selected Microsoft identity and the email returned during the failing attempt are not yet known. The account-specific diagnostic is private; no credential values were retained. Do not infer that the administrator should use Google or email/password, and do not relink or replace its Microsoft identity based solely on matching email text.

The owner confirmed the same conflict in an Edge InPrivate window while attempting the nominated administrator account. The stored Microsoft identifier has the expected personal-account format; that alone does not identify the credential returned by the failed attempt. A diagnostic release now requests explicit Microsoft account selection and presents only the returned email and conflict guidance in the sign-in page. It does not retain OAuth credentials, link accounts, alter providers or change authorization. Only `app.js`, `security.js` and the versioned references in `index.html` changed; the public Firebase configuration and security headers are unchanged. All 13 uploaded Build Output files (12 public assets plus route configuration) were hash-checked through the authenticated Vercel file API, the staged deployment was READY, and it was promoted to the verified project. All 12 live public assets/headers and four private-path denials passed again. Live browser inspection confirms the new script versions and `prompt=select_account` in the Microsoft flow. Successful administrator login remains unverified.

The staged deployment's unauthenticated URL redirected to Vercel Authentication, so its returned page was not treated as application evidence. The CLI protected-read attempt failed. Automatic approval review rejected a retry that would retain raw CLI diagnostics, because those might contain session material. That raw-log branch was removed; verification instead used read-only deployment metadata and content hashes. No deployment protection or trusted-source permission was changed.

The updated Edge flow reached Microsoft's email sign-in page with explicit account selection requested. After entering the requested existing administrator email, Microsoft showed **Signing in with your passkey…**, requiring the owner to complete the device security prompt. The owner subsequently reported that Microsoft returned `jimmymcmahoncoding@gmail.com` and Firebase rejected it with the provider-conflict code. Fresh read-only checks confirmed that this email belongs to an enabled, verified Google-only account with active ordinary membership. The Hotmail Microsoft-only administrator is a distinct account and remains unchanged. A prepared proposal to grant administrator access to the existing Gmail Google account is documented in [SECURITY-ADMIN-RECOVERY.md](SECURITY-ADMIN-RECOVERY.md); it requires separate explicit owner approval. No account role, provider or authentication setting has been changed, and Microsoft sign-in remains unresolved.

The owner subsequently explicitly approved that administrator recovery proposal. At 09:31:43 UTC, one atomic Firestore commit changed only the existing verified Gmail Google account's membership `isAdmin` flag from false to true and created a server-timestamped audit entry identifying the cloud owner and approved grant. The target update used a fresh document `updateTime` precondition, and the audit creation required a nonexistent document. Independent readback at 09:31:55 UTC verified the intended flag, complete audit fields, all nine memberships retained, all eight other membership documents unchanged, and both checked Auth identities/providers unchanged. The Microsoft Hotmail administrator remains intact; the four approved unverified accounts retain their prior status. No website deployment, account merge, provider linking, verification override or additional IAM grant was performed for this recovery.

The owner's subsequent screenshot, `Screenshot 2026-10-11 at 10.35.23.png`, shows Family access loaded with the recovered Gmail account labelled `(you)`, existing Active members and a Pending requests section with administrator controls. This passes the agreed administrator session/member-list acceptance check using owner-supplied visual evidence. It does not verify approval, rejection or revocation execution; the agent performed none of those actions. No private screenshot content was copied into repository artifacts. Microsoft sign-in remains a separate unresolved issue.

The owner subsequently reported “1 and 2 work fine” in response to the requested mobile access and harmless production photo/voice upload checks. Those two acceptance items are recorded as passed by owner confirmation. The specific device/browser, upload destination and uploaded content were not supplied or independently inspected. This does not establish all-platform mobile coverage or production approval/rejection/revocation execution. The agent sent no production messages for these checks.

The managed Firestore export, all 103 original Storage objects and checksummed local recovery copies remain private. No real production data was copied into synthetic staging. Private evidence is under ignored `security-backup/production-rollout-20261011/`, `security-backup/apply-juXpkb/` and `security-backup/recovery-20261010/`. These folders must not be published or committed. The browser record contains counts only; the shareable screenshot shows the blank composer, avoiding family messages, identities and photos.

The prior website depends on legacy data and cannot be restored independently after migration. If reconciliation is needed, use the private backups and document/object preconditions; do not blindly restore public tokens or permissive rules. A full cloud restore has not been rehearsed. The actual migration passed a private local-copy rehearsal, while cloud staging used generated fixtures.
