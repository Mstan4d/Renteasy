// Load logged-in provider info
const activeProvider = JSON.parse(localStorage.getItem("activeProvider"));

if (!activeProvider) {
  alert("⚠️ Please log in first.");
  window.location.href = "provider-login.html";
} else {
  document.getElementById("providerName").textContent = activeProvider.name;
  document.getElementById("providerService").textContent = `Service: ${activeProvider.serviceType}`;
  document.getElementById("providerPhone").textContent = `Phone: ${activeProvider.phone}`;
  document.getElementById("providerEmail").textContent = `Email: ${activeProvider.email}`;
}

// Logout function
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("activeProvider");
  alert("You have been logged out.");
  window.location.href = "provider-login.html";
});