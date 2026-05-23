/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
importScripts('./firebase-config.js');

firebase.initializeApp(globalThis.FAMILY_CHAT_CONFIG.firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Family Chat';
  const body = payload.notification?.body || 'New message received';
  self.registration.showNotification(title, { body });
});
