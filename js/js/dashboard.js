document.addEventListener("DOMContentLoaded", () => {
  const userData = JSON.parse(localStorage.getItem("renteasyUser"));
  if (!userData) return window.location.href = "user-login.html";

  const userId = userData.id;
  document.getElementById("userGreeting").textContent = `Hello, ${userData.name}!`;
  document.getElementById("welcomeMessage").textContent = `Welcome, ${userData.name}!`;

  // Sidebar toggle
  const sidebar = document.getElementById("sidebar");
  document.getElementById("toggleSidebar").addEventListener("click", () => {
    sidebar.classList.toggle("hidden");
  });

  // Referral
  const refCodeEl = document.getElementById("refCode");
  const refLinkEl = document.getElementById("refLink");
  const copyBtn = document.getElementById("copyLinkBtn");
  const referralCode = userData.referralCode || "RENT-" + Date.now() + Math.floor(Math.random()*1000);
  refCodeEl.textContent = referralCode;
  refLinkEl.value = `${window.location.origin}/signup.html?ref=${referralCode}`;
  copyBtn.addEventListener("click", () => {
    refLinkEl.select();
    navigator.clipboard.writeText(refLinkEl.value);
    alert("Referral link copied!");
  });
  document.getElementById("refEarnings").textContent = `₦${userData.referralEarnings || 0}`;

  // --- Listings --- (Backend placeholder)
  const userListingsEl = document.getElementById("userListings");
  async function fetchUserListings() {
    // Placeholder backend route
    const response = await fetch(`https://api.renteasy.com/listings?userId=${userId}`);
    const listings = await response.json();
    renderListings(listings);
  }

  function renderListings(listings) {
    userListingsEl.innerHTML = "";
    if (!listings.length) return userListingsEl.innerHTML = "<li>No listings yet</li>";
    listings.forEach(listing => {
      const li = document.createElement("li");
      li.className = listing.verified ? "verified" : "pending";
      li.innerHTML = `<strong>${listing.title}</strong>
                      <p>${listing.description}</p>
                      <p>Status: ${listing.verified ? "Verified" : "Pending"}</p>`;
      userListingsEl.appendChild(li);
    });
  }

  fetchUserListings();

  // --- Chat --- (Backend placeholder)
  const conversationList = document.getElementById("conversationList");
  const chatWindow = document.getElementById("chatWindow");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatAttachment = document.getElementById("chatAttachment");
  const chatWith = document.getElementById("chatWith");

  let activeConversation = null;
  async function fetchConversations() {
    // Backend API
    const res = await fetch(`https://api.renteasy.com/conversations?userId=${userId}`);
    const conversations = await res.json();
    renderConversations(conversations);
  }

  function renderConversations(conversations) {
    conversationList.innerHTML = "";
    conversations.forEach(conv => {
      const li = document.createElement("li");
      li.textContent = conv.participants.join(" & ");
      li.addEventListener("click", () => openConversation(conv));
      conversationList.appendChild(li);
    });
  }

  function openConversation(conv) {
    activeConversation = conv;
    chatWith.textContent = "Chat with " + conv.participants.join(" & ");
    chatWindow.innerHTML = "";
    conv.messages.forEach(msg => {
      const div = document.createElement("div");
      div.className = msg.sender === userId ? "me" : "them";
      div.innerHTML = `<div class="bubble">${msg.text || ""}${msg.attachment ? `<img src="${msg.attachment}" class="attachment">` : ""}</div>`;
      chatWindow.appendChild(div);
    });
  }

  chatForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!activeConversation) return;
    const newMsg = {
      sender: userId,
      text: chatInput.value || "",
      timestamp: new Date().toISOString()
    };
    // Send to backend
    await fetch(`https://api.renteasy.com/conversations/${activeConversation.id}/messages`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(newMsg)
    });
    chatInput.value = "";
    fetchConversations(); // refresh after sending
  });

  fetchConversations();
});