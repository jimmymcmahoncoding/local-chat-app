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
  const signinScreen = document.getElementById('signin-screen');
  const userNameEl = document.getElementById('user-name');
  const enablePushBtn = document.getElementById('enable-push-btn');
  const pushStatus = document.getElementById('push-status');
  const messagesEl = document.getElementById('messages');
  const messageStatus = document.getElementById('message-status');
  const form = document.getElementById('message-form');
  const input = document.getElementById('message-input');

  let unsubscribeMessages = null;
  let swRegistration = null;
  let sessionStart = null;

  const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  function getInitials(name) {
    return String(name || 'F')
      .split(' ')
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function renderMessages(snapshot, currentUser) {
    messagesEl.innerHTML = '';
    const docs = snapshot.docs;

    if (docs.length === 0) {
      messagesEl.innerHTML = '<p class="messages-empty">No messages yet. Say hello! 👋</p>';
      return;
    }

    docs.forEach((doc) => {
      const data = doc.data();
      const isOwn = currentUser && data.uid === currentUser.uid;
      const displayName = data.displayName || 'Family';
      const time = data.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

      const wrapper = document.createElement('div');
      wrapper.className = `msg ${isOwn ? 'msg--own' : 'msg--other'}`;

      if (isOwn) {
        wrapper.innerHTML = `
          <div class="msg__bubble">
            <div class="msg__text">${escapeHtml(data.text || '')}</div>
            <div class="msg__time">${escapeHtml(time)}</div>
          </div>`;
      } else {
        const initials = escapeHtml(getInitials(displayName));
        const avatarColor = getAvatarColor(displayName);
        wrapper.innerHTML = `
          <div class="msg__avatar" style="background:${avatarColor}" aria-hidden="true">${initials}</div>
          <div class="msg__content">
            <div class="msg__name">${escapeHtml(displayName)}</div>
            <div class="msg__bubble">
              <div class="msg__text">${escapeHtml(data.text || '')}</div>
              <div class="msg__time">${escapeHtml(time)}</div>
            </div>
          </div>`;
      }

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
    signinScreen.classList.toggle('hidden', enabled);
    signOutBtn.classList.toggle('hidden', !enabled);
    if (!enabled) {
      pushSection.classList.add('hidden');
      enablePushBtn.classList.remove('btn-icon--active');
      enablePushBtn.disabled = false;
    }
  }

  function isAllowedEmail(user) {
    const email = user?.email?.toLowerCase().trim();
    return Boolean(email && allowedEmails.has(email));
  }

  function registerNotificationSW() {
    if (!('serviceWorker' in navigator)) return Promise.resolve();
    return navigator.serviceWorker
      .register('./notification-sw.js')
      .then((reg) => {
        swRegistration = reg;
      })
      .catch((err) => {
        console.warn('Notification service worker registration failed:', err);
      });
  }

  function showNotification(title, body) {
    if (swRegistration) {
      swRegistration.showNotification(title, { body }).catch((err) => {
        console.error('SW notification failed:', err);
      });
    } else {
      try {
        new Notification(title, { body });
      } catch (err) {
        console.error('Notification failed:', err);
      }
    }
  }

  function updatePushButtonState() {
    if (!notificationsSupported) {
      enablePushBtn.disabled = true;
      pushStatus.textContent = 'Notifications not supported in this browser.';
      pushSection.classList.remove('hidden');
      return;
    }
    if (Notification.permission === 'granted') {
      enablePushBtn.classList.add('btn-icon--active');
      pushSection.classList.add('hidden');
    } else if (Notification.permission === 'denied') {
      enablePushBtn.disabled = true;
      pushStatus.textContent = 'Notifications blocked. Enable them in your browser or OS settings.';
      pushSection.classList.remove('hidden');
    }
  }

  function notifyForNewMessages(snapshot, signedInUser) {
    if (Notification.permission !== 'granted') return;
    if (!sessionStart) return;

    snapshot
      .docChanges()
      .filter((change) => change.type === 'added')
      .forEach((change) => {
        const message = change.doc.data();
        if (!message) return;

        // Skip messages without a confirmed server timestamp (own pending writes).
        const msgTime = message.createdAt?.toDate ? message.createdAt.toDate() : null;
        if (!msgTime) return;

        // Skip messages that predate this session (historical load on subscribe).
        if (msgTime <= sessionStart) return;

        // Skip own messages only when this window is the active sender window.
        const isActiveWindow = document.visibilityState === 'visible' && document.hasFocus();
        if (message.uid === signedInUser.uid && isActiveWindow) return;

        const sender = message.displayName || 'Family';
        const body = String(message.text || '').trim() || 'New message received';
        showNotification(`${sender} sent a message`, body);
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
        updatePushButtonState();
        return;
      }

      await registerNotificationSW();
      updatePushButtonState();
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
      authStatus.textContent = '';
      sessionStart = null;
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
    if (userNameEl) userNameEl.textContent = user.displayName || user.email || '';
    sessionStart = new Date();
    showChat(true);
    updatePushButtonState();
    if (Notification.permission === 'granted') {
      registerNotificationSW();
    }

    unsubscribeMessages = db
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .onSnapshot((snapshot) => {
        renderMessages(snapshot, user);
        notifyForNewMessages(snapshot, user);
      });
  });
})();
