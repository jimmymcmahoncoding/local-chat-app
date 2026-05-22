/* global firebase, FAMILY_CHAT_CONFIG */
(function () {
  if (!window.FAMILY_CHAT_CONFIG || !window.FAMILY_CHAT_CONFIG.firebaseConfig) {
    alert('Missing firebase-config.js. Copy firebase-config.example.js and configure it.');
    return;
  }

  firebase.initializeApp(FAMILY_CHAT_CONFIG.firebaseConfig);

  const auth = firebase.auth();
  const db = firebase.firestore();
  const provider = new firebase.auth.GoogleAuthProvider();
  const pushSupported = 'serviceWorker' in navigator && 'Notification' in window;
  let messaging = null;
  if (pushSupported) {
    try {
      messaging = firebase.messaging();
    } catch (error) {
      messaging = null;
      console.warn('Push initialization failed:', error);
    }
  }

  const allowedEmails = new Set(
    (FAMILY_CHAT_CONFIG.allowedFamilyEmails || []).map((email) => email.toLowerCase().trim())
  );

  const signInBtn = document.getElementById('sign-in-btn');
  const signOutBtn = document.getElementById('sign-out-btn');
  const authStatus = document.getElementById('auth-status');
  const chatSection = document.getElementById('chat-section');
  const pushSection = document.getElementById('push-section');
  const enablePushBtn = document.getElementById('enable-push-btn');
  const pushStatus = document.getElementById('push-status');
  const messagesEl = document.getElementById('messages');
  const messageStatus = document.getElementById('message-status');
  const form = document.getElementById('message-form');
  const input = document.getElementById('message-input');

  let unsubscribeMessages = null;

  function renderMessages(snapshot) {
    messagesEl.innerHTML = '';
    const docs = snapshot.docs;
    docs.forEach((doc) => {
      const data = doc.data();
      const wrapper = document.createElement('div');
      wrapper.className = 'msg';
      const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : '';
      wrapper.innerHTML = `<div><strong>${escapeHtml(data.displayName || 'Family')}</strong>: ${escapeHtml(
        data.text || ''
      )}</div><div class="meta">${escapeHtml(date)}</div>`;
      messagesEl.appendChild(wrapper);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function showChat(enabled) {
    chatSection.classList.toggle('hidden', !enabled);
    pushSection.classList.toggle('hidden', !enabled);
    signInBtn.classList.toggle('hidden', enabled);
    signOutBtn.classList.toggle('hidden', !enabled);
  }

  function isAllowedEmail(user) {
    const email = user?.email?.toLowerCase().trim();
    return Boolean(email && allowedEmails.has(email));
  }

  signInBtn.addEventListener('click', async () => {
    try {
      await auth.signInWithPopup(provider);
    } catch (error) {
      authStatus.textContent = `Sign-in failed: ${error.message}`;
    }
  });

  signOutBtn.addEventListener('click', async () => {
    try {
      await auth.signOut();
    } catch (error) {
      authStatus.textContent = `Sign-out failed: ${error.message}`;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    const user = auth.currentUser;
    if (!text || !user || !isAllowedEmail(user)) {
      return;
    }
    try {
      await db.collection('messages').add({
        text,
        uid: user.uid,
        displayName: user.displayName || user.email || 'Family',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      input.value = '';
      messageStatus.textContent = '';
    } catch (error) {
      messageStatus.textContent = `Message failed: ${error.message}`;
    }
  });

  enablePushBtn.addEventListener('click', async () => {
    try {
      if (!messaging || !pushSupported) {
        pushStatus.textContent = 'Push notifications are not supported in this browser.';
        return;
      }
      if (!FAMILY_CHAT_CONFIG.vapidPublicKey) {
        pushStatus.textContent = 'Set vapidPublicKey in firebase-config.js first.';
        return;
      }
      const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        pushStatus.textContent = 'Notification permission not granted.';
        return;
      }
      const token = await messaging.getToken({
        vapidKey: FAMILY_CHAT_CONFIG.vapidPublicKey,
        serviceWorkerRegistration: registration
      });
      pushStatus.textContent = token
        ? 'Push notifications enabled.'
        : 'No push token returned. Check Firebase setup.';
    } catch (error) {
      pushStatus.textContent = `Failed to enable push: ${error.message}`;
    }
  });

  if (messaging) {
    messaging.onMessage((payload) => {
      const title = payload.notification?.title || 'Family Chat';
      const body = payload.notification?.body || 'New message received';
      pushStatus.textContent = `${title}: ${body}`;
    });
  }

  auth.onAuthStateChanged((user) => {
    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }

    if (!user) {
      authStatus.textContent = 'Not signed in';
      showChat(false);
      return;
    }

    if (!isAllowedEmail(user)) {
      authStatus.textContent = `Access denied for ${user.email || 'unknown email'}`;
      showChat(false);
      auth.signOut();
      return;
    }

    authStatus.textContent = `Signed in as ${user.displayName || user.email}`;
    showChat(true);

    unsubscribeMessages = db
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .onSnapshot(renderMessages);
  });
})();
