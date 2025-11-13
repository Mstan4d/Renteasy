// js/js/messages.js
// Unified role-aware messaging front-end (tenant/landlord/manager/admin)
// Place at: js/js/messages.js

(function () {
  // Helper: safe get element
  const $ = (id) => document.getElementById(id);

  // DOM elements (some pages may omit optional ones — guard accordingly)
  const conversationListEl = $('conversationList');
  const chatWindowEl = $('chatWindow');
  const chatFormEl = $('chatForm');
  const chatInputEl = $('chatInput');
  const chatAttachmentEl = $('chatAttachment');
  const chatWithEl = $('chatWith');
  const participantStatusEl = $('participantStatus'); // optional
  const unreadBadgeEl = $('unreadBadge');
  const openListingBtn = $('openListingBtn') || $('openListing'); // optional id variants
  const notifyAudio = $('notifySound');

  // Current user (app should set these in sessionStorage)
  const currentUser = {
    id: sessionStorage.getItem('userId') || ('guest-' + Math.floor(Math.random() * 1000000)),
    name: sessionStorage.getItem('userName') || 'Guest',
    role: sessionStorage.getItem('role') || 'tenant' // tenant|landlord|manager|admin
  };

  // mark presence (small TTL) so UI can show online
  (function heartbeatPresence() {
    try {
      const u = JSON.parse(localStorage.getItem('onlineUsers') || '{}');
      u[currentUser.id] = { lastSeen: Date.now(), name: currentUser.name, role: currentUser.role };
      localStorage.setItem('onlineUsers', JSON.stringify(u));
      setInterval(() => {
        const uu = JSON.parse(localStorage.getItem('onlineUsers') || '{}');
        uu[currentUser.id] = { lastSeen: Date.now(), name: currentUser.name, role: currentUser.role };
        localStorage.setItem('onlineUsers', JSON.stringify(uu));
      }, 20000);
    } catch (e) { /* ignore */ }
  })();

  // ---- state ----
  let conversations = loadConversations();
  let activeConversation = null;

  // ---- utils ----
  function loadConversations() {
    try {
      return JSON.parse(localStorage.getItem('conversations') || '[]');
    } catch (e) {
      console.warn('Corrupt conversations in localStorage, resetting.');
      localStorage.removeItem('conversations');
      return [];
    }
  }
  function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
    // bump an aux key so other tabs listening to storage can react
    try { localStorage.setItem('convos_updated_at', Date.now()); } catch (e) {}
    updateUnreadBadge();
  }
  function genId(prefix = 'ID') {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 90000).toString(36);
  }
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }
  function timeAgo(ts) {
    const t = typeof ts === 'number' ? ts : Date.parse(ts);
    const diff = Date.now() - t;
    if (diff < 60000) return 'moments ago';
    if (diff < 3600000) return Math.round(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.round(diff / 3600000) + ' hr ago';
    return new Date(t).toLocaleString();
  }
  function onlineUsers() {
    try { return JSON.parse(localStorage.getItem('onlineUsers') || '{}'); } catch (e) { return {}; }
  }

  // read key for role: used inside message.readBy object
  function readKeyForRole(role) {
    if (role === 'tenant') return 'tenant';
    if (role === 'landlord') return 'landlord';
    if (role === 'manager') return 'manager';
    if (role === 'admin') return 'admin';
    return 'tenant';
  }

  // manager visibility rule: managers see convos related to assignedProperties or if included participant
  function managerCanSee(conv) {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role !== 'manager') return true;
    const assigned = JSON.parse(sessionStorage.getItem('assignedProperties') || '[]');
    if (!assigned || assigned.length === 0) {
      return conv.participants.some(p => p.id === currentUser.id);
    }
    // match by listingId, conv.state or conv.lga if present
    return assigned.some(a => {
      if (!a) return false;
      if (conv.listingId && String(conv.listingId) === String(a)) return true;
      if (conv.state && String(conv.state).toLowerCase() === String(a).toLowerCase()) return true;
      if (conv.lga && String(conv.lga).toLowerCase() === String(a).toLowerCase()) return true;
      return false;
    }) || conv.participants.some(p => p.id === currentUser.id);
  }

  // ---- rendering conversations list ----
  function renderConversations() {
    conversations = loadConversations();
    if (!conversationListEl) return;
    conversationListEl.innerHTML = '';

    const visible = conversations.filter(conv => {
      if (currentUser.role === 'admin') return true;
      if (currentUser.role === 'manager') return managerCanSee(conv);
      // tenant/landlord see convos where they are participant
      return conv.participants.some(p => p.id === currentUser.id);
    });

    // optional summary element (if exists)
    const convoSummaryEl = $('convoSummary');
    if (convoSummaryEl) convoSummaryEl.textContent = `${visible.length} conversations`;

    visible.forEach(conv => {
      const li = document.createElement('li');
      li.dataset.id = conv.id;
      // create participant display: name (roleTag)
      const names = conv.participants.map(p => `${escapeHtml(p.name)}${p.role === 'manager' ? ' (mgr)' : p.role === 'admin' ? ' (admin)' : ''}`).join(' • ');
      // unread count for this user
      const key = readKeyForRole(currentUser.role);
      const unread = conv.messages.reduce((s, m) => s + ((m.readBy && m.readBy[key]) ? 0 : 1), 0);

      li.innerHTML = `<div class="left"><strong>${names}</strong><div class="small muted">${conv.listingId ? 'Listing: ' + escapeHtml(conv.listingId) : 'General'}</div></div>
                      <div class="right">${unread ? `<span class="badge">${unread}</span>` : ''}</div>`;
      li.addEventListener('click', () => openConversation(conv.id));
      if (activeConversation && activeConversation.id === conv.id) li.classList.add('active');
      conversationListEl.appendChild(li);
    });

    updateUnreadBadge();
  }

  // ---- open a conversation in UI ----
  function openConversation(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    activeConversation = conv;
    renderActiveConversation();
    markConversationRead(conv);
    renderConversations();
    // show link to listing if button exists
    const btn = openListingBtn;
    if (btn) {
      if (conv.listingId) {
        btn.style.display = 'inline-block';
        btn.onclick = () => {
          // go to listing details (ensure your listing page uses listings.html?listing=ID or similar)
          window.location.href = `listings.html?listing=${encodeURIComponent(conv.listingId)}`;
        };
      } else {
        btn.style.display = 'none';
      }
    }
  }

  function renderActiveConversation() {
    if (!chatWindowEl) return;
    chatWindowEl.innerHTML = '';
    if (!activeConversation) {
      if (chatWithEl) chatWithEl.textContent = 'Select a conversation';
      if (participantStatusEl) participantStatusEl.textContent = '';
      if (chatFormEl) chatFormEl.style.display = 'none';
      return;
    }

    // header
    const others = activeConversation.participants.filter(p => p.id !== currentUser.id);
    const headerName = others.map(p => p.name + (p.role === 'manager' ? ' (mgr)' : p.role === 'admin' ? ' (admin)' : '')).join(' & ');
    if (chatWithEl) chatWithEl.textContent = headerName || activeConversation.participants.map(p => p.name).join(' & ');

    // participant status
    if (participantStatusEl) {
      const stat = others.map(p => {
        const u = onlineUsers()[p.id];
        if (u && (Date.now() - u.lastSeen) < 90000) return `${p.name} — Online`;
        if (u) return `${p.name} — last seen ${timeAgo(u.lastSeen)}`;
        return p.name;
      }).join(' • ');
      participantStatusEl.textContent = stat;
    }

    // messages
    activeConversation.messages.forEach(msg => {
      const wrapper = document.createElement('div');
      wrapper.className = 'message ' + (msg.senderId === currentUser.id ? 'me' : 'them');

      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      if (msg.text) bubble.appendChild(document.createTextNode(msg.text));

      // attachments (image/video)
      if (msg.attachment) {
        const at = msg.attachment.toString().toLowerCase();
        if (at.endsWith('.mp4') || at.includes('video')) {
          const v = document.createElement('video');
          v.src = msg.attachment; v.controls = true; v.className = 'attachment';
          bubble.appendChild(document.createElement('br'));
          bubble.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = msg.attachment; img.className = 'attachment';
          bubble.appendChild(document.createElement('br'));
          bubble.appendChild(img);
        }
      }

      // meta (timestamp + read receipt)
      const meta = document.createElement('div');
      meta.className = 'meta';
      const ts = document.createElement('span');
      ts.className = 'timestamp';
      ts.textContent = timeAgo(msg.timestamp);
      meta.appendChild(ts);

      // simplistic read indicator for sender
      if (msg.senderId === currentUser.id) {
        const anyRead = Object.values(msg.readBy || {}).some(v => v === true);
        const receipt = document.createElement('span');
        receipt.className = 'read-receipt';
        receipt.textContent = anyRead ? ' ✓' : ' ⏺';
        meta.appendChild(receipt);
      }

      bubble.appendChild(meta);

      // highlight unread for manager/admin roles
      if ((currentUser.role === 'manager' && !(msg.readBy && msg.readBy.manager)) ||
          (currentUser.role === 'admin' && !(msg.readBy && msg.readBy.admin))) {
        bubble.classList.add('unread-highlight');
      }

      wrapper.appendChild(bubble);
      chatWindowEl.appendChild(wrapper);
    });

    chatWindowEl.scrollTop = chatWindowEl.scrollHeight;

    // show/hide form: only tenant and landlord can send; manager/admin are view-only
    if (chatFormEl) {
      if (currentUser.role === 'tenant' || currentUser.role === 'landlord') {
        chatFormEl.style.display = 'flex';
      } else {
        chatFormEl.style.display = 'none';
      }
    }
  }

  // mark conversation messages as read for current role
  function markConversationRead(conv) {
    if (!conv) return;
    const key = readKeyForRole(currentUser.role);
    let changed = false;
    conv.messages.forEach(m => {
      m.readBy = m.readBy || {};
      if (!m.readBy[key]) {
        m.readBy[key] = true;
        changed = true;
      }
    });
    if (changed) saveConversations();
  }

  // send (push) message into activeConversation
  function pushMessage(text, attachmentData) {
    if (!activeConversation) return;
    const msg = {
      id: genId('MSG'),
      senderId: currentUser.id,
      text: text || '',
      attachment: attachmentData || null,
      timestamp: new Date().toISOString(),
      readBy: {}
    };
    // sender auto-marks their read key true
    const key = readKeyForRole(currentUser.role);
    msg.readBy[key] = true;

    activeConversation.messages.push(msg);
    saveConversations();
    renderActiveConversation();
    renderConversations();
    dispatchLocalStorageEvent();

    // simulated landlord reply (kept per your request) — only if sender is tenant
    if (currentUser.role === 'tenant') {
      setTimeout(() => {
        const reply = {
          id: genId('MSG'),
          senderId: activeConversation.participants.find(p => p.role === 'landlord')?.id || 'Landlord-' + Math.floor(Math.random()*9999),
          text: 'Thanks — please call me for details.',
          attachment: null,
          timestamp: new Date().toISOString(),
          readBy: {}
        };
        activeConversation.messages.push(reply);
        saveConversations();
        renderActiveConversation();
        renderConversations();
        dispatchLocalStorageEvent();
      }, 3500);
    }
  }

  // form submit handling (if form exists)
  if (chatFormEl) {
    chatFormEl.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeConversation) return alert('Select a conversation first.');
      if (!(currentUser.role === 'tenant' || currentUser.role === 'landlord')) {
        return alert('Only tenants and landlords may send messages. Managers/Admins are view-only.');
      }
      const text = (chatInputEl && chatInputEl.value || '').trim();
      const hasFile = chatAttachmentEl && chatAttachmentEl.files && chatAttachmentEl.files.length > 0;
      if (!text && !hasFile) return;

      if (hasFile) {
        const f = chatAttachmentEl.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          pushMessage(text, ev.target.result);
        };
        reader.readAsDataURL(f);
      } else {
        pushMessage(text, null);
      }

      if (chatInputEl) chatInputEl.value = '';
      if (chatAttachmentEl) chatAttachmentEl.value = '';
    });
  }

  // typing indicator (optional elements)
  const typingIndicatorEl = $('typingIndicator');
  let typingTimeout = null;
  if (chatInputEl) {
    chatInputEl.addEventListener('input', () => {
      if (!typingIndicatorEl) return;
      typingIndicatorEl.style.display = 'block';
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => { typingIndicatorEl.style.display = 'none'; }, 1800);
    });
  }

  // create/open conversation from listing page params
  function autoCreateFromURL() {
    const params = new URLSearchParams(window.location.search);
    const listing = params.get('listing') || params.get('propertyId') || params.get('property');
    const landlordParam = params.get('landlord') || params.get('landlordId') || params.get('landlordName');

    if (!listing) {
      renderConversations();
      renderActiveConversation();
      return;
    }

    // try to build participants array: tenant is currentUser; landlord find in local users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    let landlordObj = users.find(u => u.id === landlordParam || u.name === landlordParam) || { id: landlordParam || 'landlord-' + Math.floor(Math.random()*9999), name: landlordParam || 'Landlord', role: 'landlord' };
    const tenantObj = { id: currentUser.id, name: currentUser.name, role: currentUser.role };

    // see if conversation already exists for listing between these two
    let conv = conversations.find(c => String(c.listingId) === String(listing) &&
      c.participants.some(p => p.id === landlordObj.id) && c.participants.some(p => p.id === tenantObj.id));
    if (!conv) {
      conv = {
        id: genId('CONV'),
        listingId: listing,
        state: params.get('state') || null,
        lga: params.get('lga') || null,
        participants: [tenantObj, landlordObj],
        messages: []
      };
      // try attach manager participant if assigned in users data
      const assignedKeys = JSON.parse(sessionStorage.getItem('assignedProperties') || '[]');
      if (Array.isArray(assignedKeys) && assignedKeys.includes(listing)) {
        const mgr = users.find(u => u.role === 'manager' && Array.isArray(u.assignedProperties) && u.assignedProperties.includes(listing));
        if (mgr) conv.participants.push(mgr);
      }
      conversations.push(conv);
      saveConversations();
    }

    // open it
    openConversation(conv.id);
  }

  // storage event listener (other tabs)
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'conversations' || ev.key === 'convos_updated_at') {
      conversations = loadConversations();
      // if active exists, re-sync it and play sound if new unread messages for us
      if (activeConversation) {
        const updated = conversations.find(c => c.id === activeConversation.id);
        if (updated) {
          // detect new unread messages for current role
          const key = readKeyForRole(currentUser.role);
          const newUnread = updated.messages.some(m => !(m.readBy && m.readBy[key]));
          activeConversation = updated;
          if (newUnread && document.visibilityState === 'visible') playNotify();
        }
      }
      renderActiveConversation();
      renderConversations();
    }
  });

  // manual dispatch helper to notify other tabs
  function dispatchLocalStorageEvent() {
    try { localStorage.setItem('convos_updated_at', Date.now()); } catch (e) {}
  }

  // unread badge update
  function updateUnreadBadge() {
    if (!unreadBadgeEl) return;
    let totalUnread = 0;
    const convs = loadConversations();
    convs.forEach(conv => {
      // respect manager visibility
      if (currentUser.role === 'manager' && !managerCanSee(conv)) return;
      if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        // tenant/landlord should only count if they are participant
        if (!conv.participants.some(p => p.id === currentUser.id)) return;
      }
      const key = readKeyForRole(currentUser.role);
      totalUnread += conv.messages.reduce((s, m) => s + ((m.readBy && m.readBy[key]) ? 0 : 1), 0);
    });
    unreadBadgeEl.textContent = totalUnread > 0 ? totalUnread : '';
    unreadBadgeEl.style.display = totalUnread > 0 ? 'inline-block' : 'none';
  }

  // notification sound
  function playNotify() {
    if (!notifyAudio) return fallbackBeep();
    try {
      notifyAudio.currentTime = 0;
      const p = notifyAudio.play();
      if (p !== undefined) p.catch(() => fallbackBeep());
    } catch (e) { fallbackBeep(); }
  }
  function fallbackBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.value = 0.02; o.connect(g); g.connect(ctx.destination); o.start();
      setTimeout(()=>{ o.stop(); ctx.close(); }, 180);
    } catch (e) { /* ignore */ }
  }

  // initial render
  renderConversations();
  renderActiveConversation();
  updateUnreadBadge();
  // auto open if URL carries listing/propertyId param
  autoCreateFromURL();

  // ---- Public API for other pages (listings) ----
  window.RentEasy = window.RentEasy || {};
  window.RentEasy.openOrCreateConversation = function ({ listingId, landlordId, landlordName }) {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const landlord = users.find(u => u.id === landlordId) || { id: landlordId || ('landlord-' + Math.floor(Math.random()*9999)), name: landlordName || landlordId || 'Landlord', role: 'landlord' };
      const tenant = { id: currentUser.id, name: currentUser.name, role: currentUser.role };

      let conv = conversations.find(c => String(c.listingId) === String(listingId) &&
        c.participants.some(p => p.id === landlord.id) && c.participants.some(p => p.id === tenant.id));
      if (!conv) {
        conv = { id: genId('CONV'), listingId, participants: [tenant, landlord], messages: [] };
        // try attach manager if any assigned in users
        const assigned = JSON.parse(sessionStorage.getItem('assignedProperties') || '[]');
        if (Array.isArray(assigned) && assigned.includes(listingId)) {
          const mgr = users.find(u => u.role === 'manager' && Array.isArray(u.assignedProperties) && u.assignedProperties.includes(listingId));
          if (mgr) conv.participants.push(mgr);
        }
        conversations.push(conv);
        saveConversations();
      }
      // navigate to messages page and open conversation via URL params (the script auto-opens)
      window.location.href = `messages.html?listing=${encodeURIComponent(listingId)}&landlord=${encodeURIComponent(landlord.id)}`;
    } catch (e) {
      console.error('openOrCreateConversation failed', e);
      // fallback: open messages page with listing param
      window.location.href = `messages.html?listing=${encodeURIComponent(listingId)}`;
    }
  };

  // expose helper to allow listing page to open conversation by id directly
  window.RentEasy.getConversations = () => loadConversations();

})(); // end file