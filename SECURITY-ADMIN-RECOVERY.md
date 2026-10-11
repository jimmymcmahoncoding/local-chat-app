# Proposed administrator access recovery

Status: **Recovery complete. Explicitly approved and applied at 09:31:43 UTC on 11 October 2026; independent cloud verification passed at 09:31:55 UTC; administrator browser acceptance passed from the owner's subsequent screenshot.**

The owner approved this proposal with: “I approve the administrator recovery proposal.” The atomic commit updated the existing Gmail membership's `isAdmin` flag and created the audit entry. Independent readback confirmed that exactly one of the nine memberships changed, only its administrator flag changed, all eight other membership documents were identical to the fresh before-state, and both checked Auth identities and linked providers were unchanged. The Hotmail administrator remains intact. No Microsoft sign-in repair is claimed.

The owner's screenshot, `Screenshot 2026-10-11 at 10.35.23.png`, shows Family access loaded, `jimmymcmahoncoding@gmail.com (you)` in Active members, existing membership rows, and a pending request with administrator controls. This satisfies the agreed initial administrator acceptance check. It is owner-supplied visual evidence; no approve, reject or remove action was performed by the agent, and production write actions are not claimed as tested. The screenshot contains private family content and was not copied into the repository or shareable evidence.

The latest Microsoft attempt returned `jimmymcmahoncoding@gmail.com`. A fresh read-only production check at 09:29 UTC on 11 October 2026 confirmed that this email belongs to an existing enabled, verified Firebase account linked only to Google. Its family membership is active, with `isAdmin: false`. The existing enabled, verified `jimmymcmahoncoding@hotmail.com` account is linked only to Microsoft and remains an active administrator. These are two distinct Firebase accounts.

Microsoft's returned email conflicts with the existing Google account. A private browser window does not resolve that account/provider mismatch. This proposal provides an administrator route through the existing Google account; it does **not** repair or link Microsoft sign-in.

## Exact proposed change

Production project: **`kidschat-4e9cd`**. Database: **`(default)`**.

1. Update only the existing membership document for **`jimmymcmahoncoding@gmail.com`**: `isAdmin: false` → `isAdmin: true`.
2. Create one server-timestamped `adminAudit` entry recording `grant_admin`, the target UID, the authenticated cloud owner as the actor, and the previous/new administrator flags.

Both writes will use one atomic Firestore commit. The membership update will use a freshly checked document `updateTime` precondition; the audit write will require a previously nonexistent document. Private account UIDs, the before-state and the concrete write proposal are retained only in the ignored recovery evidence directory.

This gives the existing Google account access to **Family access**, including viewing membership and approving, rejecting or revoking family access. It does not grant Google Cloud IAM permissions. Participant restrictions on direct messages continue to apply.

The Hotmail administrator remains unchanged. All other accounts and memberships, including the four approved unverified accounts, remain unchanged. No account merging, provider linking, password reset, email-verification override or rules change is included.

## Application and verification

Before application, recheck both account identities, verification/enabled status, linked providers, membership emails, active flags and current roles. Stop if the reviewed assumptions no longer hold. After the commit, independently read back the membership and audit entry and compare membership records to the fresh before-state.

The owner should then open the production site in a standard Edge or Chrome window, choose **Sign in with Google**, explicitly select **`jimmymcmahoncoding@gmail.com`**, and confirm **Family access** shows the existing member list. Sign out first if another KidsChat account is already signed in. An InPrivate window is optional if it helps select the right Google account. Do not approve or revoke real members for this check.

The required separate explicit owner approval was received before applying this new administrator privilege. Previous deployment and service-agent IAM approvals were not used to authorize this account's role expansion. Private before/after documents, commit evidence and verification are retained under ignored `security-backup/production-rollout-20261011/admin-recovery-*` files.
