document.addEventListener("DOMContentLoaded", () => {
  // Ensure only Estate Firms access this page
  const role = sessionStorage.getItem("role");
  if (role !== "estate") {
    alert("Access denied! Redirecting...");
    window.location.href = "login.html";
    return;
  }

  loadDashboardData();
  loadProperties();
  loadLeads(); // Load leads in real-time

  // Listen for new property submissions
  const addForm = document.getElementById("addPropertyForm");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addNewProperty();
    });
  }
});

// Load dashboard summary
function loadDashboardData() {
  const properties = JSON.parse(localStorage.getItem("estateProperties")) || [];

  const totalProperties = properties.length;
  const paidRent = properties.filter(p => p.rentStatus === "Paid").length;
  const pendingRent = properties.filter(p => p.rentStatus === "Pending").length;
  const averageRating = (properties.reduce((sum, p) => sum + (p.rating || 0), 0) / totalProperties || 0).toFixed(1);

  // Management fees: 2% of rent for RentEasy-acquired properties
  const managementFees = properties
    .filter(p => p.source === "renteasy")
    .reduce((sum, p) => sum + (p.rentAmount || 0) * 0.02, 0);

  document.getElementById("total-properties").textContent = totalProperties;
  document.getElementById("paid-rent").textContent = paidRent;
  document.getElementById("pending-rent").textContent = pendingRent;
  document.getElementById("average-rating").textContent = `${averageRating} ⭐`;
  document.getElementById("management-fees").textContent = `₦${managementFees.toLocaleString()}`;
}

// Load property table
function loadProperties() {
  const properties = JSON.parse(localStorage.getItem("estateProperties")) || [];
  const tbody = document.querySelector("#properties-table tbody");
  tbody.innerHTML = "";

  const notifySound = document.getElementById("notifySound");
  const today = new Date().toISOString().split("T")[0];

  properties.forEach(p => {
    const tr = document.createElement("tr");

    // Notification if rent due or expired
    if (p.rentEndDate <= today && p.rentStatus === "Pending") {
      notifySound.play().catch(() => {});
    }

    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.owner}</td>
      <td>${p.rentDueDate}</td>
      <td>${p.rentEndDate}</td>
      <td>${p.rentStatus}</td>
      <td>${p.rating || "N/A"}</td>
      <td><button class="view-btn" onclick="viewProperty('${p.name}')">View</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// View property details
function viewProperty(name) {
  alert(`Viewing details for property: ${name}`);
}

// --- Add new property and update Find a Manager ---
function addNewProperty() {
  const name = document.getElementById("propertyName").value.trim();
  const owner = document.getElementById("propertyOwner").value.trim();
  const rentAmount = Number(document.getElementById("propertyRent").value);
  const state = document.getElementById("propertyState").value;
  const lga = document.getElementById("propertyLga").value;
  const rentDueDate = document.getElementById("propertyRentDue").value;
  const rentEndDate = document.getElementById("propertyRentEnd").value;
  const firmId = sessionStorage.getItem("userId");
  const firmName = sessionStorage.getItem("userName");
  const contactEmail = sessionStorage.getItem("userEmail");

  const newProp = {
    id: 'PROP-' + Date.now(),
    name,
    owner,
    rentAmount,
    state,
    lga,
    rentDueDate,
    rentEndDate,
    rentStatus: "Pending",
    rating: 0,
    source: "firm",
    addedOn: new Date().toISOString(),
    firmId,
    firmName,
    contactEmail
  };

  const properties = JSON.parse(localStorage.getItem("estateProperties") || "[]");
  properties.push(newProp);
  localStorage.setItem("estateProperties", JSON.stringify(properties));

  loadDashboardData();
  loadProperties();
  alert("Property added! It now appears on the Find a Manager page for landlords.");
}

// --- Load leads for this firm ---
function loadLeads() {
  const firmId = sessionStorage.getItem("userId");
  const leads = JSON.parse(localStorage.getItem("firmLeads") || "[]")
    .filter(l => l.firmId === firmId);

  const leadContainer = document.getElementById("firmLeadsContainer");
  if (!leadContainer) return;

  leadContainer.innerHTML = "";
  if (!leads.length) {
    leadContainer.innerHTML = "<p>No new hire requests yet.</p>";
    return;
  }

  leads.forEach(l => {
    const div = document.createElement("div");
    div.className = "lead-card";
    div.innerHTML = `
      <p><strong>Property ID:</strong> ${l.propertyId}</p>
      <p><strong>Landlord Email:</strong> ${l.landlordEmail}</p>
      <p><strong>Request Time:</strong> ${new Date(l.timestamp).toLocaleString()}</p>
      <p><strong>Status:</strong> ${l.status}</p>
    `;
    leadContainer.appendChild(div);
  });
}

// Optional: refresh leads every 10 seconds
setInterval(loadLeads, 10000);

// Inside dashboard.js

// Load leads for this firm (based on firm email)
function loadFirmLeads() {
  const firmEmail = sessionStorage.getItem("email");
  const allLeads = JSON.parse(localStorage.getItem("contactRequests") || "[]");

  const firmLeads = allLeads.filter(l => l.managerEmail === firmEmail);

  displayLeads(firmLeads);
}

// Display them nicely in a “Leads” section
function displayLeads(leads) {
  const container = document.getElementById("firmLeads");
  if (!container) return;
  
  container.innerHTML = leads.length
    ? leads.map(l => `
        <div class="lead-card">
          <p><strong>From:</strong> ${l.requestedBy}</p>
          <p><strong>Property:</strong> ${l.property}</p>
          <p><strong>Duration:</strong> ${l.duration}</p>
          <p><strong>Message:</strong> ${l.message}</p>
          <p><strong>Status:</strong> ${l.status}</p>
        </div>
      `).join("")
    : "<p>No leads yet.</p>";
}