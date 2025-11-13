document.addEventListener("DOMContentLoaded", () => {
  const tenantList = document.getElementById("tenantList");

  // Load pending tenant verifications
  const pendingTenants = JSON.parse(localStorage.getItem("tenantSubmissions")) || [];
  const approvedTenants = JSON.parse(localStorage.getItem("approvedTenants")) || [];

  function renderTenants() {
    if (pendingTenants.length === 0) {
      tenantList.innerHTML = "<p>No pending tenant verifications.</p>";
      return;
    }

    tenantList.innerHTML = "";
    pendingTenants.forEach((tenant, index) => {
      const div = document.createElement("div");
      div.classList.add("tenant-card");
      div.innerHTML = `
        <h3>${tenant.name}</h3>
        <p><strong>Email:</strong> ${tenant.email}</p>
        <p><strong>Phone:</strong> ${tenant.phone}</p>
        <p><strong>Address:</strong> ${tenant.address}</p>
        <button class="approveBtn">Approve ✅</button>
        <button class="rejectBtn">Reject ❌</button>
      `;

      // Approve tenant
      div.querySelector(".approveBtn").addEventListener("click", () => {
        approvedTenants.push(tenant);
        pendingTenants.splice(index, 1);

        localStorage.setItem("approvedTenants", JSON.stringify(approvedTenants));
        localStorage.setItem("tenantSubmissions", JSON.stringify(pendingTenants));

        alert(`${tenant.name} has been approved ✅`);
        renderTenants();
      });

      // Reject tenant
      div.querySelector(".rejectBtn").addEventListener("click", () => {
        if (confirm("Reject this tenant?")) {
          pendingTenants.splice(index, 1);
          localStorage.setItem("tenantSubmissions", JSON.stringify(pendingTenants));
          renderTenants();
        }
      });

      tenantList.appendChild(div);
    });
  }

  renderTenants();
});