document.addEventListener("DOMContentLoaded", () => {
  const role = sessionStorage.getItem("role");
  if (role !== "estate") {
    alert("Access denied!");
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("profileForm");

  // Load profile from localStorage
  const estates = JSON.parse(localStorage.getItem("estateFirms")) || [];
  const email = sessionStorage.getItem("email");
  const profile = estates.find(e => e.email === email) || {};

  document.getElementById("businessName").value = profile.businessName || "";
  document.getElementById("contactPerson").value = profile.contactPerson || "";
  document.getElementById("email").value = profile.email || email;
  document.getElementById("kycStatus").value = profile.kycStatus || "Not Submitted";

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    profile.businessName = document.getElementById("businessName").value;
    profile.contactPerson = document.getElementById("contactPerson").value;
    profile.email = document.getElementById("email").value;
    profile.kycStatus = profile.kycStatus || "Pending";

    // Save/update profile
    const index = estates.findIndex(e => e.email === email);
    if (index > -1) estates[index] = profile;
    else estates.push(profile);

    localStorage.setItem("estateFirms", JSON.stringify(estates));
    alert("Profile updated successfully!");
  });
});