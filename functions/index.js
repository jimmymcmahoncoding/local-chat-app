const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

admin.initializeApp();

exports.notifyFamilyOnMessage = onDocumentCreated('messages/{messageId}', async (event) => {
    const message = event.data ? event.data.data() : null;
    if (!message) {
        logger.warn('Message trigger had no data.');
        return;
    }

    const senderUid = String(message.uid || '');
    const senderName = String(message.displayName || 'Family');
    const rawText = String(message.text || '').trim();
    const body = rawText.length > 140 ? `${rawText.slice(0, 137)}...` : rawText || 'New message';

    const tokenSnapshot = await admin.firestore().collection('deviceTokens').where('enabled', '==', true).get();
    if (tokenSnapshot.empty) {
        logger.info('No enabled push tokens found.');
        return;
    }

    const tokens = [];
    const tokenRefs = [];

    tokenSnapshot.forEach((doc) => {
        const data = doc.data() || {};
        if (!data.token || data.uid === senderUid) {
            return;
        }
        tokens.push(String(data.token));
        tokenRefs.push(doc.ref);
    });

    if (!tokens.length) {
        logger.info('No recipient tokens after excluding sender.', { senderUid });
        return;
    }

    const multicastMessage = {
        tokens,
        notification: {
            title: `${senderName} sent a message`,
            body
        },
        data: {
            messageId: String(event.params.messageId || ''),
            senderUid,
            senderName,
            preview: body
        }
    };

    const response = await admin.messaging().sendEachForMulticast(multicastMessage);

    const staleCodes = new Set([
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered'
    ]);

    const staleDeletes = [];
    response.responses.forEach((sendResult, index) => {
        if (!sendResult.success && sendResult.error && staleCodes.has(sendResult.error.code)) {
            staleDeletes.push(tokenRefs[index].delete());
        }
    });

    if (staleDeletes.length) {
        await Promise.all(staleDeletes);
    }

    logger.info('Push fan-out completed.', {
        recipients: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        staleTokenDeletes: staleDeletes.length
    });
});