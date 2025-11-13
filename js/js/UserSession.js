document.addEventListener("DOMContentLoaded", () => {
  const userData = JSON.parse(localStorage.getItem("renteasyUser"));
  const avatar = document.getElementById("userAvatar");
  const welcome = document.getElementById("welcomeMessage");

  if (!userData) {
    // Not logged in → redirect to login
    console.warn("No user session found. Redirecting to login...");
    window.location.href = "user-login.html";
    return;
  }

  const { name, email, loginType } = userData;
  let avatarUrl = "images/default-avatar.png";

  // Generate avatar dynamically for demo
  if (loginType === "google") {
    avatarUrl = `https://i.pravatar.cc/100?u=${email}`;
  } else {
    avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
  }

  // Update DOM
  avatar.src = avatarUrl;
  welcome.textContent = `Welcome, ${name.split(" ")[0]} 👋`;

  console.log(`Logged in as ${name} (${email})`);
});