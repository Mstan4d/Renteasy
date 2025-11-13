document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const googleBtn = document.getElementById("googleSignIn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    const role = form.role.value;

    if (!name || !email || !password || !role) {
      alert("All fields are required.");
      return;
    }

    // Save user temporarily (replace with backend later)
    const user = { name, email, role, avatar: "images/default-avatar.png" };
    sessionStorage.setItem("user", JSON.stringify(user));

    redirectUser(role);
  });

  googleBtn.addEventListener("click", () => {
    // Google Sign-in logic (replace with actual OAuth)
    alert("Google Sign-in clicked");
    // After successful Google sign, save user info similarly:
    // sessionStorage.setItem("user", JSON.stringify({...}));
    // redirectUser(role); // determine role from Google account or ask user
  });

  function redirectUser(role) {
    switch (role) {
      case "tenant":
      case "landlord":
        window.location.href = "listings.html"; // tenant/landlord dashboard
        break;
      case "manager":
        window.location.href = "manager-dashboard.html";
        break;
      case "provider":
        window.location.href = "provider-dashboard.html";
        break;
      default:
        window.location.href = "login.html";
    }
  }
});