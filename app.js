/* global firebase, FAMILY_CHAT_CONFIG */
(function () {
  if (!window.FAMILY_CHAT_CONFIG || !window.FAMILY_CHAT_CONFIG.firebaseConfig) {
    alert('Missing firebase-config.js. Copy firebase-config.example.js and configure it.');
    return;
  }

  firebase.initializeApp(FAMILY_CHAT_CONFIG.firebaseConfig);

  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();
  let messaging = null;
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try { messaging = firebase.messaging(); } catch { /* FCM not supported */ }
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');
  const notificationsSupported = 'Notification' in window;

  const signInBtn = document.getElementById('sign-in-btn');
  const signInMsBtn = document.getElementById('sign-in-ms-btn');
  const signOutBtn = document.getElementById('sign-out-btn');
  const authStatus = document.getElementById('auth-status');
  const chatSection = document.getElementById('chat-section');
  const pushSection = document.getElementById('push-section');
  const signinScreen = document.getElementById('signin-screen');
  const userNameEl = document.getElementById('user-name');
  const pushStatus = document.getElementById('push-status');
  const pushEnableBtn = document.getElementById('push-enable-btn');
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
  const newlineBtn = document.getElementById('newline-btn');
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
  const msgActionBar = document.getElementById('msg-action-bar');
  const actionBarClose = document.getElementById('action-bar-close');
  const actionBarDelete = document.getElementById('action-bar-delete');
  const actionBarReply = document.getElementById('action-bar-reply');
  const actionBarReact = document.getElementById('action-bar-react');
  const emailAuthForm = document.getElementById('email-auth-form');
  const emailNameInput = document.getElementById('email-name-input');
  const emailEmailInput = document.getElementById('email-email-input');
  const emailPasswordInput = document.getElementById('email-password-input');
  const emailSubmitBtn = document.getElementById('email-submit-btn');
  const nameRow = document.getElementById('name-row');
  const signupModeBtn = document.getElementById('signup-mode-btn');
  const signinModeBtn = document.getElementById('signin-mode-btn');
  const signupToggleFwd = document.querySelector('.signin-mode-toggle--fwd');
  const signupToggleBack = document.querySelector('.signin-mode-toggle--back');
  const authLoadingCard = document.getElementById('auth-loading-card');
  const signinCard = document.getElementById('signin-card');
  const pendingCard = document.getElementById('pending-card');
  const pendingEmailDisplay = document.getElementById('pending-email-display');
  const pendingSignoutBtn = document.getElementById('pending-signout-btn');
  const adminBtn = document.getElementById('admin-btn');
  const adminBadge = document.getElementById('admin-badge');
  const adminPanel = document.getElementById('admin-panel');
  const adminPanelList = document.getElementById('admin-panel-list');
  const adminPanelCloseBtn = document.getElementById('admin-panel-close-btn');
  const voiceBtn = document.getElementById('voice-btn');
  const sendBtn = form.querySelector('.btn-send');
  const voiceRecordingUi = document.getElementById('voice-recording-ui');
  const voiceTimer = document.getElementById('voice-timer');
  const voiceCancelBtn = document.getElementById('voice-cancel-btn');
  const voiceSendBtn = document.getElementById('voice-send-btn');

  let unsubscribeMessages = null;
  let swRegistration = null;
  let sessionStart = null;
  let currentProfile = { avatar: '😀', displayName: '' };
  let profileSelectedAvatar = '😀';
  let replyTo = null;
  let cachedIsAllowed = false;
  let cachedIsAdmin = false;
  let isSignUpMode = false;
  let unsubscribePending = null;
  let reactionPickerTargetId = null;
  let selectedMsgId = null;
  let selectedMsgData = null;
  let selectedMsgIsOwn = false;

  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStartTime = null;
  let recordingTimerInterval = null;
  let recordingStream = null;
  const MAX_RECORDING_SECONDS = 120;

  const profilesCache = new Map();
  let unsubscribeProfiles = null;
  let seenObserver = null;
  const pendingSeenUpdates = new Set();
  let seenFlushTimeout = null;

  const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
  const AVATAR_OPTIONS = [
    '😀', '😎', '🤓', '😜', '🥳',
    '🐱', '🐶', '🦊', '🐻', '🐼',
    '🦋', '🌸', '🌈', '⭐', '🎮',
    '⚽', '🎸', '🍕', '🚀', '🦄',
  ];

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  // Single shared reaction picker — position: fixed, repositioned by JS
  const globalReactionPicker = document.createElement('div');
  globalReactionPicker.className = 'msg__reaction-picker hidden';
  globalReactionPicker.setAttribute('role', 'toolbar');
  globalReactionPicker.setAttribute('aria-label', 'React');
  REACTION_EMOJIS.forEach((e) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reaction-picker__btn';
    btn.dataset.emoji = e;
    btn.setAttribute('aria-label', `React ${e}`);
    btn.textContent = e;
    globalReactionPicker.appendChild(btn);
  });
  document.body.appendChild(globalReactionPicker);

  function showReactionPicker(messageId, triggerBtn) {
    reactionPickerTargetId = messageId;
    globalReactionPicker.classList.remove('hidden');

    const triggerRect = triggerBtn.getBoundingClientRect();
    const pickerRect = globalReactionPicker.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default: appear above the trigger button, horizontally centred on it
    let top = triggerRect.top - pickerRect.height - 6;
    let left = triggerRect.left + triggerRect.width / 2 - pickerRect.width / 2;

    // If it would go above the viewport, flip below the trigger
    if (top < margin) top = triggerRect.bottom + 6;

    // Clamp horizontal so it never overflows either edge
    left = Math.max(margin, Math.min(left, vw - pickerRect.width - margin));

    // Clamp vertical as a safety net
    top = Math.max(margin, Math.min(top, vh - pickerRect.height - margin));

    globalReactionPicker.style.top = `${top}px`;
    globalReactionPicker.style.left = `${left}px`;
  }

  function selectMessage(docId, data, isOwn) {
    const prev = messagesEl.querySelector('.msg--selected');
    if (prev) prev.classList.remove('msg--selected');
    if (selectedMsgId === docId) {
      selectedMsgId = null;
      selectedMsgData = null;
      selectedMsgIsOwn = false;
      msgActionBar.classList.add('hidden');
      return;
    }
    selectedMsgId = docId;
    selectedMsgData = data;
    selectedMsgIsOwn = isOwn;
    const wrapper = messagesEl.querySelector(`[data-message-id="${CSS.escape(docId)}"]`);
    if (wrapper) wrapper.classList.add('msg--selected');
    actionBarDelete.classList.toggle('hidden', !isOwn);
    msgActionBar.classList.remove('hidden');
  }

  function clearSelection() {
    const prev = messagesEl.querySelector('.msg--selected');
    if (prev) prev.classList.remove('msg--selected');
    selectedMsgId = null;
    selectedMsgData = null;
    selectedMsgIsOwn = false;
    msgActionBar.classList.add('hidden');
    globalReactionPicker.classList.add('hidden');
    reactionPickerTargetId = null;
  }

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

  function buildReactionsBar(reactions, currentUid) {
    if (!reactions || typeof reactions !== 'object') return '';
    const entries = Object.entries(reactions).filter(([, uids]) => Array.isArray(uids) && uids.length > 0);
    if (!entries.length) return '';
    const pills = entries.map(([emoji, uids]) => {
      if (!REACTION_EMOJIS.includes(emoji)) return '';
      const mine = currentUid && uids.includes(currentUid);
      return `<button class="reaction-pill${mine ? ' reaction-pill--mine' : ''}" data-emoji="${escapeHtml(emoji)}" type="button">${escapeHtml(emoji)}<span class="reaction-pill__count">${uids.length}</span></button>`;
    }).join('');
    if (!pills) return '';
    return `<div class="msg__reactions">${pills}</div>`;
  }

  async function toggleReaction(messageId, emoji, uid) {
    if (!cachedIsAllowed || !uid || !REACTION_EMOJIS.includes(emoji)) return;
    try {
      const ref = db.collection('messages').doc(messageId);
      const snap = await ref.get();
      if (!snap.exists) return;
      const uids = (snap.data().reactions?.[emoji]) || [];
      await ref.update({
        [`reactions.${emoji}`]: uids.includes(uid)
          ? firebase.firestore.FieldValue.arrayRemove(uid)
          : firebase.firestore.FieldValue.arrayUnion(uid)
      });
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  }

  function renderMessages(snapshot, currentUser) {
    const atBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 150;
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
      } else if (data.type === 'voice') {
        const safeAudioUrl = isValidStorageUrl(data.audioUrl || '') ? data.audioUrl : '';
        const dur = typeof data.duration === 'number' ? formatDuration(data.duration) : '';
        mediaContent = safeAudioUrl
          ? `<div class="msg__voice"><audio class="msg__audio" src="${escapeHtml(safeAudioUrl)}" controls preload="none" aria-label="Voice message"></audio>${dur ? `<span class="msg__voice-duration">${escapeHtml(dur)}</span>` : ''}</div>`
          : `<div class="msg__text">[Voice message]</div>`;
      } else {
        mediaContent = `<div class="msg__text">${escapeHtml(data.text || '')}</div>`;
      }

      const replyBlock = data.replyTo && typeof data.replyTo === 'object' && typeof data.replyTo.text === 'string'
        ? `<div class="msg__reply">
            <span class="msg__reply__name">${escapeHtml(String(data.replyTo.displayName || '').slice(0, 50))}</span>
            <span class="msg__reply__text">${escapeHtml(String(data.replyTo.text || '').slice(0, 120))}</span>
          </div>`
        : '';

      const reactionsHtml = buildReactionsBar(data.reactions, currentUser?.uid);

      // Build seenBy avatars row (own messages only)
      let seenHtml = '';
      if (isOwn) {
        const seenByMap = data.seenBy || {};
        const viewerUids = Object.keys(seenByMap).filter((uid) => uid !== data.uid);
        if (viewerUids.length > 0) {
          const avatars = viewerUids.slice(0, 5).map((uid) => {
            const profile = profilesCache.get(uid);
            const av = profile?.avatar;
            const name = escapeHtml(String(profile?.displayName || '').slice(0, 30));
            if (av && AVATAR_OPTIONS.includes(av)) {
              return `<span class="msg__seen-avatar msg__seen-avatar--emoji" title="${name}">${escapeHtml(av)}</span>`;
            }
            return `<span class="msg__seen-avatar" style="background:${getAvatarColor(name || uid)}" title="${name}">${escapeHtml(getInitials(name || uid))}</span>`;
          }).join('');
          seenHtml = `<div class="msg__seen" aria-label="Seen">${avatars}</div>`;
        }
      }

      const wrapper = document.createElement('div');
      wrapper.className = `msg ${isOwn ? 'msg--own' : 'msg--other'}`;

      if (isOwn) {
        wrapper.innerHTML = `
          <div class="msg__body">
            <div class="msg__bubble">
              ${replyBlock}
              ${mediaContent}
              <div class="msg__time">${escapeHtml(time)}</div>
            </div>
            ${reactionsHtml}
            ${seenHtml}
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
            ${reactionsHtml}
          </div>
          `;
      }

      wrapper.dataset.messageId = doc.id;
      wrapper.dataset.senderUid = data.uid || '';
      wrapper.dataset.seenBy = JSON.stringify(data.seenBy || {});
      if (doc.id === selectedMsgId) wrapper.classList.add('msg--selected');
      wrapper.querySelector('.msg__bubble').addEventListener('click', (e) => {
        e.stopPropagation();
        selectMessage(doc.id, data, isOwn);
      });
      const replyQuote = wrapper.querySelector('.msg__reply');
      if (replyQuote && data.replyTo?.messageId) {
        replyQuote.classList.add('msg__reply--linkable');
        replyQuote.addEventListener('click', (e) => {
          e.stopPropagation();
          scrollToMessage(data.replyTo.messageId);
        });
      }
      wrapper.querySelectorAll('.reaction-pill').forEach((pill) => {
        pill.addEventListener('click', () => toggleReaction(doc.id, pill.dataset.emoji, currentUser?.uid));
      });

      messagesEl.appendChild(wrapper);
    });

    if (currentUser) observeMessagesForSeen(currentUser.uid);
    if (atBottom) messagesEl.scrollTop = messagesEl.scrollHeight;
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

  function showUI(screen) {
    // screen: 'signin' | 'pending' | 'chat'
    authLoadingCard.classList.add('hidden');
    const isChat = screen === 'chat';
    chatSection.classList.toggle('hidden', !isChat);
    signinScreen.classList.toggle('hidden', isChat);
    signOutBtn.classList.toggle('hidden', !isChat);
    if (!isChat) {
      pushSection.classList.add('hidden');
      closeAllPickers();
    }
    if (!isChat) {
      const isPending = screen === 'pending';
      signinCard.classList.toggle('hidden', isPending);
      pendingCard.classList.toggle('hidden', !isPending);
    }
  }

  async function checkAllowedStatus(user) {
    if (!user?.email) return { allowed: false, isAdmin: false };
    const email = user.email.toLowerCase().trim();
    try {
      const snap = await db.collection('allowedUsers').doc(email).get();
      if (!snap.exists) return { allowed: false, isAdmin: false };
      return { allowed: true, isAdmin: snap.data().isAdmin === true };
    } catch {
      return { allowed: false, isAdmin: false };
    }
  }

  async function addToPending(user) {
    if (!user?.email) return;
    const email = user.email.toLowerCase().trim();
    const displayName = user.displayName || email.split('@')[0];
    try {
      await db.collection('pendingUsers').doc(email).set({
        email,
        displayName,
        requestedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.warn('Failed to add pending request:', err);
    }
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
      pushEnableBtn.classList.add('hidden');
      pushSection.classList.remove('hidden');
      return;
    }
    if (Notification.permission === 'granted') {
      pushSection.classList.add('hidden');
      pushEnableBtn.classList.add('hidden');
    } else if (Notification.permission === 'denied') {
      pushStatus.textContent = 'Notifications blocked. Enable them in your browser or OS settings.';
      pushEnableBtn.classList.add('hidden');
      pushSection.classList.remove('hidden');
    } else {
      pushStatus.textContent = '';
      pushEnableBtn.classList.remove('hidden');
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
        const body = message.type === 'voice'
          ? '🎤 Voice message'
          : String(message.text || '').trim() || 'New message received';
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
    const uid = auth.currentUser?.uid;
    try {
      if (uid) {
        if (messaging) { try { await messaging.deleteToken(); } catch { /* ignore */ } }
        try { await db.collection('fcmTokens').doc(uid).delete(); } catch { /* ignore */ }
      }
      await auth.signOut();
    } catch (error) {
      authStatus.textContent = `Sign-out failed: ${error.message}`;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    const user = auth.currentUser;
    if (!text || !user || !cachedIsAllowed) {
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
      input.style.height = 'auto';
      updateVoiceBtnVisibility();
      messageStatus.textContent = '';
      clearReply();
    } catch (error) {
      messageStatus.textContent = `Message failed: ${error.message}`;
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    updateVoiceBtnVisibility();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  newlineBtn.addEventListener('click', () => {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + '\n' + input.value.slice(end);
    input.setSelectionRange(start + 1, start + 1);
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    input.focus();
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
    if (!user || !cachedIsAllowed) return;
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
    else if (data.type === 'voice') replyText = '[Voice message 🎤]';
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
    if (!user || !cachedIsAllowed || !isValidGiphyUrl(gifUrl)) return;
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
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  });

  // ── Email auth toggle ──────────────────────────────────
  function setSignUpMode(on) {
    isSignUpMode = on;
    nameRow.classList.toggle('hidden', !on);
    emailSubmitBtn.textContent = on ? 'Request access' : 'Sign in';
    signupToggleFwd.classList.toggle('hidden', on);
    signupToggleBack.classList.toggle('hidden', !on);
    emailPasswordInput.setAttribute('autocomplete', on ? 'new-password' : 'current-password');
    authStatus.textContent = '';
  }

  signupModeBtn.addEventListener('click', () => setSignUpMode(true));
  signinModeBtn.addEventListener('click', () => setSignUpMode(false));

  emailAuthForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailEmailInput.value.trim();
    const password = emailPasswordInput.value;
    const name = emailNameInput.value.trim();
    if (!email || !password) return;
    emailSubmitBtn.disabled = true;
    authStatus.textContent = '';
    try {
      if (isSignUpMode) {
        if (!name) { authStatus.textContent = 'Please enter your name.'; emailSubmitBtn.disabled = false; return; }
        if (password.length < 6) { authStatus.textContent = 'Password must be at least 6 characters.'; emailSubmitBtn.disabled = false; return; }
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use' ? 'An account with this email already exists. Try signing in.'
        : err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' ? 'Incorrect email or password.'
          : err.code === 'auth/invalid-email' ? 'Invalid email address.'
            : err.code === 'auth/weak-password' ? 'Password is too weak.'
              : err.message || 'Authentication failed.';
      authStatus.textContent = msg;
    } finally {
      emailSubmitBtn.disabled = false;
    }
  });

  pendingSignoutBtn.addEventListener('click', async () => {
    try { await auth.signOut(); } catch { /* ignore */ }
  });

  // ── Admin panel ────────────────────────────────────────
  function renderPendingList(docs) {
    adminPanelList.innerHTML = '';
    if (!docs.length) {
      adminPanelList.innerHTML = '<p class="admin-panel__empty">No pending requests.</p>';
      return;
    }
    docs.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'pending-user-card';

      const nameEl = document.createElement('div');
      nameEl.className = 'pending-user-card__name';
      nameEl.textContent = data.displayName || '(no name)';

      const emailEl = document.createElement('div');
      emailEl.className = 'pending-user-card__email';
      emailEl.textContent = data.email;

      const actionsEl = document.createElement('div');
      actionsEl.className = 'pending-user-card__actions';

      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn-approve';
      approveBtn.textContent = 'Approve';
      approveBtn.addEventListener('click', () => approveUser(data.email, card));

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn-reject';
      rejectBtn.textContent = 'Reject';
      rejectBtn.addEventListener('click', () => rejectUser(data.email, card));

      actionsEl.appendChild(approveBtn);
      actionsEl.appendChild(rejectBtn);
      card.appendChild(nameEl);
      card.appendChild(emailEl);
      card.appendChild(actionsEl);
      adminPanelList.appendChild(card);
    });
  }

  async function approveUser(email, card) {
    card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      await db.collection('allowedUsers').doc(email).set({ isAdmin: false });
      await db.collection('pendingUsers').doc(email).delete();
    } catch (err) {
      card.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      console.error('Approve failed:', err);
    }
  }

  async function rejectUser(email, card) {
    card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      await db.collection('pendingUsers').doc(email).delete();
    } catch (err) {
      card.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      console.error('Reject failed:', err);
    }
  }

  adminBtn.addEventListener('click', () => adminPanel.classList.toggle('hidden'));
  adminPanelCloseBtn.addEventListener('click', () => adminPanel.classList.add('hidden'));
  adminPanel.addEventListener('click', (e) => { if (e.target === adminPanel) adminPanel.classList.add('hidden'); });

  document.addEventListener('click', () => {
    clearSelection();
  });
  globalReactionPicker.addEventListener('click', (e) => e.stopPropagation());
  globalReactionPicker.querySelectorAll('.reaction-picker__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (reactionPickerTargetId) {
        toggleReaction(reactionPickerTargetId, btn.dataset.emoji, auth.currentUser?.uid);
      }
      clearSelection();
    });
  });

  actionBarClose.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelection();
  });
  actionBarDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedMsgId) deleteMessage(selectedMsgId);
    clearSelection();
  });
  actionBarReply.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedMsgData && selectedMsgId) setReply(selectedMsgData, selectedMsgId);
    clearSelection();
  });
  actionBarReact.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedMsgId) return;
    const alreadyOpen = reactionPickerTargetId === selectedMsgId && !globalReactionPicker.classList.contains('hidden');
    globalReactionPicker.classList.add('hidden');
    reactionPickerTargetId = null;
    if (!alreadyOpen) showReactionPicker(selectedMsgId, e.currentTarget);
  });

  // ── Read receipts (seenBy) ────────────────────────────
  function flushSeenUpdates() {
    if (!pendingSeenUpdates.size) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const batch = db.batch();
    pendingSeenUpdates.forEach((msgId) => {
      batch.update(db.collection('messages').doc(msgId), { [`seenBy.${uid}`]: true });
    });
    pendingSeenUpdates.clear();
    batch.commit().catch((err) => console.warn('seenBy batch failed:', err));
  }

  function observeMessagesForSeen(currentUid) {
    if (seenObserver) seenObserver.disconnect();
    seenObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const msgId = el.dataset.messageId;
        const senderUid = el.dataset.senderUid;
        if (!msgId || senderUid === currentUid) return;
        try {
          const seen = JSON.parse(el.dataset.seenBy || '{}');
          if (seen[currentUid]) { seenObserver.unobserve(el); return; }
        } catch { /* ignore */ }
        pendingSeenUpdates.add(msgId);
        seenObserver.unobserve(el);
        clearTimeout(seenFlushTimeout);
        seenFlushTimeout = setTimeout(flushSeenUpdates, 1500);
      });
    }, { threshold: 0.8 });
    messagesEl.querySelectorAll('[data-message-id]').forEach((el) => seenObserver.observe(el));
  }

  // ── FCM push notifications ────────────────────────────
  async function setupFCM(uid) {
    if (!('serviceWorker' in navigator)) return;
    try {
      const swReg = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
      swRegistration = swReg;
      updatePushButtonState();
    } catch (err) {
      console.warn('Service worker registration failed:', err);
      return;
    }
    const vapidKey = (FAMILY_CHAT_CONFIG.vapidPublicKey || '').trim();
    if (!vapidKey || !messaging) return;
    if (Notification.permission !== 'granted') return;
    try {
      // Force a fresh push subscription by unsubscribing at the browser level.
      // This ensures any stale subscription (e.g. from a previous VAPID key) is cleared.
      try {
        const existingSub = await swRegistration.pushManager.getSubscription();
        if (existingSub) await existingSub.unsubscribe();
      } catch { /* ignore */ }
      const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: swRegistration });
      if (token) {
        await db.collection('fcmTokens').doc(uid).set({
          token,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('FCM token registration failed:', err);
    }
  }

  pushEnableBtn.addEventListener('click', async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const permission = await Notification.requestPermission().catch(() => 'denied');
    updatePushButtonState();
    if (permission === 'granted') await setupFCM(uid);
  });

  // ── FCM foreground message listener ────────────────────
  // When a message arrives while the tab is focused, handle it here instead of as an OS notification
  if (messaging) {
    messaging.onMessage((payload) => {
      const title = payload.notification?.title || 'Family';
      const body = payload.notification?.body || 'New message';
      console.log('Foreground FCM message received:', { title, body });

      // If the tab is in the background, show a browser notification
      if (document.visibilityState !== 'visible' && swRegistration) {
        swRegistration.showNotification(title, { body }).catch((err) => {
          console.warn('Failed to show foreground notification:', err);
        });
      }
    });
  }

  // ── Voice messages ────────────────────────────────────
  const voiceSupported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  if (!voiceSupported) voiceBtn.classList.add('hidden');

  function getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
  }

  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function isValidStorageUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname === 'firebasestorage.googleapis.com';
    } catch {
      return false;
    }
  }

  function updateVoiceBtnVisibility() {
    if (!voiceSupported) return;
    const hasText = input.value.trim().length > 0;
    voiceBtn.classList.toggle('hidden', hasText);
    sendBtn.classList.toggle('hidden', !hasText);
  }

  function showRecordingUI() {
    form.classList.add('hidden');
    voiceRecordingUi.classList.remove('hidden');
  }

  function hideRecordingUI() {
    voiceRecordingUi.classList.add('hidden');
    form.classList.remove('hidden');
    updateVoiceBtnVisibility();
  }

  async function startRecording() {
    if (!cachedIsAllowed || !voiceSupported) return;
    try {
      closeAllPickers();
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      mediaRecorder = new MediaRecorder(recordingStream, options);
      audioChunks = [];
      mediaRecorder.addEventListener('dataavailable', (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      });
      mediaRecorder.start(100);
      recordingStartTime = Date.now();
      showRecordingUI();
      voiceTimer.textContent = '0:00';
      let elapsed = 0;
      recordingTimerInterval = setInterval(() => {
        elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        voiceTimer.textContent = formatDuration(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) stopAndSendRecording();
      }, 500);
    } catch (err) {
      const denied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      messageStatus.textContent = denied ? 'Microphone access denied.' : 'Could not access microphone.';
    }
  }

  function cleanupRecording() {
    if (recordingTimerInterval) { clearInterval(recordingTimerInterval); recordingTimerInterval = null; }
    if (recordingStream) { recordingStream.getTracks().forEach((t) => t.stop()); recordingStream = null; }
    mediaRecorder = null;
    audioChunks = [];
    hideRecordingUI();
  }

  function cancelRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    cleanupRecording();
  }

  async function stopAndSendRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    return new Promise((resolve) => {
      mediaRecorder.addEventListener('stop', async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const duration = Math.round((Date.now() - recordingStartTime) / 1000);
        const blob = new Blob(audioChunks, { type: mimeType });
        cleanupRecording();
        if (blob.size > 0) await sendVoiceMessage(blob, duration, mimeType);
        resolve();
      }, { once: true });
      mediaRecorder.stop();
    });
  }

  async function sendVoiceMessage(blob, duration, mimeType) {
    const user = auth.currentUser;
    if (!user || !cachedIsAllowed) return;
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `${Date.now()}.${ext}`;
    const storageRef = storage.ref(`voice-messages/${user.uid}/${fileName}`);
    messageStatus.textContent = 'Sending…';
    try {
      const snapshot = await storageRef.put(blob, { contentType: mimeType });
      const audioUrl = await snapshot.ref.getDownloadURL();
      const voiceData = {
        type: 'voice',
        audioUrl,
        duration,
        text: '[Voice message]',
        uid: user.uid,
        displayName: currentProfile.displayName || user.displayName || user.email || 'Family',
        avatar: currentProfile.avatar,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (replyTo) voiceData.replyTo = replyTo;
      await db.collection('messages').add(voiceData);
      messageStatus.textContent = '';
      clearReply();
    } catch (err) {
      messageStatus.textContent = `Voice message failed: ${err.message}`;
    }
  }

  voiceBtn.addEventListener('click', startRecording);
  voiceCancelBtn.addEventListener('click', cancelRecording);
  voiceSendBtn.addEventListener('click', stopAndSendRecording);
  updateVoiceBtnVisibility();

  // ── Auth state ────────────────────────────────────────
  auth.onAuthStateChanged(async (user) => {
    if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
    if (unsubscribePending) { unsubscribePending(); unsubscribePending = null; }
    if (unsubscribeProfiles) { unsubscribeProfiles(); unsubscribeProfiles = null; }
    if (seenObserver) { seenObserver.disconnect(); seenObserver = null; }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') cancelRecording();
    profilesCache.clear();
    pendingSeenUpdates.clear();
    cachedIsAllowed = false;
    cachedIsAdmin = false;
    adminBtn.classList.add('hidden');
    adminPanel.classList.add('hidden');

    if (!user) {
      authStatus.textContent = '';
      sessionStart = null;
      showUI('signin');
      return;
    }

    const { allowed, isAdmin } = await checkAllowedStatus(user);
    cachedIsAllowed = allowed;
    cachedIsAdmin = isAdmin;

    if (!allowed) {
      // Add to pending if not already there
      await addToPending(user);
      pendingEmailDisplay.textContent = user.email || '';
      showUI('pending');
      return;
    }

    authStatus.textContent = '';
    sessionStart = new Date();
    showUI('chat');
    updatePushButtonState();
    updateVoiceBtnVisibility();
    setupFCM(user.uid);
    loadProfile(user.uid);

    unsubscribeProfiles = db.collection('userProfiles').onSnapshot((snap) => {
      snap.docs.forEach((doc) => profilesCache.set(doc.id, doc.data()));
    });

    if (isAdmin) {
      adminBtn.classList.remove('hidden');
      unsubscribePending = db.collection('pendingUsers')
        .onSnapshot((snap) => {
          const count = snap.docs.length;
          adminBadge.textContent = count;
          adminBadge.classList.toggle('hidden', count === 0);
          renderPendingList(snap.docs);
        });
    }

    unsubscribeMessages = db
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limitToLast(100)
      .onSnapshot((snapshot) => {
        renderMessages(snapshot, user);
        notifyForNewMessages(snapshot, user);
      });
  });
})();
