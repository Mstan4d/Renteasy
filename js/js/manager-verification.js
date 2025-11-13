document.addEventListener("DOMContentLoaded", () => {
  // Load KYC status
  const email = sessionStorage.getItem("email");
  const verifications = JSON.parse(localStorage.getItem("managerVerifications")) || [];
  const myKYC = verifications.find(v => v.email === email);

  // Block approval if KYC is Pending or Rejected
  const approveBtn = document.querySelector(".approve-btn");
  if (myKYC && (myKYC.status === "Pending" || myKYC.status === "Rejected")) {
    if (approveBtn) {
      approveBtn.disabled = true;
      approveBtn.textContent = "KYC Pending";
      approveBtn.style.backgroundColor = "#ffc107"; // yellow
      approveBtn.style.cursor = "not-allowed";
    }
  }

  loadSelectedListing(); // existing code
});

document.addEventListener("DOMContentLoaded", () => {
  verifyAccess();
  loadSelectedListing();
  setupPreviewListener();
});

function verifyAccess() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user || user.role !== "manager") {
    alert("Access denied. Please log in as a manager.");
    window.location.href = "manager-login.html";
    return;
  }
  // Optional: show manager’s name in header
  const header = document.querySelector("header h1");
  header.innerHTML += ` <span style="font-size:1rem;color:#666;">| Logged in as ${user.name}</span>`;
}

function loadSelectedListing() {
  const listingId = localStorage.getItem("selectedListing");
  if (!listingId) return;

  const listings = JSON.parse(localStorage.getItem("managerListings")) || [];
  const listing = listings.find(l => l.id == listingId);
  if (!listing) return;

  document.getElementById("propertyName").value = listing.property;
  document.getElementById("ownerName").value = listing.owner;
  document.getElementById("location").value = listing.location;

  const mapPreview = document.getElementById("mapPreview");
  mapPreview.innerHTML = listing.location
    ? `<iframe width="100%" height="200" frameborder="0" style="border-radius:6px;"
        src="https://www.google.com/maps?q=${encodeURIComponent(listing.location)}&output=embed"></iframe>`
    : "No map preview available";
}

function setupPreviewListener() {
  const input = document.getElementById("photoProof");
  const container = document.getElementById("previewContainer");
  input.addEventListener("change", () => {
    container.innerHTML = "";
    [...input.files].forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const element = document.createElement(file.type.startsWith("video") ? "video" : "img");
        element.src = e.target.result;
        if (file.type.startsWith("video")) element.controls = true;
        container.appendChild(element);
      };
      reader.readAsDataURL(file);
    });
  });
}

// Approve
document.getElementById("verificationForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.role !== "manager") {
    alert("Unauthorized action. Please log in again.");
    return;
  }

  const propertyName = document.getElementById("propertyName").value;
  const listingId = localStorage.getItem("selectedListing");
  let listings = JSON.parse(localStorage.getItem("managerListings")) || [];
  const index = listings.findIndex(l => l.id == listingId);
  if (index === -1) return alert("Listing not found.");

  listings[index].status = "Manager Verified";
  listings[index].verifiedBy = currentUser.name;
  listings[index].managerId = currentUser.id;
  listings[index].verifiedAt = new Date().toLocaleString();

  localStorage.setItem("managerListings", JSON.stringify(listings));

  let adminListings = JSON.parse(localStorage.getItem("adminListings")) || [];
  const alreadyExists = adminListings.some(a => a.id == listingId);
  if (!alreadyExists) adminListings.push(listings[index]);
  localStorage.setItem("adminListings", JSON.stringify(adminListings));

  alert(`✅ Listing "${propertyName}" verified by ${currentUser.name} and sent to Admin Dashboard.`);
  localStorage.removeItem("selectedListing");
  window.location.href = "manager-dashboard.html";
});

// Reject
function rejectListing() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.role !== "manager") {
    alert("Unauthorized action. Please log in again.");
    return;
  }

  const propertyName = document.getElementById("propertyName").value;
  const listingId = localStorage.getItem("selectedListing");

  let listings = JSON.parse(localStorage.getItem("managerListings")) || [];
  const index = listings.findIndex(l => l.id == listingId);
  if (index === -1) return alert("Listing not found.");

  listings[index].status = "Rejected by Manager";
  listings[index].verifiedBy = currentUser.name;
  listings[index].managerId = currentUser.id;
  listings[index].verifiedAt = new Date().toLocaleString();

  localStorage.setItem("managerListings", JSON.stringify(listings));

  let adminListings = JSON.parse(localStorage.getItem("adminListings")) || [];
  const alreadyExists = adminListings.some(a => a.id == listingId);
  if (!alreadyExists) adminListings.push(listings[index]);
  localStorage.setItem("adminListings", JSON.stringify(adminListings));

  alert(`🚫 Listing "${propertyName}" rejected by ${currentUser.name} and sent to Admin Dashboard.`);
  localStorage.removeItem("selectedListing");
  window.location.href = "manager-dashboard.html";
}