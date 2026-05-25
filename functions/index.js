const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

exports.sendMessageNotification = onDocumentCreated('messages/{messageId}', async (event) => {
    const data = event.data.data();
    if (!data) return;

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

    const tokens = [];
    const docIds = [];
    tokensSnap.docs.forEach((doc) => {
        if (doc.id !== senderUid && doc.data().token) {
            tokens.push(doc.data().token);
            docIds.push(doc.id);
        }
    });
    console.log(`Tokens to notify: ${tokens.length}`);
    if (!tokens.length) return;

    const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: {
            title: `${senderName} sent a message`,
            body,
        },
        webpush: {
            notification: {
                icon: '/favicon.svg',
                badge: '/favicon.svg',
            },
            fcmOptions: { link: '/' },
        },
    });

    // Remove stale or invalid tokens
    const batch = db.batch();
    let hasDeletions = false;
    response.responses.forEach((resp, i) => {
        if (!resp.success) {
            const code = resp.error?.code;
            console.log(`Token failure [${i}] code: ${code}, message: ${resp.error?.message}`);
            if (
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/third-party-auth-error'
            ) {
                batch.delete(db.collection('fcmTokens').doc(docIds[i]));
                hasDeletions = true;
            }
        }
    });
    if (hasDeletions) await batch.commit();
    console.log(`sendEachForMulticast done. Success: ${response.successCount}, Failure: ${response.failureCount}`);
});
