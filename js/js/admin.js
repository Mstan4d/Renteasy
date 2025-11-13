document.addEventListener("DOMContentLoaded", () => {

  // ------------------- LISTINGS DASHBOARD -------------------
  const listingContainer = document.getElementById("admin-listings");
  const showOnlyPending = document.getElementById("showOnlyPending");

  function loadListings() {
    if (!listingContainer) return;

    listingContainer.innerHTML = '';
    const listings = JSON.parse(localStorage.getItem('listings')) || [];

    listings.forEach((listing, index) => {
      if (showOnlyPending && showOnlyPending.checked && (listing.approved || listing.rejected)) return;

      const card = document.createElement('div');
      card.className = 'listing-card';

      let statusText = '⏳ Pending';
      if (listing.rejected) statusText = '❌ Rejected';
      else if (listing.approved) statusText = '✅ Approved';
      if (listing.verified) statusText += ' 🔒 Verified';

      card.innerHTML = `
        <img src="images/${listing.imageName || 'default.jpg'}" alt="House Image" />
        <h4>${listing.location || 'Unknown Location'} - ₦${listing.price || 'N/A'}</h4>
        <p>${listing.description || 'No description provided.'}</p>
        <p>Status: <strong>${statusText}</strong></p>
        <div class="actions">
          <button class="approve">Approve</button>
          <button class="reject">Reject</button>
          <button class="verify">Verify</button>
          <button class="delete">Delete</button>
        </div>
      `;

      const [approveBtn, rejectBtn, verifyBtn, deleteBtn] = card.querySelectorAll('button');

      approveBtn.onclick = () => {
        listings[index].approved = true;
        listings[index].rejected = false;
        saveListings(listings);
      };

      rejectBtn.onclick = () => {
        listings[index].approved = false;
        listings[index].rejected = true;
        listings[index].verified = false;
        saveListings(listings);
      };

      verifyBtn.onclick = () => {
        if (!listings[index].approved) {
          alert("Approve this listing first before verifying.");
          return;
        }
        listings[index].verified = true;
        listings[index].status = "Manager Verified"; // Track for admin
        saveListings(listings);
        // Add to adminListings for tracking
        let adminListings = JSON.parse(localStorage.getItem("adminListings")) || [];
        adminListings.push(listings[index]);
        localStorage.setItem("adminListings", JSON.stringify(adminListings));
        loadAdminListings();
      };

      deleteBtn.onclick = () => {
        if (confirm("Delete this listing?")) {
          listings.splice(index, 1);
          saveListings(listings);
        }
      };

      listingContainer.appendChild(card);
    });
  }

  function saveListings(updated) {
    localStorage.setItem('listings', JSON.stringify(updated));
    loadListings();
  }

  if (showOnlyPending) showOnlyPending.addEventListener('change', loadListings);
  loadListings();

  // ------------------- ADMIN LISTINGS TABLE -------------------
  const adminTableBody = document.querySelector("#adminListingsTable tbody");

  function loadAdminListings() {
    if (!adminTableBody) return;
    const adminListings = JSON.parse(localStorage.getItem("adminListings")) || [];
    adminTableBody.innerHTML = "";

    if (adminListings.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="text-align:center;">No listings yet</td>`;
      adminTableBody.appendChild(tr);
      return;
    }

    adminListings.forEach((listing, index) => {
      const tr = document.createElement("tr");

      let managerStatus = "⏳ Pending";
      if (listing.status === "Manager Verified") managerStatus = "✅ Verified";
      if (listing.status === "Rejected by Manager") managerStatus = "❌ Rejected";

      let actionButtons = "";
      if (listing.status === "Manager Verified") {
        actionButtons = `
          <button onclick="adminApprove(${index})" class="approve-btn">Approve</button>
          <button onclick="adminReject(${index})" class="reject-btn">Reject</button>
        `;
      } else {
        actionButtons = "No action";
      }

      tr.innerHTML = `
        <td>${listing.property || listing.location}</td>
        <td>${listing.owner || listing.contactEmail}</td>
        <td>${listing.location}</td>
        <td>${listing.status || "Pending"}</td>
        <td>${managerStatus}</td>
        <td>${actionButtons}</td>
      `;
      adminTableBody.appendChild(tr);
    });
  }

  // Admin approve/reject functions
  window.adminApprove = function(index) {
    const adminListings = JSON.parse(localStorage.getItem("adminListings")) || [];
    adminListings[index].status = "Admin Approved";
    localStorage.setItem("adminListings", JSON.stringify(adminListings));
    alert(`Listing "${adminListings[index].property}" approved by Admin!`);
    loadAdminListings();
  }

  window.adminReject = function(index) {
    const adminListings = JSON.parse(localStorage.getItem("adminListings")) || [];
    adminListings[index].status = "Admin Rejected";
    localStorage.setItem("adminListings", JSON.stringify(adminListings));
    alert(`Listing "${adminListings[index].property}" rejected by Admin!`);
    loadAdminListings();
  }

  loadAdminListings();

  // ------------------- LANDLORD VERIFICATION -------------------
  const landlordSection = document.getElementById('landlord-requests');
  function loadLandlordRequests() {
    if (!landlordSection) return;
    landlordSection.innerHTML = '';
    const pending = JSON.parse(localStorage.getItem('landlordSubmissions')) || [];

    if (pending.length === 0) {
      landlordSection.innerHTML = "<p>No pending landlord verifications.</p>";
      return;
    }

    pending.forEach((landlord) => {
      const card = document.createElement('div');
      card.className = 'listing-card';
      card.innerHTML = `
        <h4>${landlord.name}</h4>
        <p><strong>Address:</strong> ${landlord.address}</p>
        <p><strong>Email:</strong> ${landlord.email}</p>
        <p><strong>Phone:</strong> ${landlord.phone}</p>
        <p><strong>Status:</strong> ${landlord.status}</p>
        <div class="actions">
          <button class="approve">Approve</button>
          <button class="reject">Reject</button>
        </div>
      `;

      card.querySelector('.approve').onclick = () => approveLandlord(landlord.id);
      card.querySelector('.reject').onclick = () => rejectLandlord(landlord.id);

      landlordSection.appendChild(card);
    });
  }

  function approveLandlord(id) {
    const pending = JSON.parse(localStorage.getItem("landlordSubmissions")) || [];
    const approved = JSON.parse(localStorage.getItem("approvedLandlords")) || [];

    const landlord = pending.find(item => item.id === id);
    if (landlord) {
      landlord.status = "approved";
      landlord.verified = true;
      approved.push(landlord);
      localStorage.setItem("approvedLandlords", JSON.stringify(approved));

      const updatedPending = pending.filter(item => item.id !== id);
      localStorage.setItem("landlordSubmissions", JSON.stringify(updatedPending));

      alert(`✅ ${landlord.name} approved successfully!`);
      loadLandlordRequests();
    }
  }

  function rejectLandlord(id) {
    const pending = JSON.parse(localStorage.getItem("landlordSubmissions")) || [];
    const updatedPending = pending.filter(item => item.id !== id);
    localStorage.setItem("landlordSubmissions", JSON.stringify(updatedPending));
    alert("❌ Landlord request rejected.");
    loadLandlordRequests();
  }

  loadLandlordRequests();

  // ------------------- TENANT VERIFICATION -------------------
  const tenantSection = document.getElementById('tenant-requests');
  function loadTenantRequests() {
    if (!tenantSection) return;
    tenantSection.innerHTML = '';
    const pending = JSON.parse(localStorage.getItem('tenantSubmissions')) || [];

    if (pending.length === 0) {
      tenantSection.innerHTML = "<p>No pending tenant verifications.</p>";
      return;
    }

    pending.forEach((tenant) => {
      const card = document.createElement('div');
      card.className = 'listing-card';
      card.innerHTML = `
        <h4>${tenant.name}</h4>
        <p><strong>Email:</strong> ${tenant.email}</p>
        <p><strong>Phone:</strong> ${tenant.phone}</p>
        <p><strong>Status:</strong> ${tenant.status}</p>
        <div class="actions">
          <button class="approve">Approve</button>
          <button class="reject">Reject</button>
        </div>
      `;

      card.querySelector('.approve').onclick = () => approveTenant(tenant.id);
      card.querySelector('.reject').onclick = () => rejectTenant(tenant.id);

      tenantSection.appendChild(card);
    });
  }

  function approveTenant(id) {
    const pending = JSON.parse(localStorage.getItem("tenantSubmissions")) || [];
    const approved = JSON.parse(localStorage.getItem("verifiedTenants")) || [];

    const tenant = pending.find(item => item.id === id);
    if (tenant) {
      tenant.status = "approved";
      tenant.verified = true;
      approved.push(tenant);
      localStorage.setItem("verifiedTenants", JSON.stringify(approved));

      const updatedPending = pending.filter(item => item.id !== id);
      localStorage.setItem("tenantSubmissions", JSON.stringify(updatedPending));

      alert(`✅ ${tenant.name} approved successfully!`);
      loadTenantRequests();
    }
  }

  function rejectTenant(id) {
    const pending = JSON.parse(localStorage.getItem("tenantSubmissions")) || [];
    const updatedPending = pending.filter(item => item.id !== id);
    localStorage.setItem("tenantSubmissions", JSON.stringify(updatedPending));
    alert("❌ Tenant request rejected.");
    loadTenantRequests();
  }

  loadTenantRequests();

  // ------------------- LOGOUT -------------------
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("adminLoggedIn");
      window.location.href = "login.html";
    });
  }

});