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
  const notificationsSupported = 'Notification' in window;

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
  let hasLoadedInitialMessages = false;

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

  function notifyForNewMessages(snapshot, signedInUser) {
    if (Notification.permission !== 'granted') {
      return;
    }

    const addedChanges = snapshot.docChanges().filter((change) => change.type === 'added');

    // Do not notify for historical messages loaded on first subscription.
    if (!hasLoadedInitialMessages) {
      hasLoadedInitialMessages = true;
      return;
    }

    addedChanges.forEach((change) => {
      const message = change.doc.data();
      if (!message) {
        return;
      }

      const isSameUser = message.uid === signedInUser.uid;
      const isActiveWindow = document.visibilityState === 'visible' && document.hasFocus();

      // Avoid notifying for your own message in the active sender window,
      // but allow it in other inactive windows/tabs of the same account.
      if (isSameUser && isActiveWindow) {
        return;
      }

      const sender = message.displayName || 'Family';
      const body = String(message.text || '').trim() || 'New message received';

      try {
        new Notification(`${sender} sent a message`, { body });
      } catch (error) {
        console.error('Notification failed:', error);
      }
    });
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
      if (!notificationsSupported) {
        pushStatus.textContent = 'Notifications are not supported in this browser.';
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        pushStatus.textContent = 'Notification permission not granted.';
        return;
      }

      pushStatus.textContent =
        'Notifications enabled. You will receive alerts for new family messages while this app is open.';
    } catch (error) {
      pushStatus.textContent = `Failed to enable push: ${error.message}`;
    }
  });

  auth.onAuthStateChanged((user) => {
    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }

    if (!user) {
      authStatus.textContent = 'Not signed in';
      hasLoadedInitialMessages = false;
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
      .onSnapshot((snapshot) => {
        renderMessages(snapshot);
        notifyForNewMessages(snapshot, user);
      });
  });
})();
