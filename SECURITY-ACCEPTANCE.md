# Remaining production acceptance checks

The security release is live. Google member login, authenticated group media, all three existing participant DM conversations, security headers, Functions and enforced App Check have passed production checks. The recovered Google administrator session and Family access member list have also passed the owner-assisted visual check. The owner subsequently confirmed that the requested mobile checks and production photo/voice upload checks work. Microsoft sign-in remains unresolved. The latest evidence is in [SECURITY-PRODUCTION.md](SECURITY-PRODUCTION.md).

## Administrator session

The read-only provider check at 08:38 UTC on 11 October confirmed that production Microsoft sign-in is enabled, its client ID and client secret are configured, and the one active verified administrator has `microsoft.com` linked to its Auth record. No password provider is linked to that administrator. Credentials were not printed or saved. This establishes an existing setup, but does not establish current Microsoft secret validity, app-registration settings or a successful post-release sign-in.

The owner subsequently reported `auth/account-exists-with-different-credential`. A fresh read-only check at 08:56 UTC confirmed that the nominated administrator email resolves to the same administrator UID, remains verified/enabled and has only Microsoft linked, with the previous successful login recorded on 30 May 2026. This differs from the ordinary case of an account linked only to another provider. The email/identity actually selected in the failing Microsoft flow must be confirmed before choosing a remedy. No account linking, provider replacement, password reset or authorization change has been performed. Retry in a fresh Edge InPrivate session and explicitly select the existing personal Microsoft administrator account to exclude cached account selection; this is a diagnostic step, not a confirmed fix.

The owner confirmed that an InPrivate attempt with the nominated account still fails. The current diagnostic deployment `dpl_8oU1mRUAeC7n3jYT3PobhWyc5Ddx` requests explicit Microsoft account selection and, on a conflict, displays the email returned by Microsoft without storing credentials. The subsequent attempt returned `jimmymcmahoncoding@gmail.com`. Read-only checks confirmed that this is an existing verified, active Google member with no administrator role; the Hotmail Microsoft administrator is a distinct account. This explains the email/provider conflict. It does not establish why Microsoft returned the Gmail address or repair Microsoft identity matching.

The owner explicitly approved [SECURITY-ADMIN-RECOVERY.md](SECURITY-ADMIN-RECOVERY.md). At 09:31:43 UTC, an atomic commit granted administrator access only to the existing verified Gmail Google account and created the audit entry. Independent cloud readback at 09:31:55 UTC confirmed that only the intended membership's `isAdmin` flag changed, all eight other memberships including the Hotmail administrator were unchanged, and both Auth identities and linked providers remained unchanged. No provider linking or Microsoft authentication repair occurred.

The owner supplied `Screenshot 2026-10-11 at 10.35.23.png`, showing Family access loaded with **`jimmymcmahoncoding@gmail.com (you)`**, existing Active members and a Pending requests section with administrator controls. **The initial administrator browser acceptance check has passed.** This is owner-supplied visual evidence; the screenshot does not establish the browser name, window mode or successful execution of approval/removal controls. Do not approve, reject or remove real members simply to extend this check. The private screenshot was not copied into repository artifacts.

The four approved unverified accounts retain their approval and must complete normal email verification before access. Do not manually mark them verified.

## Physical devices

**Passed by owner confirmation.** Following the requested phone checks for Google sign-in, existing photos, voice playback, a direct conversation and composer usability with the keyboard open, the owner reported “1 and 2 work fine.” Device model, operating system and browser were not specified, so this is not claimed as coverage of both iOS/Safari and Android/Chrome. No automated physical-device verification was performed.

## Production write flows

**Photo/voice upload checks passed by owner confirmation.** The owner reported that the requested harmless production photo and voice message tests work. The agent did not create those messages or inspect their contents, destination, media metadata or notifications; no independent production upload artifact verification is claimed. Photo/voice uploads, message sending and administrator revocation also passed with generated fixtures on enforced synthetic staging. Real production approval, rejection and revocation remain untested. A real revocation test would need a designated approved test account and a restoration plan. Do not remove a family member simply to repeat the staging test.

## Source and operations follow-up

- The source release is prepared locally as described in [SECURITY-GIT-RELEASE.md](SECURITY-GIT-RELEASE.md), including the reviewed security files and Google popup correction. Private backups, credentials, environment files and generated output are excluded. Publication to GitHub `main` triggers a new Vercel production deployment and awaits owner approval.
- Recent backend logs were checked once, with no Function errors in the stated window. Persistent error alerting, billing alerts, an orphan-upload retention policy and a cloud recovery rehearsal remain separate follow-up work.
- Keep the private recovery copies. The pre-migration website depends on legacy data and cannot be rolled back independently.
