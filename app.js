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
  const pushStatus = document.getElementById('push-status');
  const profileBtn = document.getElementById('profile-btn');
  const userAvatarEl = document.getElementById('user-avatar');
  const profileModal = document.getElementById('profile-modal');
  const avatarPreviewEl = document.getElementById('avatar-preview');
  const avatarGridEl = document.getElementById('avatar-grid');
  const profileNameInput = document.getElementById('profile-name-input');
  const gifLoadMore = document.getElementById('gif-load-more');
  const messagesEl = document.getElementById('messages');
  const messageStatus = document.getElementById('message-status');
  const form = document.getElementById('message-form');
  const input = document.getElementById('message-input');
  const emojiBtn = document.getElementById('emoji-btn');
  const gifBtn = document.getElementById('gif-btn');
  const emojiPanel = document.getElementById('emoji-panel');
  const gifPanel = document.getElementById('gif-panel');
  const gifSearchInput = document.getElementById('gif-search-input');
  const gifResults = document.getElementById('gif-results');
  const replyPreview = document.getElementById('reply-preview');
  const replyPreviewName = document.getElementById('reply-preview-name');
  const replyPreviewText = document.getElementById('reply-preview-text');
  const replyCancelBtn = document.getElementById('reply-cancel-btn');

  let unsubscribeMessages = null;
  let swRegistration = null;
  let sessionStart = null;
  let currentProfile = { avatar: '😀', displayName: '' };
  let profileSelectedAvatar = '😀';
  let replyTo = null;

  const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
  const AVATAR_OPTIONS = [
    '😀', '😎', '🤓', '😜', '🥳',
    '🐱', '🐶', '🦊', '🐻', '🐼',
    '🦋', '🌸', '🌈', '⭐', '🎮',
    '⚽', '🎸', '🍕', '🚀', '🦄',
  ];

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

      const gifUrl = data.type === 'gif' && isValidGiphyUrl(data.gifUrl || '') ? data.gifUrl : null;
      const mediaContent = gifUrl
        ? `<img class="msg__gif" src="${escapeHtml(gifUrl)}" alt="GIF" loading="lazy">`
        : `<div class="msg__text">${escapeHtml(data.text || '')}</div>`;

      const replyBlock = data.replyTo && typeof data.replyTo === 'object' && typeof data.replyTo.text === 'string'
        ? `<div class="msg__reply">
            <span class="msg__reply__name">${escapeHtml(String(data.replyTo.displayName || '').slice(0, 50))}</span>
            <span class="msg__reply__text">${escapeHtml(String(data.replyTo.text || '').slice(0, 120))}</span>
          </div>`
        : '';

      const wrapper = document.createElement('div');
      wrapper.className = `msg ${isOwn ? 'msg--own' : 'msg--other'}`;

      if (isOwn) {
        wrapper.innerHTML = `
          <div class="msg__actions">
            <button class="msg__reply-btn" type="button" aria-label="Reply">↩</button>
          </div>
          <div class="msg__bubble">
            ${replyBlock}
            ${mediaContent}
            <div class="msg__time">${escapeHtml(time)}</div>
          </div>`;
      } else {
        const hasEmojiAvatar = data.avatar && AVATAR_OPTIONS.includes(data.avatar);
        const avatarHtml = hasEmojiAvatar
          ? `<div class="msg__avatar msg__avatar--emoji" aria-hidden="true">${escapeHtml(data.avatar)}</div>`
          : `<div class="msg__avatar" style="background:${getAvatarColor(displayName)}" aria-hidden="true">${escapeHtml(getInitials(displayName))}</div>`;
        wrapper.innerHTML = `
          ${avatarHtml}
          <div class="msg__content">
            <div class="msg__name">${escapeHtml(displayName)}</div>
            <div class="msg__bubble">
              ${replyBlock}
              ${mediaContent}
              <div class="msg__time">${escapeHtml(time)}</div>
            </div>
          </div>
          <div class="msg__actions">
            <button class="msg__reply-btn" type="button" aria-label="Reply">↩</button>
          </div>`;
      }

      wrapper.querySelector('.msg__reply-btn').addEventListener('click', () => setReply(data));
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

  function isValidGiphyUrl(url) {
    try {
      const u = new URL(url);
      return /^media\d*\.giphy\.com$/.test(u.hostname);
    } catch {
      return false;
    }
  }

  function showChat(enabled) {
    chatSection.classList.toggle('hidden', !enabled);
    signinScreen.classList.toggle('hidden', enabled);
    signOutBtn.classList.toggle('hidden', !enabled);
    if (!enabled) {
      pushSection.classList.add('hidden');
      closeAllPickers();
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
      pushStatus.textContent = 'Notifications are not supported in this browser.';
      pushSection.classList.remove('hidden');
      return;
    }
    if (Notification.permission === 'granted') {
      pushSection.classList.add('hidden');
    } else if (Notification.permission === 'denied') {
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
      if (notificationsSupported && Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => { });
      }
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
      const messageData = {
        text,
        uid: user.uid,
        displayName: currentProfile.displayName || user.displayName || user.email || 'Family',
        avatar: currentProfile.avatar,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (replyTo) messageData.replyTo = replyTo;
      await db.collection('messages').add(messageData);
      input.value = '';
      messageStatus.textContent = '';
      clearReply();
    } catch (error) {
      messageStatus.textContent = `Message failed: ${error.message}`;
    }
  });

  // ── Profile management ──────────────────────────────────
  async function loadProfile(uid) {
    try {
      const snap = await db.collection('userProfiles').doc(uid).get();
      if (snap.exists) {
        const data = snap.data();
        currentProfile.avatar = AVATAR_OPTIONS.includes(data.avatar) ? data.avatar : '😀';
        currentProfile.displayName = String(data.displayName || '').slice(0, 30);
      } else {
        const user = auth.currentUser;
        currentProfile.avatar = '😀';
        currentProfile.displayName = user?.displayName || user?.email || '';
      }
      syncProfileUI();
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  }

  function syncProfileUI() {
    if (userAvatarEl) userAvatarEl.textContent = currentProfile.avatar;
    if (userNameEl) userNameEl.textContent = currentProfile.displayName;
  }

  function openProfileModal() {
    profileSelectedAvatar = currentProfile.avatar;
    avatarPreviewEl.textContent = currentProfile.avatar;
    profileNameInput.value = currentProfile.displayName;
    avatarGridEl.querySelectorAll('.avatar-option').forEach((btn) => {
      btn.classList.toggle('avatar-option--selected', btn.dataset.emoji === currentProfile.avatar);
    });
    profileModal.classList.remove('hidden');
  }

  function closeProfileModal() {
    profileModal.classList.add('hidden');
  }

  async function saveProfile() {
    const user = auth.currentUser;
    if (!user) return;
    const name = profileNameInput.value.trim();
    if (!name) { profileNameInput.focus(); return; }
    try {
      await db.collection('userProfiles').doc(user.uid).set({
        avatar: profileSelectedAvatar,
        displayName: name,
      });
      currentProfile.avatar = profileSelectedAvatar;
      currentProfile.displayName = name;
      syncProfileUI();
      closeProfileModal();
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  }

  AVATAR_OPTIONS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-option';
    btn.dataset.emoji = emoji;
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      profileSelectedAvatar = emoji;
      avatarPreviewEl.textContent = emoji;
      avatarGridEl.querySelectorAll('.avatar-option').forEach((b) => {
        b.classList.toggle('avatar-option--selected', b.dataset.emoji === emoji);
      });
    });
    avatarGridEl.appendChild(btn);
  });

  profileBtn.addEventListener('click', openProfileModal);
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) closeProfileModal();
  });
  document.getElementById('profile-cancel-btn').addEventListener('click', closeProfileModal);
  document.getElementById('profile-save-btn').addEventListener('click', saveProfile);

  function closeAllPickers() {
    emojiPanel.classList.add('hidden');
    gifPanel.classList.add('hidden');
  }

  function setReply(data) {
    replyTo = {
      text: data.type === 'gif' ? '[GIF]' : String(data.text || '').slice(0, 200),
      displayName: String(data.displayName || 'Family').slice(0, 50),
    };
    replyPreviewName.textContent = replyTo.displayName;
    replyPreviewText.textContent = replyTo.text;
    replyPreview.classList.remove('hidden');
    closeAllPickers();
    input.focus();
  }

  function clearReply() {
    replyTo = null;
    replyPreview.classList.add('hidden');
  }

  replyCancelBtn.addEventListener('click', clearReply);

  let gifSearchTimeout = null;
  let gifOffset = 0;
  let gifHasMore = false;
  let gifCurrentQuery = '';
  let gifFetching = false;

  async function fetchGifs(query, offset = 0) {
    const apiKey = (FAMILY_CHAT_CONFIG.giphyApiKey || '').trim();
    if (!apiKey) {
      gifResults.innerHTML = '<p class="gif-results__placeholder">Add a giphyApiKey to firebase-config.js to enable GIFs.</p>';
      return;
    }
    if (gifFetching) return;
    gifFetching = true;
    gifCurrentQuery = query;
    if (offset === 0) {
      gifResults.innerHTML = '<p class="gif-results__placeholder">Loading…</p>';
      gifOffset = 0;
      gifHasMore = false;
    }
    try {
      const base = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(apiKey)}&rating=g`;
      const res = await fetch(`${base}&limit=24&offset=${offset}`);
      const json = await res.json();
      const gifs = json.data || [];
      const pagination = json.pagination || {};
      gifHasMore = offset + gifs.length < (pagination.total_count || 0);
      gifOffset = offset + gifs.length;
      renderGifResults(gifs, offset > 0);
      gifLoadMore.classList.toggle('hidden', !gifHasMore);
    } catch {
      if (offset === 0) {
        gifResults.innerHTML = '<p class="gif-results__placeholder">Failed to load GIFs.</p>';
      }
    } finally {
      gifFetching = false;
    }
  }

  function renderGifResults(gifs, append = false) {
    if (!append) {
      if (!gifs.length) {
        gifResults.innerHTML = '<p class="gif-results__placeholder">No GIFs found.</p>';
        return;
      }
      gifResults.innerHTML = '';
    }
    gifs.forEach((gif) => {
      const thumbUrl = gif.images?.fixed_width_small?.url || '';
      const fullUrl = gif.images?.downsized?.url || gif.images?.original?.url || '';
      if (!isValidGiphyUrl(thumbUrl) || !isValidGiphyUrl(fullUrl)) return;
      const item = document.createElement('div');
      item.className = 'gif-result';
      const img = document.createElement('img');
      img.src = thumbUrl;
      img.alt = gif.title || 'GIF';
      img.loading = 'lazy';
      item.appendChild(img);
      item.addEventListener('click', () => sendGif(fullUrl));
      gifResults.appendChild(item);
    });
  }

  async function sendGif(gifUrl) {
    const user = auth.currentUser;
    if (!user || !isAllowedEmail(user) || !isValidGiphyUrl(gifUrl)) return;
    closeAllPickers();
    try {
      const gifData = {
        type: 'gif',
        gifUrl,
        text: '[GIF]',
        uid: user.uid,
        displayName: currentProfile.displayName || user.displayName || user.email || 'Family',
        avatar: currentProfile.avatar,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (replyTo) gifData.replyTo = replyTo;
      await db.collection('messages').add(gifData);
      messageStatus.textContent = '';
      clearReply();
    } catch (error) {
      messageStatus.textContent = `Failed to send GIF: ${error.message}`;
    }
  }

  emojiBtn.addEventListener('click', () => {
    const wasHidden = emojiPanel.classList.contains('hidden');
    closeAllPickers();
    if (wasHidden) emojiPanel.classList.remove('hidden');
  });

  gifBtn.addEventListener('click', () => {
    const wasHidden = gifPanel.classList.contains('hidden');
    closeAllPickers();
    if (wasHidden) {
      gifPanel.classList.remove('hidden');
      if (!gifResults.firstChild) fetchGifs('', 0);
    }
  });

  messagesEl.addEventListener('click', closeAllPickers);

  gifSearchInput.addEventListener('input', () => {
    clearTimeout(gifSearchTimeout);
    gifSearchTimeout = setTimeout(() => fetchGifs(gifSearchInput.value.trim(), 0), 400);
  });

  gifResults.addEventListener('scroll', () => {
    if (!gifHasMore || gifFetching) return;
    const { scrollTop, scrollHeight, clientHeight } = gifResults;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      fetchGifs(gifCurrentQuery, gifOffset);
    }
  });

  gifLoadMore.querySelector('button').addEventListener('click', () => {
    if (gifHasMore && !gifFetching) fetchGifs(gifCurrentQuery, gifOffset);
  });

  emojiPanel.querySelector('emoji-picker')?.addEventListener('emoji-click', (event) => {
    const emoji = event.detail.unicode;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    input.setSelectionRange(start + emoji.length, start + emoji.length);
    input.focus();
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

    authStatus.textContent = '';
    sessionStart = new Date();
    showChat(true);
    updatePushButtonState();
    if (Notification.permission === 'granted') {
      registerNotificationSW();
    }
    loadProfile(user.uid);

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
