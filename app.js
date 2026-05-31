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
  const dmMessageStatus = document.getElementById('dm-message-status');
  const form = document.getElementById('message-form');
  const composerEl = form.closest('.composer');
  const input = document.getElementById('message-input');
  const mediaPickerBtn = document.getElementById('media-picker-btn');
  const mediaPickerModal = document.getElementById('media-picker-modal');
  const pickerBackdrop = document.getElementById('picker-backdrop');

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
  const typingIndicatorEl = document.getElementById('typing-indicator');
  const mentionDropdownEl = document.getElementById('mention-dropdown');
  const usersBtnEl = document.getElementById('users-btn');
  const usersBadgeEl = document.getElementById('users-badge');
  const usersPanelEl = document.getElementById('users-panel');
  const usersPanelListEl = document.getElementById('users-panel-list');
  const dmPanelEl = document.getElementById('dm-panel');
  const dmMessagesEl = document.getElementById('dm-messages');
  const dmFormEl = document.getElementById('dm-form');
  const dmComposerEl = dmFormEl.closest('.dm-composer');
  const dmInputEl = document.getElementById('dm-input');
  const dmBackBtn = document.getElementById('dm-back-btn');
  const dmUserAvatarEl = document.getElementById('dm-user-avatar');
  const dmUserNameEl = document.getElementById('dm-user-name');
  const dmUserStatusEl = document.getElementById('dm-user-status');
  const dmTypingEl = document.getElementById('dm-typing-indicator');
  const photoBtnEl = document.getElementById('photo-btn');
  const photoInputEl = document.getElementById('photo-input');
  const cameraInputEl = document.getElementById('camera-input');
  const photoSourceMenuEl = document.getElementById('photo-source-menu');
  const dmPhotoBtnEl = document.getElementById('dm-photo-btn');
  const dmPhotoInputEl = document.getElementById('dm-photo-input');
  const dmCameraInputEl = document.getElementById('dm-camera-input');
  const dmPhotoSourceMenuEl = document.getElementById('dm-photo-source-menu');
  const dmMediaPickerBtnEl = document.getElementById('dm-media-picker-btn');
  const dmVoiceBtnEl = document.getElementById('dm-voice-btn');
  const dmVoiceRecordingUiEl = document.getElementById('dm-voice-recording-ui');
  const dmVoiceTimerEl = document.getElementById('dm-voice-timer');
  const dmVoiceCancelBtnEl = document.getElementById('dm-voice-cancel-btn');
  const dmVoiceSendBtnEl = document.getElementById('dm-voice-send-btn');
  const dmSendBtnEl = dmFormEl.querySelector('.btn-send');
  const chatsBtnEl = document.getElementById('chats-btn');
  const chatsBadgeEl = document.getElementById('chats-badge');
  const chatsPanelEl = document.getElementById('chats-panel');
  const chatsPanelListEl = document.getElementById('chats-panel-list');
  const newDmBtnEl = document.getElementById('new-dm-btn');
  const dmMsgActionBarEl = document.getElementById('dm-msg-action-bar');
  const dmActionBarCloseEl = document.getElementById('dm-action-bar-close');
  const dmActionBarDeleteEl = document.getElementById('dm-action-bar-delete');
  const dmActionBarReplyEl = document.getElementById('dm-action-bar-reply');
  const dmActionBarReactEl = document.getElementById('dm-action-bar-react');
  const dmReplyPreviewEl = document.getElementById('dm-reply-preview');
  const dmReplyPreviewNameEl = document.getElementById('dm-reply-preview-name');
  const dmReplyPreviewTextEl = document.getElementById('dm-reply-preview-text');
  const dmReplyCancelBtnEl = document.getElementById('dm-reply-cancel-btn');

  let unsubscribeMessages = null;
  let swRegistration = null;
  let sessionStart = null;
  let currentProfile = { avatar: '😀', displayName: '', avatarUrl: '' };
  let profileSelectedAvatar = '😀';
  let pendingAvatarFile = null;
  let pendingAvatarClear = false;
  let replyTo = null;
  let pendingPhotos = [];
  let dmPendingPhotos = [];
  let cachedIsAllowed = false;
  let cachedIsAdmin = false;
  let isSignUpMode = false;
  let unsubscribePending = null;
  let reactionPickerTargetId = null;
  let reactionPickerIsDM = false;
  let selectedMsgId = null;
  let selectedMsgData = null;
  let selectedMsgIsOwn = false;
  let selectedDMMsgId = null;
  let selectedDMMsgData = null;
  let selectedDMMsgIsOwn = false;
  let dmReplyTo = null;

  // ── Presence ──────────────────────────────────────────────
  const presenceCache = new Map();
  let unsubscribePresence = null;
  let presenceHeartbeatInterval = null;
  let currentUid = null;

  // ── Typing indicators ─────────────────────────────────────
  let unsubscribeTyping = null;
  let unsubscribeDMTyping = null;
  let typingTimeout = null;
  let currentTypingRoomId = null;

  // ── @Mentions autocomplete ─────────────────────────────────
  let mentionAnchorIndex = -1;
  let mentionActiveIndex = -1;

  // ── Direct Messages ───────────────────────────────────────
  let currentDMConversationId = null;
  let currentDMPartnerUid = null;
  let unsubscribeDMMessages = null;
  const dmConversationsCache = new Map();
  let unsubscribeDMConversations = null;
  const dmUnreadCounts = new Map();
  let dmConversationsLoaded = false;
  let activeComposerContext = 'main'; // 'main' | 'dm'
  let isRecordingForDM = false;

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

  function selectDMMessage(docId, data, isOwn) {
    const prev = dmMessagesEl.querySelector('.msg--selected');
    if (prev) prev.classList.remove('msg--selected');
    if (selectedDMMsgId === docId) {
      selectedDMMsgId = null;
      selectedDMMsgData = null;
      selectedDMMsgIsOwn = false;
      dmMsgActionBarEl.classList.add('hidden');
      return;
    }
    selectedDMMsgId = docId;
    selectedDMMsgData = data;
    selectedDMMsgIsOwn = isOwn;
    const wrapper = dmMessagesEl.querySelector(`[data-message-id="${CSS.escape(docId)}"]`);
    if (wrapper) wrapper.classList.add('msg--selected');
    dmActionBarDeleteEl.classList.toggle('hidden', !isOwn);
    dmMsgActionBarEl.classList.remove('hidden');
  }

  function clearDMSelection() {
    const prev = dmMessagesEl.querySelector('.msg--selected');
    if (prev) prev.classList.remove('msg--selected');
    selectedDMMsgId = null;
    selectedDMMsgData = null;
    selectedDMMsgIsOwn = false;
    dmMsgActionBarEl.classList.add('hidden');
    globalReactionPicker.classList.add('hidden');
    reactionPickerTargetId = null;
    reactionPickerIsDM = false;
  }

  async function toggleDMReaction(messageId, emoji, uid) {
    if (!cachedIsAllowed || !uid || !REACTION_EMOJIS.includes(emoji) || !currentDMConversationId) return;
    try {
      const ref = db.collection('directMessages').doc(currentDMConversationId)
        .collection('messages').doc(messageId);
      const snap = await ref.get();
      if (!snap.exists) return;
      const uids = (snap.data().reactions?.[emoji]) || [];
      await ref.update({
        [`reactions.${emoji}`]: uids.includes(uid)
          ? firebase.firestore.FieldValue.arrayRemove(uid)
          : firebase.firestore.FieldValue.arrayUnion(uid)
      });
    } catch (err) {
      console.error('DM reaction failed:', err);
    }
  }

  async function deleteDMMessage(docId) {
    if (!confirm('Delete this message?')) return;
    if (!currentDMConversationId) return;
    try {
      await db.collection('directMessages').doc(currentDMConversationId)
        .collection('messages').doc(docId).delete();
    } catch (err) {
      console.error('DM delete failed:', err);
    }
  }

  function setDMReply(data, docId) {
    let replyText;
    if (data.type === 'gif') replyText = '[GIF]';
    else if (data.type === 'sticker') replyText = `[Sticker] ${data.sticker || ''}`;
    else if (data.type === 'voice') replyText = '[Voice message 🎤]';
    else if (data.type === 'photo') replyText = '[Photo 📷]';
    else if (data.type === 'photos') replyText = '[Photos 📷]';
    else replyText = String(data.text || '').slice(0, 200);
    dmReplyTo = {
      text: replyText,
      displayName: String(data.displayName || 'User').slice(0, 50),
      messageId: docId,
    };
    dmReplyPreviewNameEl.textContent = dmReplyTo.displayName;
    dmReplyPreviewTextEl.textContent = dmReplyTo.text;
    dmReplyPreviewEl.classList.remove('hidden');
    closeAllPickers();
    dmInputEl.focus();
  }

  function clearDMReply() {
    dmReplyTo = null;
    dmReplyPreviewEl.classList.add('hidden');
  }

  function scrollToDMMessage(messageId) {
    const target = dmMessagesEl.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('msg--highlight');
    setTimeout(() => target.classList.remove('msg--highlight'), 1500);
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

  function formatChatTime(date) {
    if (!date) return '';
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    const diffDays = (now - date) / 86400000;
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }

  function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function renderAvatarHtml(avatar, avatarUrl, displayName) {
    if (avatarUrl && isValidStorageUrl(avatarUrl)) {
      return `<div class="msg__avatar msg__avatar--photo" aria-hidden="true"><img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy"></div>`;
    }
    if (avatar && AVATAR_OPTIONS.includes(avatar)) {
      return `<div class="msg__avatar msg__avatar--emoji" aria-hidden="true">${escapeHtml(avatar)}</div>`;
    }
    return `<div class="msg__avatar" style="background:${getAvatarColor(displayName)}" aria-hidden="true">${escapeHtml(getInitials(displayName))}</div>`;
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
      } else if (data.type === 'photo') {
        const safePhotoUrl = isValidStorageUrl(data.photoUrl || '') ? data.photoUrl : '';
        mediaContent = safePhotoUrl
          ? `<a href="${escapeHtml(safePhotoUrl)}" target="_blank" rel="noopener noreferrer"><img class="msg__photo" src="${escapeHtml(safePhotoUrl)}" alt="Photo" loading="lazy"></a>`
          : '<div class="msg__text">[Photo]</div>';
      } else if (data.type === 'photos') {
        const safeUrls = (data.photoUrls || []).filter(u => isValidStorageUrl(u));
        mediaContent = safeUrls.length
          ? `<div class="msg__photos">${safeUrls.map(u => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer"><img class="msg__photo" src="${escapeHtml(u)}" alt="Photo" loading="lazy"></a>`).join('')}</div>`
          : '<div class="msg__text">[Photos]</div>';
      } else {
        mediaContent = renderTextWithMentions(data.text || '', currentProfile.displayName);
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
            const avUrl = profile?.avatarUrl;
            const name = escapeHtml(String(profile?.displayName || '').slice(0, 30));
            if (avUrl && isValidStorageUrl(avUrl)) {
              return `<span class="msg__seen-avatar msg__seen-avatar--photo" title="${name}"><img src="${escapeHtml(avUrl)}" alt="" loading="lazy"></span>`;
            }
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
        const avatarHtml = renderAvatarHtml(data.avatar, data.avatarUrl, displayName);
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

      // Make sender name/avatar clickable to open DM
      if (!isOwn && data.uid) {
        const nameEl = wrapper.querySelector('.msg__name');
        if (nameEl) {
          nameEl.classList.add('msg__name--clickable');
          nameEl.title = 'Send direct message';
          nameEl.addEventListener('click', (e) => { e.stopPropagation(); openDM(data.uid); });
        }
        const avatarEl = wrapper.querySelector('.msg__avatar');
        if (avatarEl) {
          avatarEl.title = 'Send direct message';
          avatarEl.style.cursor = 'pointer';
          avatarEl.addEventListener('click', (e) => { e.stopPropagation(); openDM(data.uid); });
        }
      }

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
      pushResetBtn.classList.add('hidden');
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
          : (message.type === 'photo' || message.type === 'photos')
            ? '📷 Photo'
            : String(message.text || '').trim() || 'New message received';
        const isMentioned = Array.isArray(message.mentions) && message.mentions.includes(signedInUser.uid);
        const title = isMentioned ? `${sender} mentioned you!` : `${sender} sent a message`;
        showNotification(title, body);
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
        avatarUrl: currentProfile.avatarUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (replyTo) messageData.replyTo = replyTo;
      const mentionedUids = extractMentionedUids(text);
      if (mentionedUids.length) messageData.mentions = mentionedUids;
      await db.collection('messages').add(messageData);
      input.value = '';
      input.style.height = 'auto';
      updateVoiceBtnVisibility();
      messageStatus.textContent = '';
      clearReply();
      clearTypingStatus(user.uid);
      hideMentionDropdown();
    } catch (error) {
      messageStatus.textContent = `Message failed: ${error.message}`;
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    updateVoiceBtnVisibility();
    updateMentionDropdown();
    const uid = auth.currentUser?.uid;
    if (uid && cachedIsAllowed && input.value.trim()) handleTypingInput(uid, 'main');
  });

  input.addEventListener('keydown', (e) => {
    if (handleMentionKeydown(e)) return;
    if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer: coarse)').matches) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // ── Profile management ──────────────────────────────────
  async function loadProfile(uid) {
    try {
      const snap = await db.collection('userProfiles').doc(uid).get();
      if (snap.exists) {
        const data = snap.data();
        currentProfile.avatar = AVATAR_OPTIONS.includes(data.avatar) ? data.avatar : '😀';
        currentProfile.avatarUrl = isValidStorageUrl(data.avatarUrl || '') ? (data.avatarUrl || '') : '';
        currentProfile.displayName = String(data.displayName || '').slice(0, 30);
      } else {
        const user = auth.currentUser;
        const rawName = user?.displayName || user?.email?.split('@')[0] || 'User';
        const fallbackName = String(rawName).slice(0, 30);
        currentProfile.avatar = '😀';
        currentProfile.displayName = fallbackName;
        // Auto-create a profile so this user is visible to others in the users list
        if (fallbackName.length > 0) {
          db.collection('userProfiles').doc(uid).set({
            avatar: '😀',
            displayName: fallbackName,
          }).catch(() => { });
        }
      }
      syncProfileUI();
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  }

  function syncProfileUI() {
    if (userAvatarEl) {
      if (currentProfile.avatarUrl && isValidStorageUrl(currentProfile.avatarUrl)) {
        userAvatarEl.innerHTML = `<img src="${escapeHtml(currentProfile.avatarUrl)}" alt="" class="user-avatar__img">`;
      } else {
        userAvatarEl.innerHTML = '';
        userAvatarEl.textContent = currentProfile.avatar;
      }
    }
    if (userNameEl) userNameEl.textContent = currentProfile.displayName;
  }

  function openProfileModal() {
    profileSelectedAvatar = currentProfile.avatar;
    pendingAvatarFile = null;
    pendingAvatarClear = false;
    if (currentProfile.avatarUrl && isValidStorageUrl(currentProfile.avatarUrl)) {
      avatarPreviewEl.innerHTML = `<img src="${escapeHtml(currentProfile.avatarUrl)}" alt="Profile photo" class="avatar-preview__img">`;
    } else {
      avatarPreviewEl.innerHTML = '';
      avatarPreviewEl.textContent = currentProfile.avatar;
    }
    profileNameInput.value = currentProfile.displayName;
    avatarGridEl.querySelectorAll('.avatar-option').forEach((btn) => {
      btn.classList.toggle('avatar-option--selected', btn.dataset.emoji === currentProfile.avatar);
    });
    const removeBtn = document.getElementById('avatar-remove-photo-btn');
    if (removeBtn) removeBtn.classList.toggle('hidden', !currentProfile.avatarUrl);
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
    let newAvatarUrl = currentProfile.avatarUrl;
    const saveBtn = document.getElementById('profile-save-btn');
    if (saveBtn) saveBtn.disabled = true;
    try {
      if (pendingAvatarFile) {
        const ext = (pendingAvatarFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const storageRef = storage.ref(`avatars/${user.uid}/avatar.${ext || 'jpg'}`);
        const snapshot = await storageRef.put(pendingAvatarFile, { contentType: pendingAvatarFile.type });
        newAvatarUrl = await snapshot.ref.getDownloadURL();
      } else if (pendingAvatarClear) {
        newAvatarUrl = '';
      }
      await db.collection('userProfiles').doc(user.uid).set({
        avatar: profileSelectedAvatar,
        avatarUrl: newAvatarUrl,
        displayName: name,
      });
      currentProfile.avatar = profileSelectedAvatar;
      currentProfile.avatarUrl = newAvatarUrl;
      currentProfile.displayName = name;
      pendingAvatarFile = null;
      pendingAvatarClear = false;
      syncProfileUI();
      closeProfileModal();
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
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
      pendingAvatarFile = null;
      pendingAvatarClear = true;
      avatarPreviewEl.innerHTML = '';
      avatarPreviewEl.textContent = emoji;
      document.getElementById('avatar-remove-photo-btn')?.classList.add('hidden');
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

  const avatarPhotoInput = document.getElementById('avatar-photo-input');
  const avatarUploadBtn = document.getElementById('avatar-upload-photo-btn');
  const avatarRemoveBtn = document.getElementById('avatar-remove-photo-btn');
  if (avatarUploadBtn && avatarPhotoInput) {
    avatarUploadBtn.addEventListener('click', () => avatarPhotoInput.click());
    avatarPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5 MB.'); return; }
      pendingAvatarFile = file;
      pendingAvatarClear = false;
      const previewUrl = URL.createObjectURL(file);
      avatarPreviewEl.innerHTML = `<img src="${previewUrl}" alt="Profile photo preview" class="avatar-preview__img">`;
      avatarGridEl.querySelectorAll('.avatar-option').forEach((b) => b.classList.remove('avatar-option--selected'));
      if (avatarRemoveBtn) avatarRemoveBtn.classList.remove('hidden');
      avatarPhotoInput.value = '';
    });
  }
  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener('click', () => {
      pendingAvatarFile = null;
      pendingAvatarClear = true;
      avatarPreviewEl.innerHTML = '';
      avatarPreviewEl.textContent = profileSelectedAvatar;
      avatarGridEl.querySelectorAll('.avatar-option').forEach((b) => {
        b.classList.toggle('avatar-option--selected', b.dataset.emoji === profileSelectedAvatar);
      });
      avatarRemoveBtn.classList.add('hidden');
    });
  }

  function closeAllPickers() {
    mediaPickerModal.classList.add('hidden');
    mediaPickerModal.style.bottom = '';
    pickerBackdrop.classList.add('hidden');
    pickerBackdrop.style.bottom = '';
    chatSection.classList.remove('picker-open');
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
    if (activeComposerContext === 'dm') {
      const fields = { type: 'sticker', sticker, text: '[Sticker]' };
      if (dmReplyTo) fields.replyTo = dmReplyTo;
      await sendDMMedia(fields);
      clearDMReply();
      return;
    }
    try {
      const stickerData = {
        type: 'sticker',
        sticker,
        text: '[Sticker]',
        uid: user.uid,
        displayName: currentProfile.displayName || user.displayName || user.email || 'Family',
        avatar: currentProfile.avatar,
        avatarUrl: currentProfile.avatarUrl,
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



  function setReply(data, docId) {
    let replyText;
    if (data.type === 'gif') replyText = '[GIF]';
    else if (data.type === 'sticker') replyText = `[Sticker] ${data.sticker || ''}`;
    else if (data.type === 'voice') replyText = '[Voice message 🎤]';
    else if (data.type === 'photo') replyText = '[Photo 📷]';
    else if (data.type === 'photos') replyText = '[Photos 📷]';
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
    if (activeComposerContext === 'dm') {
      const fields = { type: 'gif', gifUrl, text: '[GIF]' };
      if (dmReplyTo) fields.replyTo = dmReplyTo;
      await sendDMMedia(fields);
      clearDMReply();
      return;
    }
    try {
      const gifData = {
        type: 'gif',
        gifUrl,
        text: '[GIF]',
        uid: user.uid,
        displayName: currentProfile.displayName || user.displayName || user.email || 'Family',
        avatar: currentProfile.avatar,
        avatarUrl: currentProfile.avatarUrl,
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

  function showPickerTab(name) {
    emojiPanel.classList.toggle('hidden', name !== 'emoji');
    gifPanel.classList.toggle('hidden', name !== 'gif');
    stickerPanel.classList.toggle('hidden', name !== 'sticker');
    mediaPickerModal.querySelectorAll('.media-picker-tab').forEach(t => {
      t.classList.toggle('media-picker-tab--active', t.dataset.tab === name);
      t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false');
    });
    if (name === 'gif' && !gifResults.firstChild) fetchGifs('', 0);
    if (name === 'sticker') renderStickerPanel();
  }

  mediaPickerBtn.addEventListener('click', () => {
    activeComposerContext = 'main';
    const wasHidden = mediaPickerModal.classList.contains('hidden');
    closeAllPickers();
    if (wasHidden) {
      const composerH = composerEl.getBoundingClientRect().height;
      mediaPickerModal.style.bottom = composerH + 'px';
      mediaPickerModal.classList.remove('hidden');
      // Backdrop only covers messages area (not composer) so input tap still works
      pickerBackdrop.style.bottom = composerH + 'px';
      pickerBackdrop.classList.remove('hidden');
      chatSection.classList.add('picker-open');
      const activeTab = mediaPickerModal.querySelector('.media-picker-tab--active');
      showPickerTab(activeTab ? activeTab.dataset.tab : 'emoji');
      // getComputedStyle forces pending style recalculation (padding-bottom:45vh)
      // so that scrollHeight then returns the correct padded value
      void window.getComputedStyle(messagesEl).paddingBottom;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  dmMediaPickerBtnEl.addEventListener('click', () => {
    activeComposerContext = 'dm';
    const wasHidden = mediaPickerModal.classList.contains('hidden');
    closeAllPickers();
    if (wasHidden) {
      const composerH = dmComposerEl.getBoundingClientRect().height;
      mediaPickerModal.style.bottom = composerH + 'px';
      mediaPickerModal.classList.remove('hidden');
      pickerBackdrop.style.bottom = composerH + 'px';
      pickerBackdrop.classList.remove('hidden');
      chatSection.classList.add('picker-open');
      const activeTab = mediaPickerModal.querySelector('.media-picker-tab--active');
      showPickerTab(activeTab ? activeTab.dataset.tab : 'emoji');
      void window.getComputedStyle(dmMessagesEl).paddingBottom;
      dmMessagesEl.scrollTop = dmMessagesEl.scrollHeight;
    }
  });

  mediaPickerModal.querySelectorAll('.media-picker-tab').forEach(tab => {
    tab.addEventListener('click', () => showPickerTab(tab.dataset.tab));
  });

  pickerBackdrop.addEventListener('click', closeAllPickers);

  // Close picker when user taps the text input (WhatsApp-style)
  input.addEventListener('focus', closeAllPickers);
  dmInputEl.addEventListener('focus', closeAllPickers);

  gifSearchInput.addEventListener('input', () => {
    clearTimeout(gifSearchTimeout);
    gifSearchTimeout = setTimeout(() => {
      fetchGifs(gifSearchInput.value.trim(), 0);
    }, 400);
  });

  gifSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); gifSearchInput.blur(); }
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

  // Dismiss keyboard when the user presses the search/Enter key in the emoji picker's
  // internal search box (lives in the shadow DOM of the <emoji-picker> element).
  customElements.whenDefined('emoji-picker').then(() => {
    const pickerEl = emojiPanel.querySelector('emoji-picker');
    if (!pickerEl) return;
    const wireEmojiSearchBlur = () => {
      const searchInput = pickerEl.shadowRoot?.querySelector('input[type="search"], input.search');
      if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); searchInput.blur(); }
        });
      }
    };
    // The shadow root may not be populated yet — retry once the element upgrades
    if (pickerEl.shadowRoot) {
      wireEmojiSearchBlur();
    } else {
      pickerEl.addEventListener('load', wireEmojiSearchBlur, { once: true });
      // Fallback: try after a short tick in case 'load' doesn't fire
      setTimeout(wireEmojiSearchBlur, 500);
    }
  });

  emojiPanel.querySelector('emoji-picker')?.addEventListener('emoji-click', (event) => {
    const emoji = event.detail.unicode;
    const targetInput = activeComposerContext === 'dm' ? dmInputEl : input;
    const start = targetInput.selectionStart ?? targetInput.value.length;
    const end = targetInput.selectionEnd ?? targetInput.value.length;
    targetInput.value = targetInput.value.slice(0, start) + emoji + targetInput.value.slice(end);
    targetInput.setSelectionRange(start + emoji.length, start + emoji.length);
    targetInput.style.height = 'auto';
    targetInput.style.height = targetInput.scrollHeight + 'px';
    if (activeComposerContext === 'dm') updateDMVoiceBtnVisibility();
    else updateVoiceBtnVisibility();
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
    clearDMSelection();
  });
  globalReactionPicker.addEventListener('click', (e) => e.stopPropagation());
  globalReactionPicker.querySelectorAll('.reaction-picker__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (reactionPickerTargetId) {
        if (reactionPickerIsDM) {
          toggleDMReaction(reactionPickerTargetId, btn.dataset.emoji, auth.currentUser?.uid);
        } else {
          toggleReaction(reactionPickerTargetId, btn.dataset.emoji, auth.currentUser?.uid);
        }
      }
      clearSelection();
      clearDMSelection();
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
    reactionPickerIsDM = false;
    if (!alreadyOpen) showReactionPicker(selectedMsgId, e.currentTarget);
  });

  dmMsgActionBarEl.addEventListener('click', (e) => e.stopPropagation());
  dmActionBarCloseEl.addEventListener('click', (e) => {
    e.stopPropagation();
    clearDMSelection();
  });
  dmActionBarDeleteEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedDMMsgId) deleteDMMessage(selectedDMMsgId);
    clearDMSelection();
  });
  dmActionBarReplyEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedDMMsgData && selectedDMMsgId) setDMReply(selectedDMMsgData, selectedDMMsgId);
    clearDMSelection();
  });
  dmActionBarReactEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedDMMsgId) return;
    const alreadyOpen = reactionPickerTargetId === selectedDMMsgId && !globalReactionPicker.classList.contains('hidden');
    globalReactionPicker.classList.add('hidden');
    reactionPickerTargetId = null;
    reactionPickerIsDM = false;
    if (!alreadyOpen) {
      reactionPickerIsDM = true;
      showReactionPicker(selectedDMMsgId, e.currentTarget);
    }
  });
  dmReplyCancelBtnEl.addEventListener('click', clearDMReply);

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

  // ── Presence ──────────────────────────────────────────
  async function setUserPresence(uid, online) {
    if (!uid) return;
    try {
      await db.collection('presence').doc(uid).set({
        online,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        displayName: currentProfile.displayName || '',
        avatar: currentProfile.avatar || '😀',
      });
    } catch { /* ignore */ }
  }

  function isUserOnline(uid) {
    const p = presenceCache.get(uid);
    if (!p || !p.online) return false;
    const lastSeen = p.lastSeen?.toDate?.();
    if (!lastSeen) return false;
    return (Date.now() - lastSeen.getTime()) < 120000; // 2-min threshold
  }

  function startPresence(uid) {
    setUserPresence(uid, true);
    if (presenceHeartbeatInterval) clearInterval(presenceHeartbeatInterval);
    presenceHeartbeatInterval = setInterval(() => {
      if (!document.hidden) setUserPresence(uid, true);
    }, 30000);
  }

  function stopPresence(uid) {
    if (presenceHeartbeatInterval) { clearInterval(presenceHeartbeatInterval); presenceHeartbeatInterval = null; }
    if (uid) setUserPresence(uid, false);
  }

  function subscribePresence() {
    if (unsubscribePresence) unsubscribePresence();
    unsubscribePresence = db.collection('presence').onSnapshot((snap) => {
      snap.docs.forEach((doc) => presenceCache.set(doc.id, doc.data()));
      // Update online count badge
      const onlineCount = [...presenceCache.keys()]
        .filter((uid) => uid !== currentUid && isUserOnline(uid)).length;
      if (usersBadgeEl) {
        usersBadgeEl.textContent = onlineCount;
        usersBadgeEl.classList.toggle('hidden', onlineCount === 0);
      }
      // Refresh users panel if open
      if (!usersPanelEl.classList.contains('hidden')) renderUsersList();
      // Refresh chats panel if open
      if (!chatsPanelEl.classList.contains('hidden')) renderChatsList();
      // Refresh DM header if open
      if (currentDMPartnerUid && !dmPanelEl.classList.contains('hidden')) updateDMHeader();
    });
  }

  function updateChatsBadge() {
    let total = 0;
    dmUnreadCounts.forEach((count) => { total += count; });
    if (chatsBadgeEl) {
      chatsBadgeEl.textContent = total > 99 ? '99+' : String(total);
      chatsBadgeEl.classList.toggle('hidden', total === 0);
    }
  }

  function subscribeDMConversations(uid) {
    if (unsubscribeDMConversations) { unsubscribeDMConversations(); unsubscribeDMConversations = null; }
    dmConversationsLoaded = false;
    unsubscribeDMConversations = db.collection('directMessages')
      .where('participants', 'array-contains', uid)
      .onSnapshot((snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            dmConversationsCache.delete(change.doc.id);
            dmUnreadCounts.delete(change.doc.id);
          } else {
            const prev = dmConversationsCache.get(change.doc.id);
            dmConversationsCache.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            // Count as unread if: initial load is done, the conversation was updated (new message),
            // and it's not the currently open DM conversation
            if (dmConversationsLoaded && change.type === 'modified' && change.doc.id !== currentDMConversationId) {
              dmUnreadCounts.set(change.doc.id, (dmUnreadCounts.get(change.doc.id) || 0) + 1);
              updateChatsBadge();
            }
          }
        });
        dmConversationsLoaded = true;
        if (!chatsPanelEl.classList.contains('hidden')) renderChatsList();
      }, (err) => {
        console.warn('DM conversations subscription error:', err);
      });
  }

  // ── Typing indicators ──────────────────────────────────
  async function setTypingStatus(uid, isTyping, roomId) {
    if (!uid || !roomId) return;
    try {
      if (isTyping) {
        await db.collection('typingIndicators').doc(uid).set({
          isTyping: true,
          displayName: currentProfile.displayName || '',
          roomId,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await db.collection('typingIndicators').doc(uid).delete();
      }
    } catch { /* ignore */ }
  }

  function handleTypingInput(uid, roomId) {
    if (currentTypingRoomId && currentTypingRoomId !== roomId) {
      setTypingStatus(uid, false, currentTypingRoomId);
    }
    currentTypingRoomId = roomId;
    setTypingStatus(uid, true, roomId);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      setTypingStatus(uid, false, roomId);
      currentTypingRoomId = null;
    }, 3000);
  }

  function clearTypingStatus(uid) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
    if (currentTypingRoomId) {
      setTypingStatus(uid, false, currentTypingRoomId);
      currentTypingRoomId = null;
    }
  }

  function subscribeMainTyping(uid) {
    if (unsubscribeTyping) unsubscribeTyping();
    unsubscribeTyping = db.collection('typingIndicators')
      .where('roomId', '==', 'main')
      .onSnapshot((snap) => {
        const names = snap.docs
          .filter((doc) => doc.id !== uid)
          .filter((doc) => doc.data().isTyping === true)
          .map((doc) => doc.data().displayName || 'Someone');
        if (!typingIndicatorEl) return;
        if (!names.length) {
          typingIndicatorEl.textContent = '';
          typingIndicatorEl.classList.add('hidden');
        } else {
          const text = names.length === 1
            ? `${names[0]} is typing\u2026`
            : names.length === 2
              ? `${names[0]} and ${names[1]} are typing\u2026`
              : 'Several people are typing\u2026';
          typingIndicatorEl.textContent = text;
          typingIndicatorEl.classList.remove('hidden');
        }
      });
  }

  function subscribeDMTyping(conversationId, uid) {
    if (unsubscribeDMTyping) { unsubscribeDMTyping(); unsubscribeDMTyping = null; }
    if (!conversationId) return;
    unsubscribeDMTyping = db.collection('typingIndicators')
      .where('roomId', '==', conversationId)
      .onSnapshot((snap) => {
        const isTyping = snap.docs.some((doc) => {
          if (doc.id === uid) return false;
          return doc.data().isTyping === true;
        });
        if (!dmTypingEl) return;
        if (isTyping) {
          const partnerProfile = profilesCache.get(currentDMPartnerUid);
          dmTypingEl.textContent = `${partnerProfile?.displayName || 'User'} is typing\u2026`;
          dmTypingEl.classList.remove('hidden');
        } else {
          dmTypingEl.textContent = '';
          dmTypingEl.classList.add('hidden');
        }
      });
  }

  // ── @Mention autocomplete ──────────────────────────────
  function extractMentionedUids(text) {
    const uids = [];
    profilesCache.forEach((profile, uid) => {
      const name = profile.displayName;
      if (name && text.includes('@' + name)) uids.push(uid);
    });
    return uids;
  }

  function renderTextWithMentions(text, currentDisplayName) {
    let escaped = escapeHtml(text);
    const names = new Set();
    profilesCache.forEach((profile) => { if (profile.displayName) names.add(profile.displayName); });
    if (currentDisplayName) names.add(currentDisplayName);
    // Sort longest first to avoid partial matches
    const sorted = [...names].sort((a, b) => b.length - a.length);
    for (const name of sorted) {
      const escapedName = escapeHtml(name);
      const isSelf = name === currentDisplayName;
      const cls = `msg__mention${isSelf ? ' msg__mention--self' : ''}`;
      escaped = escaped.split('@' + escapedName).join(`<span class="${cls}">@${escapedName}</span>`);
    }
    return `<div class="msg__text">${escaped}</div>`;
  }

  function getActiveMentionMatch(value, cursorPos) {
    const textBefore = value.slice(0, cursorPos);
    const match = textBefore.match(/@([\w ]*)$/);
    if (!match) return null;
    return { partial: match[1].toLowerCase(), startIndex: cursorPos - match[0].length };
  }

  function getMentionCandidates(partial) {
    const results = [];
    profilesCache.forEach((profile, uid) => {
      if (uid === currentUid) return;
      const name = profile.displayName || '';
      if (!partial || name.toLowerCase().startsWith(partial) || name.toLowerCase().includes(partial)) {
        results.push({ uid, displayName: name, avatar: profile.avatar });
      }
    });
    results.sort((a, b) => {
      const ao = isUserOnline(a.uid) ? 0 : 1;
      const bo = isUserOnline(b.uid) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
    return results.slice(0, 8);
  }

  function showMentionDropdown(candidates) {
    if (!mentionDropdownEl) return;
    mentionDropdownEl.innerHTML = '';
    if (!candidates.length) { mentionDropdownEl.classList.add('hidden'); return; }
    mentionActiveIndex = 0;
    candidates.forEach((c, i) => {
      const item = document.createElement('div');
      item.className = 'mention-dropdown__item' + (i === 0 ? ' mention-dropdown__item--active' : '');
      item.setAttribute('role', 'option');
      item.dataset.displayName = c.displayName;
      const hasEmoji = c.avatar && AVATAR_OPTIONS.includes(c.avatar);
      const avatarEl = document.createElement('div');
      avatarEl.className = 'mention-dropdown__avatar';
      if (hasEmoji) {
        avatarEl.textContent = c.avatar;
      } else {
        avatarEl.style.background = getAvatarColor(c.displayName);
        avatarEl.style.color = '#fff';
        avatarEl.style.fontSize = '0.7rem';
        avatarEl.style.fontWeight = '700';
        avatarEl.textContent = getInitials(c.displayName);
      }
      const nameEl = document.createElement('span');
      nameEl.className = 'mention-dropdown__name';
      nameEl.textContent = c.displayName;
      item.appendChild(avatarEl);
      item.appendChild(nameEl);
      if (isUserOnline(c.uid)) {
        const dot = document.createElement('span');
        dot.className = 'mention-dropdown__online';
        item.appendChild(dot);
      }
      item.addEventListener('mousedown', (e) => { e.preventDefault(); insertMention(c.displayName); });
      mentionDropdownEl.appendChild(item);
    });
    mentionDropdownEl.classList.remove('hidden');
  }

  function hideMentionDropdown() {
    if (mentionDropdownEl) mentionDropdownEl.classList.add('hidden');
    mentionAnchorIndex = -1;
    mentionActiveIndex = -1;
  }

  function insertMention(displayName) {
    if (mentionAnchorIndex < 0) return;
    const cursorPos = input.selectionStart ?? input.value.length;
    const before = input.value.slice(0, mentionAnchorIndex);
    const after = input.value.slice(cursorPos);
    input.value = before + '@' + displayName + ' ' + after;
    const newCursor = mentionAnchorIndex + displayName.length + 2;
    input.setSelectionRange(newCursor, newCursor);
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    hideMentionDropdown();
    input.focus();
  }

  function updateMentionDropdown() {
    const cursorPos = input.selectionStart ?? input.value.length;
    const match = getActiveMentionMatch(input.value, cursorPos);
    if (!match) { hideMentionDropdown(); return; }
    mentionAnchorIndex = match.startIndex;
    showMentionDropdown(getMentionCandidates(match.partial));
  }

  function handleMentionKeydown(e) {
    if (!mentionDropdownEl || mentionDropdownEl.classList.contains('hidden')) return false;
    const items = mentionDropdownEl.querySelectorAll('.mention-dropdown__item');
    if (!items.length) return false;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      mentionActiveIndex = Math.min(mentionActiveIndex + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('mention-dropdown__item--active', i === mentionActiveIndex));
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      mentionActiveIndex = Math.max(mentionActiveIndex - 1, 0);
      items.forEach((el, i) => el.classList.toggle('mention-dropdown__item--active', i === mentionActiveIndex));
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      const active = items[mentionActiveIndex];
      if (active) { e.preventDefault(); insertMention(active.dataset.displayName); return true; }
    }
    if (e.key === 'Escape') { hideMentionDropdown(); return true; }
    return false;
  }

  // ── Direct Messages ────────────────────────────────────
  function getConversationId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
  }

  function updateDMHeader() {
    if (!currentDMPartnerUid) return;
    const profile = profilesCache.get(currentDMPartnerUid) || {};
    const name = profile.displayName || 'User';
    const avatar = profile.avatar;
    const online = isUserOnline(currentDMPartnerUid);
    if (dmUserNameEl) dmUserNameEl.textContent = name;
    if (dmUserStatusEl) dmUserStatusEl.textContent = online ? 'Online' : 'Offline';
    if (dmUserAvatarEl) {
      const dmAvUrl = profile.avatarUrl;
      if (dmAvUrl && isValidStorageUrl(dmAvUrl)) {
        dmUserAvatarEl.innerHTML = `<img src="${escapeHtml(dmAvUrl)}" alt="" class="user-avatar__img">`;
      } else {
        dmUserAvatarEl.innerHTML = '';
        dmUserAvatarEl.textContent = (avatar && AVATAR_OPTIONS.includes(avatar)) ? avatar : '\ud83d\udc64';
      }
      // Update or create presence dot
      const wrap = document.getElementById('dm-user-avatar-wrap');
      if (wrap) {
        let dot = wrap.querySelector('.dm-presence-dot');
        if (!dot) {
          dot = document.createElement('span');
          wrap.appendChild(dot);
        }
        dot.className = `dm-presence-dot${online ? '' : ' dm-presence-dot--offline'}`;
      }
    }
  }

  function renderDMMessages(snapshot, currentUser) {
    const atBottom = dmMessagesEl.scrollHeight - dmMessagesEl.scrollTop - dmMessagesEl.clientHeight < 150;
    dmMessagesEl.innerHTML = '';
    if (snapshot.empty) {
      dmMessagesEl.innerHTML = '<p class="dm-messages-empty">No messages yet. Say hello! 👋</p>';
      return;
    }
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const isOwn = currentUser && data.uid === currentUser.uid;
      const displayName = data.displayName || 'User';
      const time = data.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      let mediaContent;
      if (data.type === 'gif') {
        const gifUrl = isValidGiphyUrl(data.gifUrl || '') ? data.gifUrl : null;
        mediaContent = gifUrl
          ? `<img class="msg__gif" src="${escapeHtml(gifUrl)}" alt="GIF" loading="lazy">`
          : '<div class="msg__text">[GIF]</div>';
      } else if (data.type === 'sticker') {
        mediaContent = `<div class="msg__sticker">${escapeHtml(data.sticker || '')}</div>`;
      } else if (data.type === 'voice') {
        const safeUrl = isValidStorageUrl(data.audioUrl || '') ? data.audioUrl : '';
        const dur = typeof data.duration === 'number' ? formatDuration(data.duration) : '';
        mediaContent = safeUrl
          ? `<div class="msg__voice"><audio class="msg__audio" src="${escapeHtml(safeUrl)}" controls preload="none" aria-label="Voice message"></audio>${dur ? `<span class="msg__voice-duration">${escapeHtml(dur)}</span>` : ''}</div>`
          : '<div class="msg__text">[Voice message]</div>';
      } else if (data.type === 'photo') {
        const safeUrl = isValidStorageUrl(data.photoUrl || '') ? data.photoUrl : '';
        mediaContent = safeUrl
          ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer"><img class="msg__photo" src="${escapeHtml(safeUrl)}" alt="Photo" loading="lazy"></a>`
          : '<div class="msg__text">[Photo]</div>';
      } else if (data.type === 'photos') {
        const safeUrls = (data.photoUrls || []).filter(u => isValidStorageUrl(u));
        mediaContent = safeUrls.length
          ? `<div class="msg__photos">${safeUrls.map(u => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer"><img class="msg__photo" src="${escapeHtml(u)}" alt="Photo" loading="lazy"></a>`).join('')}</div>`
          : '<div class="msg__text">[Photos]</div>';
      } else {
        mediaContent = renderTextWithMentions(data.text || '', currentProfile.displayName);
      }

      const replyBlock = data.replyTo && typeof data.replyTo === 'object' && typeof data.replyTo.text === 'string'
        ? `<div class="msg__reply">
            <span class="msg__reply__name">${escapeHtml(String(data.replyTo.displayName || '').slice(0, 50))}</span>
            <span class="msg__reply__text">${escapeHtml(String(data.replyTo.text || '').slice(0, 120))}</span>
          </div>`
        : '';

      const reactionsHtml = buildReactionsBar(data.reactions, currentUser?.uid);

      const wrapper = document.createElement('div');
      wrapper.className = `msg ${isOwn ? 'msg--own' : 'msg--other'}`;
      if (isOwn) {
        wrapper.innerHTML = `<div class="msg__body"><div class="msg__bubble">${replyBlock}${mediaContent}<div class="msg__time">${escapeHtml(time)}</div></div>${reactionsHtml}</div>`;
      } else {
        const avatarHtml = renderAvatarHtml(data.avatar, data.avatarUrl, displayName);
        const bubbleStyle = data.uid ? getBubbleStyle(data.uid) : '';
        wrapper.innerHTML = `${avatarHtml}<div class="msg__content"><div class="msg__name">${escapeHtml(displayName)}</div><div class="msg__bubble" style="${bubbleStyle}">${replyBlock}${mediaContent}<div class="msg__time">${escapeHtml(time)}</div></div>${reactionsHtml}</div>`;
      }

      wrapper.dataset.messageId = doc.id;
      wrapper.dataset.senderUid = data.uid || '';
      if (doc.id === selectedDMMsgId) wrapper.classList.add('msg--selected');
      wrapper.querySelector('.msg__bubble').addEventListener('click', (e) => {
        e.stopPropagation();
        selectDMMessage(doc.id, data, isOwn);
      });
      const replyQuote = wrapper.querySelector('.msg__reply');
      if (replyQuote && data.replyTo?.messageId) {
        replyQuote.classList.add('msg__reply--linkable');
        replyQuote.addEventListener('click', (e) => {
          e.stopPropagation();
          scrollToDMMessage(data.replyTo.messageId);
        });
      }
      wrapper.querySelectorAll('.reaction-pill').forEach((pill) => {
        pill.addEventListener('click', () => toggleDMReaction(doc.id, pill.dataset.emoji, currentUser?.uid));
      });
      dmMessagesEl.appendChild(wrapper);
    });
    if (atBottom) dmMessagesEl.scrollTop = dmMessagesEl.scrollHeight;
  }

  function subscribeDMMessages(conversationId, user) {
    if (unsubscribeDMMessages) { unsubscribeDMMessages(); unsubscribeDMMessages = null; }
    dmMessagesEl.innerHTML = '<p class="dm-messages-empty">Loading\u2026</p>';
    unsubscribeDMMessages = db
      .collection('directMessages').doc(conversationId)
      .collection('messages').orderBy('createdAt', 'asc').limitToLast(100)
      .onSnapshot((snap) => renderDMMessages(snap, user));
  }

  async function sendDMMessage(text) {
    const user = auth.currentUser;
    if (!text || !user || !cachedIsAllowed || !currentDMConversationId || !currentDMPartnerUid) return;
    try {
      const convRef = db.collection('directMessages').doc(currentDMConversationId);
      const convSnap = await convRef.get();
      if (!convSnap.exists) {
        await convRef.set({
          participants: [user.uid, currentDMPartnerUid].sort(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessage: '',
        });
      }
      const dmMsgData = {
        text,
        uid: user.uid,
        displayName: currentProfile.displayName || user.displayName || user.email || 'User',
        avatar: currentProfile.avatar,
        avatarUrl: currentProfile.avatarUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (dmReplyTo) dmMsgData.replyTo = dmReplyTo;
      await convRef.collection('messages').add(dmMsgData);
      await convRef.update({
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessage: text.slice(0, 100),
      });
      clearDMReply();
      clearTypingStatus(user.uid);
    } catch (err) {
      console.error('DM send failed:', err);
    }
  }

  async function sendDMMedia(fields) {
    const user = auth.currentUser;
    if (!user || !cachedIsAllowed || !currentDMConversationId || !currentDMPartnerUid) return;
    try {
      const convRef = db.collection('directMessages').doc(currentDMConversationId);
      const convSnap = await convRef.get();
      if (!convSnap.exists) {
        await convRef.set({
          participants: [user.uid, currentDMPartnerUid].sort(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessage: '',
        });
      }
      await convRef.collection('messages').add({
        ...fields,
        uid: user.uid,
        displayName: currentProfile.displayName || user.displayName || user.email || 'User',
        avatar: currentProfile.avatar,
        avatarUrl: currentProfile.avatarUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await convRef.update({
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessage: String(fields.text || '').slice(0, 100),
      });
    } catch (err) {
      console.error('DM media send failed:', err);
    }
  }

  function openDM(partnerUid) {
    const user = auth.currentUser;
    if (!user || partnerUid === user.uid || !cachedIsAllowed) return;
    currentDMPartnerUid = partnerUid;
    currentDMConversationId = getConversationId(user.uid, partnerUid);
    // Clear unread for this conversation
    dmUnreadCounts.set(currentDMConversationId, 0);
    updateChatsBadge();
    usersPanelEl.classList.add('hidden');
    updateDMHeader();
    subscribeDMMessages(currentDMConversationId, user);
    subscribeDMTyping(currentDMConversationId, user.uid);
    dmPanelEl.classList.remove('hidden');
    updateDMVoiceBtnVisibility();
    dmInputEl?.focus();
  }

  function closeDMPanel() {
    if (unsubscribeDMMessages) { unsubscribeDMMessages(); unsubscribeDMMessages = null; }
    if (unsubscribeDMTyping) { unsubscribeDMTyping(); unsubscribeDMTyping = null; }
    if (currentUid && currentTypingRoomId === currentDMConversationId) clearTypingStatus(currentUid);
    currentDMPartnerUid = null;
    currentDMConversationId = null;
    dmPanelEl.classList.add('hidden');
    if (dmMessagesEl) dmMessagesEl.innerHTML = '';
    clearDMSelection();
    clearDMReply();
    if (isRecordingForDM && mediaRecorder && mediaRecorder.state !== 'inactive') cancelRecording();
  }

  // ── Users panel ────────────────────────────────────────
  function renderChatsList() {
    if (!chatsPanelListEl) return;
    chatsPanelListEl.innerHTML = '';

    // Group Chat row (always at top)
    const groupItem = document.createElement('div');
    groupItem.className = 'chat-list-item';
    groupItem.innerHTML = `
      <div class="chat-list-item__avatar-wrap">
        <div class="chat-list-item__avatar chat-list-item__avatar--group">👪</div>
      </div>
      <div class="chat-list-item__info">
        <div class="chat-list-item__row">
          <span class="chat-list-item__name">Group Chat</span>
        </div>
        <div class="chat-list-item__preview">All family members</div>
      </div>`;
    groupItem.addEventListener('click', () => chatsPanelEl.classList.add('hidden'));
    chatsPanelListEl.appendChild(groupItem);

    // DM conversations sorted by most recent
    const convs = [...dmConversationsCache.values()].sort((a, b) => {
      const at = a.updatedAt?.toMillis?.() || 0;
      const bt = b.updatedAt?.toMillis?.() || 0;
      return bt - at;
    });

    if (convs.length > 0) {
      const sep = document.createElement('div');
      sep.className = 'chats-panel__sep';
      sep.textContent = 'Direct Messages';
      chatsPanelListEl.appendChild(sep);
    }

    convs.forEach((conv) => {
      const partnerUid = (conv.participants || []).find((p) => p !== currentUid);
      if (!partnerUid) return;
      const profile = profilesCache.get(partnerUid) || {};
      const online = isUserOnline(partnerUid);
      const item = document.createElement('div');
      item.className = 'chat-list-item';
      const hasEmoji = profile.avatar && AVATAR_OPTIONS.includes(profile.avatar);
      let avatarHtml;
      if (hasEmoji) {
        avatarHtml = `<div class="chat-list-item__avatar">${escapeHtml(profile.avatar)}</div>`;
      } else {
        const bg = getAvatarColor(profile.displayName || '');
        avatarHtml = `<div class="chat-list-item__avatar chat-list-item__avatar--initials" style="background:${bg}">${escapeHtml(getInitials(profile.displayName || ''))}</div>`;
      }
      const lastMsg = conv.lastMessage ? String(conv.lastMessage).slice(0, 60) : 'No messages yet';
      const time = conv.updatedAt ? formatChatTime(conv.updatedAt.toDate?.() || new Date(conv.updatedAt)) : '';
      const unread = dmUnreadCounts.get(conv.id) || 0;
      item.innerHTML = `
        <div class="chat-list-item__avatar-wrap">
          ${avatarHtml}
          <span class="chat-list-item__presence${online ? '' : ' chat-list-item__presence--offline'}"></span>
        </div>
        <div class="chat-list-item__info">
          <div class="chat-list-item__row">
            <span class="chat-list-item__name">${escapeHtml(profile.displayName || 'User')}</span>
            <span class="chat-list-item__time">${escapeHtml(time)}</span>
          </div>
          <div class="chat-list-item__bottom">
            <span class="chat-list-item__preview">${escapeHtml(lastMsg)}</span>
            ${unread > 0 ? `<span class="chat-list-item__unread">${unread > 99 ? '99+' : unread}</span>` : ''}
          </div>
        </div>`;
      item.addEventListener('click', () => {
        chatsPanelEl.classList.add('hidden');
        openDM(partnerUid);
      });
      chatsPanelListEl.appendChild(item);
    });

    if (convs.length === 0) {
      const noConvs = document.createElement('p');
      noConvs.className = 'chats-panel__empty';
      noConvs.textContent = 'No direct messages yet. Tap the pencil icon to start one.';
      chatsPanelListEl.appendChild(noConvs);
    }
  }

  function renderUsersList() {
    if (!usersPanelListEl) return;
    usersPanelListEl.innerHTML = '';
    const users = [];
    profilesCache.forEach((profile, uid) => {
      if (uid === currentUid) return;
      users.push({ uid, ...profile });
    });
    if (!users.length) {
      usersPanelListEl.innerHTML = '<p class="users-panel__empty">No other users found.</p>';
      return;
    }
    users.sort((a, b) => {
      const ao = isUserOnline(a.uid) ? 0 : 1;
      const bo = isUserOnline(b.uid) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
    users.forEach((u) => {
      const online = isUserOnline(u.uid);
      const item = document.createElement('div');
      item.className = 'user-list-item';
      const hasEmoji = u.avatar && AVATAR_OPTIONS.includes(u.avatar);
      let avatarInner;
      if (hasEmoji) {
        avatarInner = `<span class="user-list-item__emoji">${escapeHtml(u.avatar)}</span>`;
      } else {
        const bg = getAvatarColor(u.displayName || '');
        avatarInner = `<span class="user-list-item__avatar--initials" style="background:${bg};color:#fff;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">${escapeHtml(getInitials(u.displayName || ''))}</span>`;
      }
      item.innerHTML = `
        <div class="user-list-item__avatar">
          ${avatarInner}
          <span class="user-list-item__presence${online ? '' : ' user-list-item__presence--offline'}"></span>
        </div>
        <div class="user-list-item__info">
          <div class="user-list-item__name">${escapeHtml(u.displayName || 'User')}</div>
          <div class="user-list-item__status">${online ? 'Online' : 'Offline'}</div>
        </div>
        <button type="button" class="user-list-item__dm-btn">Message</button>`;
      item.querySelector('.user-list-item__dm-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openDM(u.uid);
      });
      item.addEventListener('click', () => openDM(u.uid));
      usersPanelListEl.appendChild(item);
    });
  }

  usersBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasHidden = usersPanelEl.classList.contains('hidden');
    usersPanelEl.classList.toggle('hidden', !wasHidden);
    if (wasHidden) renderUsersList();
  });
  document.getElementById('users-panel-close-btn').addEventListener('click', () => usersPanelEl.classList.add('hidden'));
  usersPanelEl.addEventListener('click', (e) => { if (e.target === usersPanelEl) usersPanelEl.classList.add('hidden'); });

  chatsBtnEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasHidden = chatsPanelEl.classList.contains('hidden');
    chatsPanelEl.classList.toggle('hidden', !wasHidden);
    if (wasHidden) renderChatsList();
  });
  document.getElementById('chats-panel-close-btn').addEventListener('click', () => chatsPanelEl.classList.add('hidden'));
  chatsPanelEl.addEventListener('click', (e) => { if (e.target === chatsPanelEl) chatsPanelEl.classList.add('hidden'); });
  newDmBtnEl.addEventListener('click', () => {
    chatsPanelEl.classList.add('hidden');
    renderUsersList();
    usersPanelEl.classList.remove('hidden');
  });

  dmBackBtn.addEventListener('click', closeDMPanel);

  dmFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = dmInputEl.value.trim();
    if (!text) return;
    dmInputEl.value = '';
    dmInputEl.style.height = 'auto';
    await sendDMMessage(text);
  });

  dmInputEl.addEventListener('input', () => {
    dmInputEl.style.height = 'auto';
    dmInputEl.style.height = dmInputEl.scrollHeight + 'px';
    updateDMVoiceBtnVisibility();
    const uid = auth.currentUser?.uid;
    if (uid && cachedIsAllowed && currentDMConversationId && dmInputEl.value.trim()) {
      handleTypingInput(uid, currentDMConversationId);
    }
  });

  dmInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer: coarse)').matches) {
      e.preventDefault();
      dmFormEl.requestSubmit();
    }
  });

  // Visibility change for presence
  document.addEventListener('visibilitychange', () => {
    if (!currentUid) return;
    if (document.hidden) {
      setUserPresence(currentUid, false);
    } else {
      setUserPresence(currentUid, true);
    }
  });

  window.addEventListener('beforeunload', () => {
    if (currentUid) setUserPresence(currentUid, false);
  });

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

  function updateDMVoiceBtnVisibility() {
    if (!voiceSupported) return;
    const hasText = dmInputEl.value.trim().length > 0;
    dmVoiceBtnEl.classList.toggle('hidden', hasText);
    dmSendBtnEl.classList.toggle('hidden', !hasText);
  }

  function showRecordingUI(isDM = false) {
    if (isDM) {
      dmFormEl.classList.add('hidden');
      dmVoiceRecordingUiEl.classList.remove('hidden');
    } else {
      form.classList.add('hidden');
      voiceRecordingUi.classList.remove('hidden');
    }
  }

  function hideRecordingUI() {
    voiceRecordingUi.classList.add('hidden');
    form.classList.remove('hidden');
    dmVoiceRecordingUiEl.classList.add('hidden');
    dmFormEl.classList.remove('hidden');
    isRecordingForDM = false;
    updateVoiceBtnVisibility();
    updateDMVoiceBtnVisibility();
  }

  async function startRecording(isDM = false) {
    if (!cachedIsAllowed || !voiceSupported) return;
    try {
      closeAllPickers();
      isRecordingForDM = isDM;
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
      showRecordingUI(isDM);
      const timerEl = isDM ? dmVoiceTimerEl : voiceTimer;
      timerEl.textContent = '0:00';
      let elapsed = 0;
      recordingTimerInterval = setInterval(() => {
        elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        timerEl.textContent = formatDuration(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) stopAndSendRecording();
      }, 500);
    } catch (err) {
      isRecordingForDM = false;
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
    if (!isRecordingForDM) messageStatus.textContent = 'Sending…';
    const wasDM = isRecordingForDM;
    try {
      const snapshot = await storageRef.put(blob, { contentType: mimeType });
      const audioUrl = await snapshot.ref.getDownloadURL();
      if (wasDM) {
        const fields = { type: 'voice', audioUrl, duration, text: '[Voice message]' };
        if (dmReplyTo) fields.replyTo = dmReplyTo;
        await sendDMMedia(fields);
        clearDMReply();
      } else {
        const voiceData = {
          type: 'voice',
          audioUrl,
          duration,
          text: '[Voice message]',
          uid: user.uid,
          displayName: currentProfile.displayName || user.displayName || user.email || 'Family',
          avatar: currentProfile.avatar,
          avatarUrl: currentProfile.avatarUrl,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        if (replyTo) voiceData.replyTo = replyTo;
        await db.collection('messages').add(voiceData);
        messageStatus.textContent = '';
        clearReply();
      }
    } catch (err) {
      if (!wasDM) messageStatus.textContent = `Voice message failed: ${err.message}`;
      else console.error('DM voice message failed:', err);
    }
  }

  async function sendPhotoMessage(file, isDM = false) {
    const user = auth.currentUser;
    if (!user || !cachedIsAllowed) return;
    if (!file.type.startsWith('image/')) {
      messageStatus.textContent = 'Please select an image file.';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      messageStatus.textContent = 'Photo must be under 10 MB.';
      return;
    }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `${Date.now()}.${ext || 'jpg'}`;
    const storageRef = storage.ref(`photos/${user.uid}/${fileName}`);
    const statusEl = isDM ? dmMessageStatus : messageStatus;
    statusEl.textContent = 'Uploading photo…';
    try {
      const snapshot = await storageRef.put(file, { contentType: file.type || 'image/jpeg' });
      const photoUrl = await snapshot.ref.getDownloadURL();
      const photoData = {
        type: 'photo',
        photoUrl,
        text: '[Photo]',
        uid: user.uid,
        displayName: currentProfile.displayName || user.displayName || user.email || 'Family',
        avatar: currentProfile.avatar,
        avatarUrl: currentProfile.avatarUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (isDM) {
        if (!currentDMConversationId || !currentDMPartnerUid) return;
        const convRef = db.collection('directMessages').doc(currentDMConversationId);
        const convSnap = await convRef.get();
        if (!convSnap.exists) {
          await convRef.set({
            participants: [user.uid, currentDMPartnerUid].sort(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: '',
          });
        }
        await convRef.collection('messages').add(photoData);
        await convRef.update({
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessage: '[Photo]',
        });
        dmMessageStatus.textContent = '';
      } else {
        if (replyTo) photoData.replyTo = replyTo;
        await db.collection('messages').add(photoData);
        clearReply();
        messageStatus.textContent = '';
      }
    } catch (err) {
      statusEl.textContent = `Photo upload failed: ${err.message}`;
    }
  }

  voiceBtn.addEventListener('click', () => startRecording(false));
  voiceCancelBtn.addEventListener('click', cancelRecording);
  voiceSendBtn.addEventListener('click', stopAndSendRecording);
  dmVoiceBtnEl.addEventListener('click', () => startRecording(true));
  dmVoiceCancelBtnEl.addEventListener('click', cancelRecording);
  dmVoiceSendBtnEl.addEventListener('click', stopAndSendRecording);
  updateVoiceBtnVisibility();

  // ── Photo multi-select preview ───────────────────────────
  function showPhotoPreview(files, isDM) {
    const pending = isDM ? dmPendingPhotos : pendingPhotos;
    Array.from(files).forEach(f => pending.push({ file: f, url: URL.createObjectURL(f) }));
    renderPhotoPreview(isDM);
  }

  function renderPhotoPreview(isDM) {
    const pending = isDM ? dmPendingPhotos : pendingPhotos;
    const list = document.getElementById(isDM ? 'dm-photo-preview-list' : 'photo-preview-list');
    const strip = document.getElementById(isDM ? 'dm-photo-preview-strip' : 'photo-preview-strip');
    const countEl = document.getElementById(isDM ? 'dm-photo-preview-count' : 'photo-preview-count');
    if (pending.length === 0) { clearPhotoPreview(isDM); return; }
    list.innerHTML = '';
    pending.forEach(({ url }, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'photo-preview-thumb';
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Photo ${index + 1}`;
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'photo-preview-thumb__remove';
      removeBtn.setAttribute('aria-label', 'Remove photo');
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => {
        URL.revokeObjectURL(pending[index].url);
        pending.splice(index, 1);
        renderPhotoPreview(isDM);
      });
      thumb.appendChild(img);
      thumb.appendChild(removeBtn);
      list.appendChild(thumb);
    });
    countEl.textContent = pending.length === 1 ? '1 photo' : `${pending.length} photos`;
    strip.classList.remove('hidden');
  }

  function clearPhotoPreview(isDM) {
    const pending = isDM ? dmPendingPhotos : pendingPhotos;
    const list = document.getElementById(isDM ? 'dm-photo-preview-list' : 'photo-preview-list');
    const strip = document.getElementById(isDM ? 'dm-photo-preview-strip' : 'photo-preview-strip');
    pending.forEach(({ url }) => URL.revokeObjectURL(url));
    pending.length = 0;
    list.innerHTML = '';
    strip.classList.add('hidden');
  }

  async function sendPendingPhotos(isDM) {
    const pending = isDM ? dmPendingPhotos : pendingPhotos;
    const sendBtnEl = document.getElementById(isDM ? 'dm-photo-preview-send' : 'photo-preview-send');
    if (pending.length === 0) return;
    sendBtnEl.disabled = true;
    const files = pending.map(p => p.file);
    clearPhotoPreview(isDM);
    await sendPhotosBulk(files, isDM);
    sendBtnEl.disabled = false;
  }

  async function sendPhotosBulk(files, isDM) {
    const user = auth.currentUser;
    if (!user || !cachedIsAllowed) return;
    const valid = files.filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024);
    if (!valid.length) return;
    const statusEl = isDM ? dmMessageStatus : messageStatus;
    statusEl.textContent = `Uploading ${valid.length === 1 ? 'photo' : `${valid.length} photos`}…`;
    try {
      let uploaded = 0;
      const uploads = valid.map((file) => {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || 'jpg'}`;
        const ref = storage.ref(`photos/${user.uid}/${fileName}`);
        return ref.put(file, { contentType: file.type || 'image/jpeg' }).then(snap => {
          uploaded++;
          if (valid.length > 1) statusEl.textContent = `Uploading… ${uploaded}/${valid.length}`;
          return snap.ref.getDownloadURL();
        });
      });
      const photoUrls = await Promise.all(uploads);
      const isSingle = photoUrls.length === 1;
      const fields = isSingle
        ? { type: 'photo', photoUrl: photoUrls[0], text: '[Photo]' }
        : { type: 'photos', photoUrls, text: '[Photos]' };
      if (isDM) {
        if (dmReplyTo) fields.replyTo = dmReplyTo;
        await sendDMMedia(fields);
        clearDMReply();
        dmMessageStatus.textContent = '';
      } else {
        const msgData = {
          ...fields,
          uid: user.uid,
          displayName: currentProfile.displayName || user.displayName || user.email || 'Family',
          avatar: currentProfile.avatar,
          avatarUrl: currentProfile.avatarUrl,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        if (replyTo) msgData.replyTo = replyTo;
        await db.collection('messages').add(msgData);
        clearReply();
        messageStatus.textContent = '';
      }
    } catch (err) {
      const statusEl = isDM ? dmMessageStatus : messageStatus;
      statusEl.textContent = `Photo upload failed: ${err.message}`;
    }
  }

  document.getElementById('photo-preview-cancel').addEventListener('click', () => clearPhotoPreview(false));
  document.getElementById('photo-preview-send').addEventListener('click', () => sendPendingPhotos(false));
  document.getElementById('dm-photo-preview-cancel').addEventListener('click', () => clearPhotoPreview(true));
  document.getElementById('dm-photo-preview-send').addEventListener('click', () => sendPendingPhotos(true));

  function togglePhotoSourceMenu(menuEl, btnEl) {
    const isHidden = menuEl.classList.contains('hidden');
    // Close both menus first
    photoSourceMenuEl.classList.add('hidden');
    dmPhotoSourceMenuEl.classList.add('hidden');
    if (isHidden) {
      menuEl.classList.remove('hidden');
      // Close on outside click
      const onOutside = (e) => {
        if (!btnEl.contains(e.target) && !menuEl.contains(e.target)) {
          menuEl.classList.add('hidden');
          document.removeEventListener('click', onOutside, true);
        }
      };
      document.addEventListener('click', onOutside, true);
    }
  }

  photoBtnEl.addEventListener('click', () => togglePhotoSourceMenu(photoSourceMenuEl, photoBtnEl));
  document.getElementById('photo-source-camera').addEventListener('click', () => {
    photoSourceMenuEl.classList.add('hidden');
    cameraInputEl.click();
  });
  document.getElementById('photo-source-library').addEventListener('click', () => {
    photoSourceMenuEl.classList.add('hidden');
    photoInputEl.click();
  });
  photoInputEl.addEventListener('change', (e) => {
    if (e.target.files.length) showPhotoPreview(e.target.files, false);
    photoInputEl.value = '';
  });
  cameraInputEl.addEventListener('change', (e) => {
    if (e.target.files.length) showPhotoPreview(e.target.files, false);
    cameraInputEl.value = '';
  });

  dmPhotoBtnEl.addEventListener('click', () => togglePhotoSourceMenu(dmPhotoSourceMenuEl, dmPhotoBtnEl));
  document.getElementById('dm-photo-source-camera').addEventListener('click', () => {
    dmPhotoSourceMenuEl.classList.add('hidden');
    dmCameraInputEl.click();
  });
  document.getElementById('dm-photo-source-library').addEventListener('click', () => {
    dmPhotoSourceMenuEl.classList.add('hidden');
    dmPhotoInputEl.click();
  });
  dmPhotoInputEl.addEventListener('change', (e) => {
    if (e.target.files.length) showPhotoPreview(e.target.files, true);
    dmPhotoInputEl.value = '';
  });
  dmCameraInputEl.addEventListener('change', (e) => {
    if (e.target.files.length) showPhotoPreview(e.target.files, true);
    dmCameraInputEl.value = '';
  });

  // ── Auth state ────────────────────────────────────────
  auth.onAuthStateChanged(async (user) => {
    if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
    if (unsubscribePending) { unsubscribePending(); unsubscribePending = null; }
    if (unsubscribeProfiles) { unsubscribeProfiles(); unsubscribeProfiles = null; }
    if (unsubscribePresence) { unsubscribePresence(); unsubscribePresence = null; }
    if (unsubscribeTyping) { unsubscribeTyping(); unsubscribeTyping = null; }
    if (unsubscribeDMConversations) { unsubscribeDMConversations(); unsubscribeDMConversations = null; }
    if (seenObserver) { seenObserver.disconnect(); seenObserver = null; }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') cancelRecording();

    // Clean up presence/typing for the previous user
    if (currentUid) {
      stopPresence(currentUid);
      clearTypingStatus(currentUid);
      currentUid = null;
    }
    closeDMPanel();
    chatsPanelEl.classList.add('hidden');
    usersPanelEl.classList.add('hidden');
    presenceCache.clear();
    profilesCache.clear();
    dmConversationsCache.clear();
    dmUnreadCounts.clear();
    dmConversationsLoaded = false;
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

    currentUid = user.uid;
    usersBtnEl.classList.remove('hidden');
    chatsBtnEl.classList.remove('hidden');

    unsubscribeProfiles = db.collection('userProfiles').onSnapshot((snap) => {
      snap.docs.forEach((doc) => profilesCache.set(doc.id, doc.data()));
      // Start presence after profiles load so displayName is set
      if (!presenceHeartbeatInterval) startPresence(user.uid);
    });

    subscribePresence();
    subscribeDMConversations(user.uid);
    subscribeMainTyping(user.uid);

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
