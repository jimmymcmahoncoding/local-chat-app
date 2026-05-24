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
  const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');
  const notificationsSupported = 'Notification' in window;

  const allowedEmails = new Set(
    (FAMILY_CHAT_CONFIG.allowedFamilyEmails || []).map((email) => email.toLowerCase().trim())
  );

  const signInBtn = document.getElementById('sign-in-btn');
  const signInMsBtn = document.getElementById('sign-in-ms-btn');
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
  const stickerBtn = document.getElementById('sticker-btn');
  const emojiPanel = document.getElementById('emoji-panel');
  const gifPanel = document.getElementById('gif-panel');
  const stickerPanel = document.getElementById('sticker-panel');
  const stickerTabs = document.getElementById('sticker-tabs');
  const stickerGrid = document.getElementById('sticker-grid');
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

  // Pastel bubble colours for other users (background, text)
  const BUBBLE_PALETTE = [
    { bg: '#ede9fe', text: '#5b21b6' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#fef3c7', text: '#92400e' },
    { bg: '#d1fae5', text: '#065f46' },
    { bg: '#dbeafe', text: '#1e40af' },
    { bg: '#fee2e2', text: '#991b1b' },
    { bg: '#ccfbf1', text: '#134e4a' },
    { bg: '#ffedd5', text: '#9a3412' },
  ];

  const STICKER_PACKS = [
    {
      name: '🐾 Animals',
      stickers: ['🐶', '🐱', '🐻', '🐼', '🦊', '🐨', '🐯', '🦁', '🐸', '🐧', '🦋', '🐢', '🦄', '🐲', '🐬'],
    },
    {
      name: '🍕 Food',
      stickers: ['🍕', '🍔', '🌮', '🍦', '🍩', '🎂', '🍓', '🍇', '🍉', '🍭', '🍿', '🧁', '🍜', '🍣', '🥐'],
    },
    {
      name: '🎉 Fun',
      stickers: ['🎉', '🎊', '🎈', '🎮', '🎸', '🎯', '🏆', '🚀', '⭐', '🌈', '🎨', '🎪', '🔥', '💥', '✨'],
    },
    {
      name: '😀 Faces',
      stickers: ['😀', '😂', '😍', '🥳', '😎', '🤩', '😜', '🥺', '😴', '🤗', '😇', '🤣', '😅', '🤔', '🫶'],
    },
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

  function getBubbleStyle(uid) {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    const { bg, text } = BUBBLE_PALETTE[Math.abs(hash) % BUBBLE_PALETTE.length];
    return `background:${bg};color:${text};`;
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
      let mediaContent;
      if (gifUrl) {
        mediaContent = `<img class="msg__gif" src="${escapeHtml(gifUrl)}" alt="GIF" loading="lazy">`;
      } else if (data.type === 'sticker') {
        mediaContent = `<div class="msg__sticker" aria-label="Sticker">${escapeHtml(data.sticker || '')}</div>`;
      } else {
        mediaContent = `<div class="msg__text">${escapeHtml(data.text || '')}</div>`;
      }

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
            <button class="msg__delete-btn" type="button" aria-label="Delete message">🗑️</button>
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
        const bubbleStyle = data.uid ? getBubbleStyle(data.uid) : '';
        wrapper.innerHTML = `
          ${avatarHtml}
          <div class="msg__content">
            <div class="msg__name">${escapeHtml(displayName)}</div>
            <div class="msg__bubble" style="${bubbleStyle}">
              ${replyBlock}
              ${mediaContent}
              <div class="msg__time">${escapeHtml(time)}</div>
            </div>
          </div>
          <div class="msg__actions">
            <button class="msg__reply-btn" type="button" aria-label="Reply">↩</button>
          </div>`;
      }

      wrapper.dataset.messageId = doc.id;
      wrapper.querySelector('.msg__reply-btn').addEventListener('click', () => setReply(data, doc.id));
      const deleteBtn = wrapper.querySelector('.msg__delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteMessage(doc.id));
      }
      const replyQuote = wrapper.querySelector('.msg__reply');
      if (replyQuote && data.replyTo?.messageId) {
        replyQuote.classList.add('msg__reply--linkable');
        replyQuote.addEventListener('click', () => scrollToMessage(data.replyTo.messageId));
      }
      messagesEl.appendChild(wrapper);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function deleteMessage(docId) {
    if (!confirm('Delete this message?')) return;
    try {
      await db.collection('messages').doc(docId).delete();
    } catch (err) {
      messageStatus.textContent = `Delete failed: ${err.message}`;
    }
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

  async function handleSignIn(authProvider) {
    try {
      if (notificationsSupported && Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => { });
      }
      await auth.signInWithPopup(authProvider);
    } catch (error) {
      authStatus.textContent = `Sign-in failed: ${error.message}`;
    }
  }

  signInBtn.addEventListener('click', () => handleSignIn(provider));
  signInMsBtn.addEventListener('click', () => handleSignIn(microsoftProvider));

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
    stickerPanel.classList.add('hidden');
  }

  // ── Sticker panel ───────────────────────────────────────
  let activeStickerPack = 0;

  function renderStickerPanel() {
    stickerTabs.innerHTML = '';
    STICKER_PACKS.forEach((pack, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'sticker-tab' + (i === activeStickerPack ? ' sticker-tab--active' : '');
      tab.textContent = pack.name;
      tab.addEventListener('click', () => {
        activeStickerPack = i;
        renderStickerPanel();
      });
      stickerTabs.appendChild(tab);
    });
    stickerGrid.innerHTML = '';
    STICKER_PACKS[activeStickerPack].stickers.forEach((sticker) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sticker-item';
      btn.textContent = sticker;
      btn.setAttribute('aria-label', sticker);
      btn.addEventListener('click', () => sendSticker(sticker));
      stickerGrid.appendChild(btn);
    });
  }

  async function sendSticker(sticker) {
    const user = auth.currentUser;
    if (!user || !isAllowedEmail(user)) return;
    closeAllPickers();
    try {
      const stickerData = {
        type: 'sticker',
        sticker,
        text: '[Sticker]',
        uid: user.uid,
        displayName: currentProfile.displayName || user.displayName || user.email || 'Family',
        avatar: currentProfile.avatar,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (replyTo) stickerData.replyTo = replyTo;
      await db.collection('messages').add(stickerData);
      messageStatus.textContent = '';
      clearReply();
    } catch (error) {
      messageStatus.textContent = `Failed to send sticker: ${error.message}`;
    }
  }

  stickerBtn.addEventListener('click', () => {
    const wasHidden = stickerPanel.classList.contains('hidden');
    closeAllPickers();
    if (wasHidden) {
      renderStickerPanel();
      stickerPanel.classList.remove('hidden');
    }
  });

  function setReply(data, docId) {
    let replyText;
    if (data.type === 'gif') replyText = '[GIF]';
    else if (data.type === 'sticker') replyText = `[Sticker] ${data.sticker || ''}`;
    else replyText = String(data.text || '').slice(0, 200);
    replyTo = {
      text: replyText,
      displayName: String(data.displayName || 'Family').slice(0, 50),
      messageId: docId,
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

  function scrollToMessage(messageId) {
    const target = messagesEl.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('msg--highlight');
    setTimeout(() => target.classList.remove('msg--highlight'), 1500);
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
