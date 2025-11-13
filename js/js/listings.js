// ================== listings.js ==================
document.addEventListener("DOMContentLoaded", () => {
  populateStateAndLGA("filterState", "filterLGA");

  const stateEl = document.getElementById("filterState");
  const lgaEl = document.getElementById("filterLGA");
  const typeEl = document.getElementById("filterType");
  const keywordEl = document.getElementById("filterKeyword");
  const clearBtn = document.getElementById("clearFilters");
  const grid = document.getElementById("listingsGrid");
  const countEl = document.getElementById("filterCount");
  const verifiedSummaryEl = document.getElementById("verifiedSummary");
  const notifySound = document.getElementById("notifySound");
  const detailsSection = document.getElementById("detailsSection");
  const detailsContent = document.getElementById("detailsContent");
  const backBtn = document.getElementById("backToListings");

  const role = sessionStorage.getItem("role") || "guest";
  const managerAssigned = JSON.parse(sessionStorage.getItem("assignedProperties") || "[]");

  if (!localStorage.getItem("listings") || JSON.parse(localStorage.getItem("listings")).length === 0) {
    localStorage.setItem("listings", JSON.stringify(getSampleListings()));
  }

  let allListings = JSON.parse(localStorage.getItem("listings")) || [];
  let lastSeenIds = allListings.map(l => l.id);

  applyFilters();

  stateEl.addEventListener("change", applyFilters);
  lgaEl.addEventListener("change", applyFilters);
  typeEl.addEventListener("change", applyFilters);
  keywordEl.addEventListener("input", debounce(applyFilters, 300));
  clearBtn.addEventListener("click", clearFilters);
  backBtn.addEventListener("click", backToGrid);

  setInterval(checkForNewListings, 3500);

  // Load from home page click
  const homeSelectedListing = JSON.parse(localStorage.getItem("currentListing") || "null");
  if (homeSelectedListing) {
    allListings = [homeSelectedListing, ...allListings.filter(l => l.id != homeSelectedListing.id)];
    localStorage.removeItem("currentListing");
  }

  // ================== FILTER & RENDER ==================
  function applyFilters() {
    allListings = JSON.parse(localStorage.getItem("listings")) || [];
    const state = stateEl.value, lga = lgaEl.value, type = typeEl.value, kw = (keywordEl.value || "").toLowerCase().trim();
    const matches = [], others = [];

    function canSee(listing) {
      if (role === "admin") return true;
      if (role === "manager") {
        if (!managerAssigned || managerAssigned.length === 0) return false;
        return managerAssigned.some(a =>
          typeof a === "string"
            ? (a.toLowerCase() === listing.state?.toLowerCase() || a.toLowerCase() === listing.lga?.toLowerCase())
            : (a.state && a.lga && a.state === listing.state && a.lga === listing.lga)
        );
      }
      return true;
    }

    allListings.forEach(listing => {
      if (!canSee(listing)) return;
      let matched = true;
      if (state && listing.state !== state) matched = false;
      if (lga && listing.lga !== lga) matched = false;
      if (type && listing.propertyType !== type) matched = false;
      if (kw && !((listing.title || "") + " " + (listing.locationText || "") + " " + (listing.posterName || "")).toLowerCase().includes(kw)) matched = false;
      matched ? matches.push(listing) : others.push(listing);
    });

    matches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    others.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    renderListings([...matches, ...others], matches.length, allListings.length);
  }

  function renderListings(listingsArr, matchCount = 0, totalCount = 0) {
    grid.innerHTML = "";
    if (!listingsArr.length) {
      grid.innerHTML = "<p>No listings yet.</p>";
      countEl.textContent = "Showing 0 of 0 listings";
      verifiedSummaryEl.textContent = "";
      return;
    }

    const verifiedCount = listingsArr.filter(l => l.verified).length;
    verifiedSummaryEl.innerHTML = `${verifiedCount} verified • ${listingsArr.length - verifiedCount} unverified`;
    countEl.textContent = `Showing ${matchCount || listingsArr.length} of ${totalCount || listingsArr.length} listings`;

    listingsArr.forEach((l, idx) => {
      const card = document.createElement("article");
      card.className = "listing-card";
      if (idx >= matchCount) card.classList.add("listing-faded");

      const imgSrc = l.images?.[0] || `https://picsum.photos/seed/${encodeURIComponent(l.id)}/600/400`;
      const uplift = Number(l.price) * 0.075;
      const priceAfter = Number(l.price) + uplift;

      card.innerHTML = `
        <img src="${imgSrc}" class="thumb" alt="${escapeHtml(l.title || 'Property')}">
        <div class="card-body">
          <h3>${escapeHtml(l.title || l.propertyType || "Untitled Property")}</h3>
          <div class="listing-meta">${escapeHtml(l.propertyType || '')} • ${escapeHtml(l.state || '')} / ${escapeHtml(l.lga || '')}</div>
          <div class="listing-meta">${escapeHtml(l.description?.substring(0, 100) + '...' || '')}</div>
          <div class="price-row">
            <div>
              <div class="price">₦${Number(l.price).toLocaleString()}</div>
              <div class="after">After 7.5% fee: ₦${Number(priceAfter).toLocaleString()}</div>
            </div>
            <div>
              <div class="${l.verified ? 'badge verified-badge' : 'badge unverified-badge'}">${l.verified ? 'Verified' : 'Unverified'}</div>
            </div>
          </div>
          <div style="margin-top:10px; display:flex; gap:8px;">
            <button class="btn view-btn" data-id="${l.id}">View Details</button>
            <button class="btn contact-btn" data-id="${l.id}">Contact</button>
            ${(role === 'admin' || role === 'manager') && !l.verified ? `<button class="btn verify-btn" data-id="${l.id}">Verify</button>` : ''}
          </div>
        </div>
      `;

      grid.appendChild(card);

      // View Details
      card.querySelector('.view-btn').addEventListener('click', () => openDetails(l.id));

      // ✅ Updated Contact Logic (saves to localStorage + redirects)
      card.querySelector('.contact-btn').addEventListener('click', () => {
        const contactData = {
          listingId: l.id,
          title: l.title,
          landlord: l.posterName || "Unknown",
          price: l.price,
          state: l.state,
          lga: l.lga
        };
        localStorage.setItem("activeContact", JSON.stringify(contactData));
        const query = `?listing=${encodeURIComponent(l.id)}&landlord=${encodeURIComponent(contactData.landlord)}`;
        window.location.href = `messages.html${query}`;
      });

      // Verify (Admin/Manager)
      const verifyBtn = card.querySelector('.verify-btn');
      if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
          l.verified = true;
          localStorage.setItem('listings', JSON.stringify(allListings));
          applyFilters();
        });
      }
    });
  }

  // ================== DETAILS SECTION ==================
  function openDetails(listingId) {
    const listing = allListings.find(l => l.id === listingId);
    if (!listing) return;
    detailsSection.style.display = "block";
    grid.style.display = "none";

    const reviews = listing.reviews || [];
    let reviewsHtml = `<div class="details-reviews">
      <h4>Reviews (${reviews.length})</h4>
      <div class="reviews-list">`;
    reviews.forEach(r => reviewsHtml += `<div class="review-item">- ${escapeHtml(r)}</div>`);
    reviewsHtml += `</div>
      <input type="text" id="newReviewInput" class="review-input" placeholder="Add review">
      <button id="submitReviewBtn" class="submit-review-details">Submit</button>
    </div>`;

    detailsContent.innerHTML = `
      <h2>${escapeHtml(listing.title)}</h2>
      <p>${escapeHtml(listing.description || "")}</p>
      <p><strong>Price:</strong> ₦${Number(listing.price).toLocaleString()}</p>
      <p><strong>Type:</strong> ${escapeHtml(listing.propertyType)}</p>
      <p><strong>Location:</strong> ${escapeHtml(listing.state)} / ${escapeHtml(listing.lga)}</p>
      ${reviewsHtml}
    `;

    document.getElementById("submitReviewBtn").addEventListener('click', () => {
      const val = document.getElementById("newReviewInput").value.trim();
      if (val) {
        listing.reviews = listing.reviews || [];
        listing.reviews.push(val);
        localStorage.setItem('listings', JSON.stringify(allListings));
        openDetails(listingId);
      }
    });
  }

  function backToGrid() {
    detailsSection.style.display = "none";
    grid.style.display = "grid";
  }

  function clearFilters() {
    stateEl.value = "";
    lgaEl.value = "";
    lgaEl.disabled = true;
    typeEl.value = "";
    keywordEl.value = "";
    applyFilters();
  }

  function checkForNewListings() {
    const currentListings = JSON.parse(localStorage.getItem("listings")) || [];
    const currentIds = currentListings.map(l => l.id);
    const newIds = currentIds.filter(id => !lastSeenIds.includes(id));
    if (newIds.length) {
      notifySound.play();
      lastSeenIds = currentIds;
      applyFilters();
    }
  }

  // ================== UTILITIES ==================
  function escapeHtml(text) {
    return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function getSampleListings() {
    return [
      { id: "1", title: "Nice Self Contain", propertyType: "Self Contain", description: "A small cozy place", state: "Lagos", lga: "Ikeja", price: 120000, verified: true, timestamp: Date.now(), reviews: ["Great place!"], posterName: "Landlord1" },
      { id: "2", title: "Luxury 2 Bedroom", propertyType: "2 Bedroom", description: "Spacious apartment", state: "Lagos", lga: "Lekki", price: 500000, verified: false, timestamp: Date.now() - 1000000, reviews: [], posterName: "Landlord2" }
    ];
  }
});