// js/js/logout.js
// Universal logout logic for all RentEasy dashboards

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector(".logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const user = JSON.parse(sessionStorage.getItem("currentUser") || "null");
      const userRole = user ? user.role : "";

      // Clear all session data
      sessionStorage.removeItem("currentUser");

      // Optional: clear extra dashboard data if stored
      sessionStorage.removeItem("activeDashboard");
      sessionStorage.removeItem("filters");
      sessionStorage.removeItem("tempListing");

      alert("You’ve been logged out successfully!");

      // Redirect to the proper login page
      if (userRole === "admin") {
        window.location.href = "../admin-login.html";
      } else if (userRole === "manager") {
        window.location.href = "../manager-login.html";
      } else if (userRole === "provider") {
        window.location.href = "../provider-login.html";
      } else if (userRole === "landlord") {
        window.location.href = "../landlord-login.html";
      } else if (userRole === "tenant") {
        window.location.href = "../tenant-login.html";
      } else {
        window.location.href = "../login.html";
      }
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector('.sidebar a[href$="manager-login.html"]');
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sessionStorage.clear(); // clear login info
      window.location.href = "login.html"; // redirect to unified login page
    });
  }
});