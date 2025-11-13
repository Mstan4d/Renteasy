document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const googleBtn = document.getElementById("googleSignIn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("roleSelect").value;

    // Simple validation for demo purposes
    if (!email || !password) return alert("Email and password required");

    // Save role to sessionStorage
    sessionStorage.setItem("role", role);
    sessionStorage.setItem("email", email);

    // Redirect to dashboard based on role
    if (role === "tenant" || role === "landlord") {
      window.location.href = "dashboard.html";
    } else if (role === "manager") {
      window.location.href = "manager-dashboard.html";
    } else if (role === "provider") {
      window.location.href = "provider-dashboard.html";
    } else if (role === "estate-firm") {
      window.location.href = "estate-dashboard.html";
    }
  });

  googleBtn.addEventListener("click", () => {
    // Mock Google Sign-In
    const role = "tenant"; // default role for Google users
    sessionStorage.setItem("role", role);
    sessionStorage.setItem("email", "googleuser@example.com");
    window.location.href = "dashboard.html";
  });
});