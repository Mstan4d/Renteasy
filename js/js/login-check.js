document.addEventListener("DOMContentLoaded", () => {
  const role = sessionStorage.getItem("role") || null;
  const email = sessionStorage.getItem("email") || null;

  // If no login, redirect to login page
  if (!role || !email) {
    alert("Please login first.");
    window.location.href = "login.html";
    return;
  }

  // Determine which dashboard this is
  const currentPage = window.location.pathname.split("/").pop();

  const dashboardRoles = {
    "dashboard.html": ["tenant", "landlord"],
    "manager-dashboard.html": ["manager"],
    "provider-dashboard.html": ["provider"],
    "admin-dashboard.html": ["admin"],
    "estate-dashboard.html": ["estate-firm"]
  };

  // If current role not allowed for this page
  const allowedRoles = dashboardRoles[currentPage] || [];
  if (!allowedRoles.includes(role) && role !== "admin") {
    alert("You do not have access to this dashboard.");
    window.location.href = "login.html";
    return;
  }

  // Optional: show logged-in user info
  const userInfoEl = document.getElementById("userInfo");
  if (userInfoEl) {
    userInfoEl.textContent = `Logged in as: ${email} (${role})`;
  }
});