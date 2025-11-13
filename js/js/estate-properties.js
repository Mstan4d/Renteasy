document.addEventListener("DOMContentLoaded", () => {
  const role = sessionStorage.getItem("role");
  if (role !== "estate") {
    alert("Access denied! Redirecting...");
    window.location.href = "login.html";
    return;
  }

  const tableBody = document.querySelector("#propertiesTable tbody");
  const notifySound = document.getElementById("notifySound");

  function loadProperties() {
    const properties = JSON.parse(localStorage.getItem("estateProperties")) || [];
    tableBody.innerHTML = "";

    let totalCommission = 0;

    properties.forEach((prop) => {
      const tr = document.createElement("tr");

      const today = new Date().toISOString().split("T")[0];

      // Highlight overdue
      if (prop.rentDueDate < today) {
        tr.classList.add("alert");
        notifySound.play().catch(() => {});
      }

      // Calculate commission for RentEasy properties
      let commission = 0;
      if (prop.source === "renteasy") {
        commission = (prop.rentAmount * 0.02).toFixed(0);
        totalCommission += parseInt(commission);
      }

      tr.innerHTML = `
        <td>${prop.name}</td>
        <td>${prop.owner}</td>
        <td>${prop.rentAmount.toLocaleString()}</td>
        <td>${prop.rentDueDate}</td>
        <td>${prop.rentEndDate}</td>
        <td>${prop.source === "renteasy" ? "RentEasy" : "External"}</td>
        <td>${prop.rentStatus || "Pending"}</td>
        <td>
          <input type="number" class="rating-input" min="1" max="5" value="${prop.rating || ''}">
        </td>
        <td>
          <button class="update-btn">Update</button>
        </td>
      `;

      // Handle rating update
      tr.querySelector(".update-btn").addEventListener("click", () => {
        const ratingInput = tr.querySelector(".rating-input").value;
        prop.rating = parseInt(ratingInput) || prop.rating;
        localStorage.setItem("estateProperties", JSON.stringify(properties));
        alert(`Rating updated for "${prop.name}"`);
      });

      tableBody.appendChild(tr);
    });

    // Display total commission somewhere if needed
    if (!document.getElementById("commissionDisplay")) {
      const commissionDiv = document.createElement("div");
      commissionDiv.id = "commissionDisplay";
      commissionDiv.style.margin = "15px 0";
      commissionDiv.style.fontWeight = "bold";
      commissionDiv.textContent = `Potential RentEasy Commission: ₦${totalCommission.toLocaleString()}/year`;
      document.querySelector(".main-content").prepend(commissionDiv);
    } else {
      document.getElementById("commissionDisplay").textContent =
        `Potential RentEasy Commission: ₦${totalCommission.toLocaleString()}/year`;
    }
  }

  loadProperties();
});