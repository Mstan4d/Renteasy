// js/js/messages-monitor.js
// Enhanced messages-monitor.js — role-aware conversation monitor for Admin/Manager
// - preserves storage keys and structure used elsewhere in the app
// - auto-refresh, avatars, presence, expanded admin filters, sound notifications

document.addEventListener("DOMContentLoaded", () => {
  // DOM refs (add any missing elements to your HTML if necessary)
  const conversationList = document.getElementById("monitorConversationList");
  const chatWindow = document.getElementById("monitorChatWindow");
  const chatWith = document.getElementById("monitorChatWith");
  const searchInput = document.getElementById("monitorSearch");
  const roleFilter = document.getElementById("roleFilter");
  const backBtn = document.getElementById("backToDashboard");
  const notifySound = document.getElementById("notifySound");

  // Role + permissions
  const userRole = sessionStorage.getItem("role") || "manager"; // "admin" or "manager"
  const assignedProperties = JSON.parse(sessionStorage.getItem("assignedProperties") || "[]");

  // If roleFilter exists but user isn't admin, hide it
  if (roleFilter && userRole !== "admin") roleFilter.style.display = "none";

  // Local data state
  let conversations = loadConversations();
  let activeConversation = null;
  let lastRenderedHash = ""; // simple change detection

  // Auto-refresh fallback (in case storage event not delivered)
  const AUTO_REFRESH_MS = 10000;
  const autoRefreshTimer = setInterval(() => {
    const fresh = loadConversations();
    // crude compare by length + latest timestamp to avoid heavy work
    if (shouldReRender(fresh)) {
      conversations = fresh;
      renderConversations();
      if (activeConversation) {
        // preserve open conv if still present
        const still = conversations.find(c => c.id === activeConversation.id);
        if (still) openConversation(still.id, { markRead: false }); // re-render chat but don't re-mark read
        else activeConversation = null;
      }
    }
  }, AUTO_REFRESH_MS);

  // Initial render
  renderConversations();

  // ================== Event listeners ==================
  if (searchInput) searchInput.addEventListener("input", debounce(renderConversations, 300));
  if (roleFilter) roleFilter.addEventListener("change", renderConversations);
  if (backBtn) backBtn.addEventListener("click", () => { window.location.href = "manager-dashboard.html"; });

  // storage listener (other tabs)
  window.addEventListener("storage", (ev) => {
    if (ev.key === "conversations" || ev.key === "convos_updated_at") {
      const newData = loadConversations();
      // play notify if new messages appear
      if (newData.length > conversations.length) playNotify();
      // assign and render
      conversations = newData;
      renderConversations();
      if (activeConversation) openConversation(activeConversation.id, { markRead: true });
    }
  });

  // ================== Core helpers ==================
  function loadConversations() {
    return JSON.parse(localStorage.getItem("conversations") || "[]");
  }

  function shouldReRender(fresh) {
    // quick hash: count + latest timestamp
    const count = fresh.length;
    const latest = fresh.reduce((t, c) => {
      const last = (c.messages && c.messages.length) ? c.messages[c.messages.length - 1].timestamp : 0;
      return Math.max(t, last || 0);
    }, 0);
    const hash = `${count}|${latest}`;
    if (hash !== lastRenderedHash) {
      lastRenderedHash = hash;
      return true;
    }
    return false;
  }

  function getVisibleConversations() {
    // Role-based visibility (admin sees all; manager sees assigned)
    if (userRole === "admin") return conversations.slice().reverse(); // newest first
    if (userRole === "manager") {
      return conversations.filter(c => {
        // conversation should carry a propertyId/listingId to match against assignedProperties
        if (!assignedProperties || assignedProperties.length === 0) {
          // fallback: allow convos where manager is participant
          return (c.participants || []).some(p => p && p.id && p.id === sessionStorage.getItem("userId"));
        }
        // match by listingId or propertyId token
        return assignedProperties.includes(c.propertyId) || assignedProperties.includes(c.listingId) ||
               (c.state && assignedProperties.includes(c.state)) || (c.lga && assignedProperties.includes(c.lga)) ||
               (c.participants || []).some(p => p && p.id === sessionStorage.getItem("userId"));
      }).reverse();
    }
    return [];
  }

  // ================== Render list ==================
  function renderConversations() {
    conversations = loadConversations();
    const query = (searchInput?.value || "").trim().toLowerCase();
    let list = getVisibleConversations();

    // Admin filter dropdown: all | unread | tenants | managers | assigned-only
    if (userRole === "admin" && roleFilter && roleFilter.value) {
      const val = roleFilter.value;
      if (val === "unread") {
        list = list.filter(c => (c.messages || []).some(m => !m.readByAdmin && !m.readByManager));
      } else if (val === "tenants") {
        list = list.filter(c => (c.participants || []).some(p => (p.role || "").toLowerCase() === "tenant"));
      } else if (val === "managers") {
        list = list.filter(c => (c.participants || []).some(p => (p.role || "").toLowerCase() === "manager"));
      } else if (val === "assigned") {
        list = list.filter(c => assignedProperties.includes(c.propertyId) || assignedProperties.includes(c.listingId));
      } // 'all' or unknown => no extra filter
    }

    // Search query filter
    if (query) {
      list = list.filter(c => {
        const names = (c.participants || []).map(p => (p.name || "")).join(" ").toLowerCase();
        const preview = ((c.messages && c.messages.length) ? c.messages[c.messages.length - 1].text : "") || "";
        return names.includes(query) || preview.toLowerCase().includes(query) || (c.listingId || "").toLowerCase().includes(query);
      });
    }

    // render
    conversationList.innerHTML = "";
    if (!list.length) {
      conversationList.innerHTML = `<p class="empty">No conversations.</p>`;
      return;
    }

    for (const conv of list) {
      const lastMsg = conv.messages && conv.messages.length ? conv.messages[conv.messages.length - 1] : null;
      const unreadForThisRole = isConversationUnreadForRole(conv, userRole);

      const li = document.createElement("li");
      li.className = "monitor-convo";
      if (unreadForThisRole) li.classList.add("unread");

      // Avatar (initials) + online dot
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      const initials = getConversationInitials(conv);
      avatar.textContent = initials;
      avatar.title = (conv.participants || []).map(p => p.name).join(", ");
      avatar.style.background = stringToColor(initials);

      // online dot using onlineUsers store (if available)
      const online = isAnyParticipantOnline(conv);
      const dot = document.createElement("span");
      dot.className = "avatar-dot";
      dot.style.background = online ? "#16a34a" : "#bbb";
      avatar.appendChild(dot);

      // details
      const details = document.createElement("div");
      details.className = "details";
      const names = document.createElement("div");
      names.className = "names";
      names.innerHTML = escapeHtml((conv.participants || []).map(p => p.name + (p.role === "manager" ? " (mgr)" : p.role === "admin" ? " (admin)" : "")).join(" • "));
      const preview = document.createElement("div");
      preview.className = "preview";
      preview.textContent = lastMsg ? (String(lastMsg.text || "").slice(0, 60) + (String(lastMsg.text || "").length > 60 ? "…" : "")) : "No messages yet";
      const time = document.createElement("div");
      time.className = "time";
      time.textContent = lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString() : "";

      details.appendChild(names);
      details.appendChild(preview);
      details.appendChild(time);

      // unread badge
      const right = document.createElement("div");
      right.className = "right";
      const unreadCount = conv.messages ? conv.messages.reduce((s, m) => s + (isMessageUnreadByRole(m, userRole) ? 1 : 0), 0) : 0;
      if (unreadCount) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = unreadCount;
        right.appendChild(badge);
      }

      li.appendChild(avatar);
      li.appendChild(details);
      li.appendChild(right);

      li.addEventListener("click", () => openConversation(conv.id, { markRead: true }));
      conversationList.appendChild(li);
    }
  }

  // ================== Open & render conversation messages ==================
  function openConversation(id, opts = { markRead: true }) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    activeConversation = conv;

    chatWith.textContent = `Monitoring: ${ (conv.participants || []).map(p => p.name).join(" & ") }`;
    renderChat();

    // mark read if desired
    if (opts.markRead) {
      conv.messages.forEach(m => {
        if (userRole === "manager") m.readByManager = true;
        if (userRole === "admin") m.readByAdmin = true;
      });
      saveConversations();
    }

    // re-render list to clear unread badge
    renderConversations();
  }

  function renderChat() {
    chatWindow.innerHTML = "";
    if (!activeConversation) {
      chatWindow.innerHTML = `<p class="empty">Select a conversation to view messages.</p>`;
      return;
    }

    // for each message produce a chat bubble
    for (const m of (activeConversation.messages || [])) {
      const msgDiv = document.createElement("div");
      msgDiv.className = "message " + (m.sender === "me" ? "tenant" : "landlord");

      const avatar = document.createElement("div");
      avatar.className = "chat-avatar";
      avatar.textContent = (m.senderName ? m.senderName.charAt(0).toUpperCase() : (m.sender === "me" ? "T" : "L"));

      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = `<div class="msg-text">${escapeHtml(m.text || "")}</div>`;

      // attachment (image/video)
      if (m.attachment) {
        const lower = (m.attachment || "").toLowerCase();
        if (lower.endsWith(".mp4") || lower.includes("video")) {
          const video = document.createElement("video");
          video.src = m.attachment; video.controls = true; video.className = "attachment";
          bubble.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.src = m.attachment; img.className = "attachment";
          bubble.appendChild(img);
        }
      }

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = new Date(m.timestamp).toLocaleString();
      bubble.appendChild(meta);

      msgDiv.appendChild(avatar);
      msgDiv.appendChild(bubble);
      chatWindow.appendChild(msgDiv);
    }

    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // ================== Utilities ==================
  function isConversationUnreadForRole(conv, role) {
    if (!conv || !conv.messages) return false;
    if (role === "admin") return conv.messages.some(m => !m.readByAdmin);
    if (role === "manager") return conv.messages.some(m => !m.readByManager);
    return false;
  }
  function isMessageUnreadByRole(msg, role) {
    if (!msg || !msg.readBy) return true;
    if (role === "admin") return !msg.readBy.admin;
    if (role === "manager") return !msg.readBy.manager;
    return false;
  }

  function saveConversations() {
    try {
      localStorage.setItem("conversations", JSON.stringify(conversations));
      localStorage.setItem("convos_updated_at", Date.now());
    } catch (e) { console.warn("saveConversations failed", e); }
  }

  function isAnyParticipantOnline(conv) {
    const online = JSON.parse(localStorage.getItem("onlineUsers") || "{}");
    const parts = conv.participants || [];
    for (const p of parts) {
      if (online[p.id] && (Date.now() - online[p.id].lastSeen) < 90000) return true;
    }
    return false;
  }

  function getConversationInitials(conv) {
    const parts = conv.participants || [];
    if (!parts.length) return "?";
    // pick first letters of up to two participant names
    const initials = parts.slice(0, 2).map(p => (p.name || "").trim().charAt(0).toUpperCase() || "?").join("");
    return initials;
  }

  // deterministic color from string
  function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return `#${"00000".substring(0, 6 - c.length) + c}`;
  }

  // small helpers
  function debounce(fn, wait) { let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn.apply(this,a), wait); }; }
  function escapeHtml(s){ return s ? String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;") : ""; }

  // notification sound
  function playNotify() {
    if (!notifySound) return;
    notifySound.currentTime = 0;
    const p = notifySound.play();
    if (p !== undefined) p.catch(()=>{ /* autoplay blocked */ });
  }

  // expose small API for other pages if needed (e.g., listings contact button)
  window.RentEasy = window.RentEasy || {};
  window.RentEasy.openMonitorConversation = (opts = {}) => {
    // opts: { listingId }
    conversations = loadConversations();
    const conv = conversations.find(c => c.id === opts.convId || c.listingId === opts.listingId);
    if (conv) {
      openConversation(conv.id, { markRead: false });
      // ensure we're on monitor page if needed
      if (window.location.pathname.endsWith("messages-monitor.html")) {
        // do nothing
      } else {
        window.location.href = `messages-monitor.html?open=${encodeURIComponent(conv.id)}`;
      }
    } else {
      console.warn("Monitor: conversation not found for", opts);
    }
  };

  // cleanup on unload
  window.addEventListener("beforeunload", () => clearInterval(autoRefreshTimer));
});