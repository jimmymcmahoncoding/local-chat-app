const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

// Convert an emoji character to a Twemoji CDN PNG URL (Chrome requires PNG, not SVG).
function emojiToTwemojiUrl(emoji) {
    const codepoints = [...emoji]
        .map(c => c.codePointAt(0).toString(16))
        .filter(cp => cp !== 'fe0f') // strip variation selector-16
        .join('-');
    return `https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/72x72/${codepoints}.png`;
}

exports.sendMessageNotification = onDocumentCreated('messages/{messageId}', async (event) => {
    const data = event.data.data();
    if (!data) return;
    const messageId = event.params.messageId;

    // Use the sender's emoji avatar as the notification icon (falls back to 😀).
    const senderAvatar = String(data.avatar || '😀').trim();
    const notificationIcon = emojiToTwemojiUrl(senderAvatar);

    const senderUid = data.uid;
    const senderName = String(data.displayName || 'Family').slice(0, 50);

    let body;
    if (data.type === 'voice') body = '🎤 Voice message';
    else if (data.type === 'gif') body = '🖼️ GIF';
    else if (data.type === 'sticker') body = `${data.sticker || '🎭'} Sticker`;
    else body = String(data.text || '').trim().slice(0, 200) || 'New message';

    const db = getFirestore();
    const tokensSnap = await db.collection('fcmTokens').get();
    console.log(`fcmTokens total: ${tokensSnap.size}, senderUid: ${senderUid}`);
    if (tokensSnap.empty) return;

    const recipientsByToken = new Map();
    tokensSnap.docs.forEach((doc) => {
        if (doc.id === senderUid) return;
        const token = String(doc.data().token || '').trim();
        if (!token) return;
        const docIds = recipientsByToken.get(token) || [];
        docIds.push(doc.id);
        recipientsByToken.set(token, docIds);
    });

    const tokens = Array.from(recipientsByToken.keys());
    console.log(`Tokens to notify: ${tokens.length}`);
    if (!tokens.length) return;

    const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: {
            title: `${senderName} sent a message`,
            body,
        },
        data: {
            messageId,
        },
        webpush: {
            notification: {
                icon: notificationIcon,
                badge: notificationIcon,
                tag: `msg-${messageId}`,
                renotify: false,
            },
            fcmOptions: { link: 'https://kidschat-family.vercel.app/' },
        },
    });

    // Remove stale or invalid tokens
    const batch = db.batch();
    let hasDeletions = false;
    response.responses.forEach((resp, i) => {
        if (!resp.success) {
            const token = tokens[i];
            const code = resp.error?.code;
            console.log(`Token failure [${i}] code: ${code}, message: ${resp.error?.message}`);
            if (
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/third-party-auth-error'
            ) {
                const linkedDocIds = recipientsByToken.get(token) || [];
                linkedDocIds.forEach((docId) => {
                    batch.delete(db.collection('fcmTokens').doc(docId));
                    hasDeletions = true;
                });
            }
        }
    });
    if (hasDeletions) await batch.commit();
    console.log(`sendEachForMulticast done. Success: ${response.successCount}, Failure: ${response.failureCount}`);
});

// ── sendTestNotification ───────────────────────────────────────────────────
// Callable function: sends a real FCM push notification to the calling user's
// saved token. Used by fcm-test.html to verify end-to-end FCM delivery.
exports.sendTestNotification = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.');

    const db = getFirestore();
    const snap = await db.collection('fcmTokens').doc(uid).get();
    if (!snap.exists || !snap.data().token) {
        throw new HttpsError('not-found', 'No FCM token found for your account. Complete steps 5 & 6 in the test page first.');
    }

    const token = snap.data().token;
    try {
        const messageId = await getMessaging().send({
            token,
            notification: {
                title: '🎉 FCM Test — It works!',
                body: 'Push notifications are working correctly on this device.',
            },
            webpush: {
                notification: {
                    icon: '/favicon.svg',
                    badge: '/favicon.svg',
                    requireInteraction: false,
                },
                fcmOptions: { link: '/' },
            },
        });
        console.log(`sendTestNotification sent to uid=${uid}, messageId=${messageId}`);
        return { success: true, messageId };
    } catch (err) {
        console.error(`sendTestNotification failed for uid=${uid}:`, err.message);
        const code = err.code || '';
        if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
        ) {
            // Stale token — clean it up
            await db.collection('fcmTokens').doc(uid).delete();
            throw new HttpsError('failed-precondition', 'Token is stale/invalid and has been deleted. Re-run steps 5 & 6 to get and save a fresh token.');
        }
        throw new HttpsError('internal', `FCM send failed: ${err.message}`);
    }
});
