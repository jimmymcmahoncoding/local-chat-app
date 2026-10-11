# Prepared source release

Status: **Validated locally; publication to GitHub `main` awaits owner approval.** The accepted production application remains live.

## Exact target and change

- GitHub repository: `jimmymcmahoncoding/local-chat-app`, production branch `main`.
- Verified remote parent: `e9c56e96379889887c8134d93382b1df42c64713`.
- Vercel project: `kidschat` / `prj_j0G3JbHDOBtribfpXatW1JytyDvM` in `jimmymcmahoncodings-projects`.
- Production domain: `https://kidschat-family.vercel.app`.

Publish one local release commit containing the reviewed security source, migration tools, tests, configuration templates and release documentation. This puts the already-deployed security fixes under source control, including private media, UID-bound verified membership, backend administration and audit, App Check, input validation, security headers, the Google popup correction and Microsoft conflict diagnostics.

Pushing `main` triggers a new Vercel production website build. The repository's `vercel.json` explicitly selects `node build.js`, `dist` output and the reviewed security headers; these override the dashboard's historical `.` output setting. The build emits only the twelve approved public assets. Required production build-variable names are present; their values were not printed or saved during this inspection. The obsolete `ALLOWED_EMAILS` variable is not used by the new build; removing it is outside this release.

This publication does not rerun the Firebase migration, deploy Functions or rules, change memberships, link authentication providers, or restore legacy media tokens. Microsoft sign-in remains unresolved. Credentials, environment files, private recovery copies, family content and generated build output are excluded from the release commit.

## Validation completed

- All 27 security unit tests and all 10 local demo emulator rule tests pass.
- Both dependency audits report zero vulnerabilities.
- A fresh source build, using the accepted deployment's public web configuration, exactly matches all 12 accepted production asset hashes.
- Fresh public production checks verify those 12 hashes/security headers and four private/source-path 404 responses.
- The authenticated Vercel project inspection confirms the intended repository and `main` production branch; the remote branch still matches the reviewed parent.
- The owner confirmed mobile access and harmless production photo/voice uploads work. Administrator Family access passed the owner's screenshot check.

## Publication and verification

After explicit owner approval, recheck the remote branch and release commit, push only `main` without force, then identify the Vercel deployment for that exact commit. Wait for READY and verify the production alias, all twelve public assets, security headers and private-path denials before recording publication complete. If the new build fails, preserve the accepted live release and investigate; do not restore a pre-migration website against migrated data.

Operational error/billing alerts and a cloud recovery rehearsal remain separate follow-up work. Production administrator approval/rejection/revocation is not claimed as tested.
