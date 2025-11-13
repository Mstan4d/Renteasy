document.addEventListener("DOMContentLoaded", () => {
  // ======== ROLE & SESSION CHECK =========
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (!user || user.role !== "manager") {
    alert("Access denied. Please login as a Manager.");
    window.location.href = "login.html"; // unified login page
    return;
  }

  // Populate welcome message and avatar
  document.getElementById("welcomeMessage").textContent = `Welcome, ${user.name}`;
  const avatarEl = document.getElementById("userAvatar");
  if (user.avatar) avatarEl.src = user.avatar;

  // ======== FETCH LISTINGS =========
  fetchListings();

  async function fetchListings() {
    try {
      // Uncomment for backend API when ready
      /*
      const response = await fetch('/api/manager/listings');
      const listings = await response.json();
      */

      // Local storage version for testing
      const listings = JSON.parse(localStorage.getItem("managerListings")) || [
        { id: 1, property: "2BHK Apartment", owner: "John Doe", status: "Assigned", location: "Lagos" },
        { id: 2, property: "Studio Flat", owner: "Jane Smith", status: "Unverified", location: "Abuja" },
        { id: 3, property: "3BHK Duplex", owner: "Aliyu Bello", status: "Nearby", location: "Port Harcourt" },
      ];

      renderDashboardData(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
    }
  }

  // ======== RENDER DASHBOARD =========
  function renderDashboardData(listings) {
    // Filter listings based on manager assigned properties (if any)
    const filteredListings = user.assignedProperties && user.assignedProperties.length
      ? listings.filter(l => user.assignedProperties.includes(l.id))
      : listings;

    const assignedCount = filteredListings.filter(l => l.status === "Assigned").length;
    const unverifiedCount = filteredListings.filter(l => l.status === "Unverified").length;
    const nearbyCount = filteredListings.filter(l => l.status === "Nearby").length;
    const commissionTotal = assignedCount * 5000; // example rate

    document.getElementById("assigned-count").textContent = assignedCount;
    document.getElementById("unverified-count").textContent = unverifiedCount;
    document.getElementById("nearby-count").textContent = nearbyCount;
    document.getElementById("commission-total").textContent = `₦${commissionTotal.toLocaleString()}`;
   // ================== KYC STATUS ==================
const kycStatusEl = document.getElementById("kyc-status");
const kycActionBtn = document.getElementById("kyc-action-btn");

const email = sessionStorage.getItem("email");
let verifications = JSON.parse(localStorage.getItem("managerVerifications")) || [];
const myKYC = verifications.find(v => v.email === email);

if (myKYC) {
  kycStatusEl.textContent = myKYC.status;
  if (myKYC.status === "Pending") kycStatusEl.style.color = "#ffc107"; // yellow
  else if (myKYC.status === "Approved") kycStatusEl.style.color = "#28a745"; // green
  else if (myKYC.status === "Rejected") kycStatusEl.style.color = "#dc3545"; // red
} else {
  kycStatusEl.textContent = "Not Submitted";
  kycStatusEl.style.color = "#6c757d"; // gray
}

// Button redirects to KYC verification page
if (kycActionBtn) {
  kycActionBtn.addEventListener("click", () => {
    window.location.href = "manager-verification-pass.html";
  });
}
    // Render table
    const tbody = document.querySelector("#listings-table tbody");
    tbody.innerHTML = "";

    filteredListings.forEach(listing => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${listing.property}</td>
        <td>${listing.owner}</td>
        <td>${listing.status}</td>
        <td>${listing.location}</td>
        <td>
          ${listing.status === "Unverified" ? `<button class="verify-btn" onclick="goToVerification('${listing.id}')">Verify</button>` : ""}
          <button class="view-btn" onclick="viewListing('${listing.property}')">View</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ======== NAVIGATION HELPERS =========
  window.goToVerification = function(listingId) {
    localStorage.setItem("selectedListing", listingId);
    window.location.href = "manager-verification.html";
  };

  window.viewListing = function(name) {
    alert(`Viewing details for: ${name}`);
  };
});