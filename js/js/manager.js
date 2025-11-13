/**
 * messages.js
 * - Role-aware messaging UI (tenant, landlord, manager, admin)
 * - Managers & Admins are view-only (admin views all; manager views assigned property convos)
 * - Conversations stored in localStorage under key "conversations"
 * - Conversation structure:
 *   {
 *     id: "CONV-xxx",
 *     listingId: "LIST-123" | null,
 *     participants: [
 *       { id: "user-1", name: "Uche", role: "tenant" },
 *       { id: "user-2", name: "Ada", role: "landlord" },
 *       { id: "mgr-1", name: "Manager Joe", role: "manager" } // optional
 *     ],
 *     messages: [
 *       { id:"m-1", senderId:"user-1", text:"hi", attachment: null, timestamp:"...", readBy: { tenant:true, manager:false, admin:false } }
 *     ]
 *   }
 *
 * - This file is intentionally self-contained to keep the front-end demo functional without a backend.
 *
 * Important: your app should set sessionStorage keys:
 *  - userId, userName, role (tenant|landlord|manager|admin)
 *  - assignedProperties (array) for manager - contains listing/state/lga tokens you use to allow view
 *
 * Path: js/js/messages.js
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- Elements
  const conversationListEl = document.getElementById("conversationList");
  const chatWindowEl = document.getElementById("chatWindow");
  const chatFormEl = document.getElementById("chatForm");
  const chatInputEl = document.getElementById("chatInput");
  const chatAttachmentEl = document.getElementById("chatAttachment");
  const chatWithEl = document.getElementById("chatWith");
  const participantStatusEl = document.getElementById("participantStatus");
  const unreadBadgeEl = document.getElementById("unreadBadge");
  const convoSummaryEl = document.getElementById("convoSummary");
  const typingIndicatorEl = document.getElementById("typingIndicator");
  const openListingBtn = document.getElementById("openListingBtn");
  const notifySound = document.getElementById("notifySound");

  // --- Current user from sessionStorage (your app should set these)
  const currentUser = {
    id: sessionStorage.getItem("userId") || "guest-" + Math.floor(Math.random()*100000),
    name: sessionStorage.getItem("userName") || "Guest",
    role: sessionStorage.getItem("role") || "tenant" // tenant | landlord | manager | admin
  };

  // Mark this user as online for simulated presence (persist small TTL)
  (function setLastSeen() {
    const users = JSON.parse(localStorage.getItem("onlineUsers") || "{}");
    users[currentUser.id] = { lastSeen: Date.now(), name: currentUser.name, role: currentUser.role };
    localStorage.setItem("onlineUsers", JSON.stringify(users));
    // update every 20s
    setInterval(() => {
      const u = JSON.parse(localStorage.getItem("onlineUsers") || "{}");
      u[currentUser.id] = { lastSeen: Date.now(), name: currentUser.name, role: currentUser.role };
      localStorage.setItem("onlineUsers", JSON.stringify(u));
    }, 20000);
  })();

  // --- State
  let conversations = loadConversations();
  let activeConversation = null;
  let typingTimeout = null;

  // --- Helpers: storage / ids
  function saveConversations() {
    localStorage.setItem("conversations", JSON.stringify(conversations));
    updateUnreadBadge();
  }
  function loadConversations() {
    return JSON.parse(localStorage.getItem("conversations") || "[]");
  }
  function genId(prefix = "ID") {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random()*9000).toString(36);
  }

  // --- Role visibility helpers
  function managerCanSee(convo) {
    // managers see convos where their assignedProperties match the listing or they are included as participant
    if (currentUser.role === "admin") return true;
    if (currentUser.role !== "manager") return true;
    const assigned = JSON.parse(sessionStorage.getItem("assignedProperties") || "[]");
    if (!assigned || assigned.length === 0) {
      // allow if manager explicitly included in participants
      return convo.participants.some(p => p.id === currentUser.id);
    }
    // match by listingId, state token, or lga token - this is flexible to later backend mapping
    return assigned.some(a => {
      if (convo.listingId && String(convo.listingId) === String(a)) return true;
      // allow if assigned token equals listing.state or listing.lga stored inside conversation meta (optional)
      if (convo.state && String(convo.state).toLowerCase() === String(a).toLowerCase()) return true;
      if (convo.lga && String(convo.lga).toLowerCase() === String(a).toLowerCase()) return true;
      return false;
    }) || convo.participants.some(p => p.id === currentUser.id);
  }

  // --- Build conversation UI list
  function renderConversations() {
    conversations = loadConversations();
    conversationListEl.innerHTML = "";

    // Filter visible convos by role
    const visible = conversations.filter(conv => {
      if (currentUser.role === "admin") return true;
      if (currentUser.role === "manager") return managerCanSee(conv);
      // tenant and landlord should see convos where they are participant
      return conv.participants.some(p => p.id === currentUser.id);
    });

    // Summary pill
    convoSummaryEl.textContent = `${visible.length} conversations`;

    visible.forEach(conv => {
      const li = document.createElement("li");
      li.dataset.id = conv.id;

      // Find names display
      const names = conv.participants.map(p => `${p.name}${p.role==='manager' ? ' (mgr)' : p.role==='admin' ? ' (admin)' : ''}`).join(" • ");

      // Count unread for current user
      const unread = conv.messages.reduce((s,m) => {
        const key = readKeyForRole(currentUser.role);
        return s + (m.readBy && m.readBy[key] ? 0 : 1);
      }, 0);

      li.innerHTML = `<div class="left"><strong>${escapeHtml(names)}</strong><div class="small muted">${conv.listingId ? 'Listing: ' + conv.listingId : 'General'}</div></div>
                      <div class="right">${unread ? `<span class="badge">${unread}</span>` : ''}</div>`;

      li.addEventListener("click", () => openConversation(conv.id));
      if (activeConversation && activeConversation.id === conv.id) li.classList.add("active");
      conversationListEl.appendChild(li);
    });

    updateUnreadBadge();
  }

  function readKeyForRole(role) {
    // normalized read keys we use in message.readBy
    if (role === "tenant") return "tenant";
    if (role === "landlord") return "landlord";
    if (role === "manager") return "manager";
    if (role === "admin") return "admin";
    return "tenant";
  }

  // --- Open or create a conversation by id
  function openConversation(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    activeConversation = conv;
    renderActiveConversation();
    markConversationRead(conv);
    renderConversations(); // update active class + badges

    // show listing button if there is a listing
    if (conv.listingId) {
      openListingBtn.style.display = "inline-block";
      openListingBtn.onclick = () => {
        // navigate to listing details page (adjust if your listing url differs)
        window.location.href = `listings.html?listing=${encodeURIComponent(conv.listingId)}`;
      };
    } else openListingBtn.style.display = "none";
  }

  // --- Render the selected conversation in chat window
  function renderActiveConversation() {
    chatWindowEl.innerHTML = "";
    if (!activeConversation) {
      chatWithEl.textContent = "Select a conversation";
      participantStatusEl.textContent = "";
      chatFormEl.style.display = "none";
      return;
    }

    const otherParticipants = activeConversation.participants.filter(p => p.id !== currentUser.id);
    const headerName = otherParticipants.map(p => p.name + (p.role==='manager' ? ' (mgr)' : p.role==='admin' ? ' (admin)' : '')).join(" & ");
    chatWithEl.textContent = headerName || activeConversation.participants.map(p=>p.name).join(" & ");

    // show participant online/last seen
    let statusText = otherParticipants.map(p => {
      const u = onlineUsers()[p.id];
      if (u && (Date.now() - u.lastSeen) < 90000) return `${p.name} — Online`;
      if (u) return `${p.name} — last seen ${timeAgo(u.lastSeen)}`;
      return `${p.name}`;
    }).join(" • ");
    participantStatusEl.textContent = statusText;

    // show messages
    activeConversation.messages.forEach(msg => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("message");
      // determine if message belongs to me
      const me = msg.senderId === currentUser.id;
      wrapper.classList.add(me ? "me" : "them");

      const bubble = document.createElement("div");
      bubble.classList.add("bubble");

      // text
      if (msg.text) bubble.appendChild(document.createTextNode(msg.text));

      // attachment
      if (msg.attachment) {
        const lower = msg.attachment.toLowerCase();
        if (lower.endsWith(".mp4") || lower.includes("video")) {
          const video = document.createElement("video");
          video.src = msg.attachment; video.controls = true; video.className = "attachment";
          bubble.appendChild(document.createElement("br"));
          bubble.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.src = msg.attachment; img.alt = "attachment"; img.className = "attachment";
          bubble.appendChild(document.createElement("br"));
          bubble.appendChild(img);
        }
      }

      // timestamp & read
      const meta = document.createElement("div");
      meta.className = "meta";
      const ts = document.createElement("span");
      ts.className = "timestamp";
      ts.textContent = new Date(msg.timestamp).toLocaleString();
      meta.appendChild(ts);

      // read receipt visible to sender (tenant or landlord)
      if (me) {
        const readKeys = Object.keys(msg.readBy || {}).filter(k => k !== readKeyForRole(currentUser.role));
        const receipt = document.createElement("span");
        receipt.className = "read-receipt";
        // show small ticks when any other relevant role has read
        const anyRead = Object.values(msg.readBy || {}).some(v => v === true && v !== null && v !== undefined);
        receipt.textContent = anyRead ? " ✓" : " ⏺";
        meta.appendChild(receipt);
      }

      bubble.appendChild(meta);
      wrapper.appendChild(bubble);
      chatWindowEl.appendChild(wrapper);
    });

    chatWindowEl.scrollTop = chatWindowEl.scrollHeight;

    // show or hide form based on currentUser.role:
    // - tenant and landlord can send; managers/admins view-only
    if (currentUser.role === "tenant" || currentUser.role === "landlord") {
      chatFormEl.style.display = "flex";
    } else {
      chatFormEl.style.display = "none";
    }
  }

  // --- Mark messages as read for current user's readKey
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
    if (changed) {
      saveConversations();
      renderActiveConversation();
    }
  }

  // --- Send message
  chatFormEl.addEventListener("submit", e => {
    e.preventDefault();
    if (!activeConversation) return alert("Select a conversation first.");
    if (!(currentUser.role === "tenant" || currentUser.role === "landlord")) {
      return alert("Only tenants and landlords can send messages here (managers/admins are view-only).");
    }
    const text = chatInputEl.value.trim();
    if (!text && (!chatAttachmentEl.files || chatAttachmentEl.files.length === 0)) return;

    // handle attachment (use object URL for demo)
    let attachmentUrl = null;
    if (chatAttachmentEl.files && chatAttachmentEl.files.length > 0) {
      const f = chatAttachmentEl.files[0];
      // store DataURL for persistence (FileReader)
      // Warning: storing large Base64 in localStorage is not ideal — for demo only.
      const reader = new FileReader();
      reader.onload = ev => {
        attachmentUrl = ev.target.result;
        pushMessage(text, attachmentUrl);
      };
      reader.readAsDataURL(f);
    } else {
      pushMessage(text, null);
    }

    // reset inputs
    chatInputEl.value = "";
    if (chatAttachmentEl) chatAttachmentEl.value = "";
    hideTypingIndicator();
  });

  function pushMessage(text, attachment) {
    const msg = {
      id: genId("MSG"),
      senderId: currentUser.id,
      text: text || "",
      attachment: attachment || null,
      timestamp: new Date().toISOString(),
      readBy: {} // will set readBy for sender immediately
    };
    const key = readKeyForRole(currentUser.role);
    msg.readBy[key] = true;

    activeConversation.messages.push(msg);
    saveConversations();
    renderActiveConversation();
    renderConversations();
    // notify other windows/tabs
    dispatchLocalStorageEvent();
  }

  // --- Typing indicator (simple local-only simulation)
  chatInputEl.addEventListener("input", () => {
    showTypingIndicator();
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(hideTypingIndicator, 2000);
  });

  function showTypingIndicator() {
    typingIndicatorEl.style.display = "block";
    typingIndicatorEl.textContent = "Typing...";
  }
  function hideTypingIndicator() {
    typingIndicatorEl.style.display = "none";
  }

  // --- Create conversation automatically if URL params have listing + landlord
  (function autoCreateFromURL() {
    const params = new URLSearchParams(window.location.search);
    const listing = params.get("listing");
    const landlord = params.get("landlord"); // expected landlord id or name (we accept either)
    if (!listing || !landlord) {
      renderConversations();
      return;
    }

    // find landlord user object if exists in localStorage users
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    let landlordObj = users.find(u => u.id === landlord || u.name === landlord) || { id: landlord, name: landlord, role: "landlord" };

    // tenant is current user if role tenant else create placeholder
    let tenantObj = { id: currentUser.id, name: currentUser.name, role: currentUser.role };

    // attempt to find manager assigned for this listing (optional)
    const assignedProperties = JSON.parse(sessionStorage.getItem("assignedProperties") || "[]");
    let managerObj = null;
    // if assignedProperties contains this listing id, try to find manager participant
    if (Array.isArray(assignedProperties)) {
      const mgrs = JSON.parse(localStorage.getItem("users") || "[]").filter(u => u.role === "manager");
      // naive pick: manager whose assignedProperties includes listing
      for (const m of mgrs) {
        const mAssigned = m.assignedProperties || [];
        if (mAssigned.includes(listing)) { managerObj = m; break; }
      }
    }
    if (!managerObj) {
      // optionally look if any manager has same state/lga token (not implemented here)
    }

    // check if conversation exists for this listing + these two participants
    let existing = conversations.find(c => c.listingId === listing && c.participants.some(p => p.id === landlordObj.id) && c.participants.some(p => p.id === tenantObj.id));
    if (!existing) {
      const conv = {
        id: genId("CONV"),
        listingId: listing,
        participants: [tenantObj, landlordObj].concat(managerObj ? [managerObj] : []),
        messages: []
      };
      conversations.push(conv);
      saveConversations();
      existing = conv;
    }

    // open it
    openConversation(existing.id);
  })();

  // --- New message detection from other tabs/windows
  window.addEventListener("storage", (ev) => {
    if (ev.key === "conversations") {
      // reload and re-render
      conversations = loadConversations();
      // if active conversation exists, re-open it to show incoming messages
      if (activeConversation) {
        const updated = conversations.find(c => c.id === activeConversation.id);
        if (updated) {
          activeConversation = updated;
          // play sound if new unread message for current user in the active conv
          const newMsgs = activeConversation.messages.filter(m => {
            const key = readKeyForRole(currentUser.role);
            return !m.readBy || !m.readBy[key];
          });
          if (newMsgs.length && document.visibilityState === "visible") {
            playNotify();
          }
        }
      }
      renderActiveConversation();
      renderConversations();
    }
  });

  // also trigger a manual storage event to notify other tabs
  function dispatchLocalStorageEvent() {
    try {
      // bump a small key
      localStorage.setItem("convos_updated_at", Date.now());
    } catch (e) { /* ignore */ }
  }

  // --- Unread badge
  function updateUnreadBadge() {
    const convs = loadConversations();
    const totalUnread = convs.reduce((sum, conv) => {
      // check visibility: admin sees all, manager filtered
      if (currentUser.role === "manager" && !managerCanSee(conv)) return sum;
      if (currentUser.role !== "admin" && currentUser.role !== "manager") {
        if (!conv.participants.some(p => p.id === currentUser.id)) return sum;
      }
      const key = readKeyForRole(currentUser.role);
      return sum + conv.messages.reduce((s,m) => s + ((m.readBy && m.readBy[key]) ? 0 : 1), 0);
    }, 0);
    unreadBadgeEl.textContent = totalUnread > 0 ? totalUnread : "";
    unreadBadgeEl.style.display = totalUnread ? "inline-block" : "none";
  }

  // --- Play notification sound (fallback beep if blocked)
  function playNotify() {
    if (!notifySound) return fallbackBeep();
    notifySound.currentTime = 0;
    const p = notifySound.play();
    if (p !== undefined) p.catch(() => fallbackBeep());
  }
  function fallbackBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.value = 0.02; o.connect(g); g.connect(ctx.destination); o.start();
      setTimeout(()=>{ o.stop(); ctx.close(); }, 200);
    } catch(e){ /* ignore */ }
  }

  // --- Utility: escape
  function escapeHtml(s){ return s ? String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') : ''; }
  function timeAgo(ts) {
    const diff = Date.now() - (Number(ts) || new Date(ts).getTime());
    if (diff < 60000) return 'moments ago';
    if (diff < 3600000) return Math.round(diff/60000) + ' min ago';
    if (diff < 86400000) return Math.round(diff/3600000) + ' hr ago';
    return new Date(ts).toLocaleDateString();
  }
  function onlineUsers() {
    return JSON.parse(localStorage.getItem("onlineUsers") || "{}");
  }

  // --- Public API helpers for other pages (listings) to create/open a convo
  window.RentEasy = window.RentEasy || {};
  window.RentEasy.openOrCreateConversation = function({ listingId, landlordId, landlordName }) {
    // create minimal participant objects
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const landlord = users.find(u => u.id === landlordId) || { id: landlordId, name: landlordName || landlordId, role: "landlord" };
    const tenant = { id: currentUser.id, name: currentUser.name, role: currentUser.role };

    let conv = conversations.find(c => c.listingId === listingId && c.participants.some(p=>p.id===landlord.id) && c.participants.some(p=>p.id===tenant.id));
    if (!conv) {
      conv = { id: genId("CONV"), listingId, participants: [tenant, landlord], messages: [] };
      // attempt to attach manager if any assigned for this listing (sessionStorage.assignedProperties)
      const assigned = JSON.parse(sessionStorage.getItem("assignedProperties") || "[]");
      if (Array.isArray(assigned) && assigned.includes(listingId)) {
        // try find manager in users
        const mgr = users.find(u => u.role === "manager" && (u.assignedProperties || []).includes(listingId));
        if (mgr) conv.participants.push(mgr);
      }
      conversations.push(conv);
      saveConversations();
    }
    // open conversation in-place by navigating to messages page with params
    window.location.href = `messages.html?listing=${encodeURIComponent(listingId)}&landlord=${encodeURIComponent(landlord.id)}`;
  };

  // render on load
  renderConversations();
  renderActiveConversation();
  updateUnreadBadge();
});