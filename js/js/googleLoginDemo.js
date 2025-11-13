document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("googleLoginBtn");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    showGoogleDemoPopup();
  });
});

function showGoogleDemoPopup() {
  const overlay = document.createElement("div");
  overlay.className = "google-demo-overlay";
  overlay.innerHTML = `
    <div class="google-demo-box">
      <h3>Choose your Google account</h3>
      <div class="demo-account" onclick="mockGoogleLogin('user@gmail.com', 'User Tenant')">
        <img src="https://i.pravatar.cc/40?img=1" alt="">
        <span>user@gmail.com</span>
      </div>
      <div class="demo-account" onclick="mockGoogleLogin('manager@gmail.com', 'Manager James')">
        <img src="https://i.pravatar.cc/40?img=2" alt="">
        <span>manager@gmail.com</span>
      </div>
      <div class="demo-account" onclick="mockGoogleLogin('landlord@gmail.com', 'Landlord Ada')">
        <img src="https://i.pravatar.cc/40?img=3" alt="">
        <span>landlord@gmail.com</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const style = document.createElement("style");
  style.innerHTML = `
    .google-demo-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .google-demo-box {
      background: #fff;
      padding: 20px 25px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      text-align: center;
      width: 300px;
    }
    .google-demo-box h3 {
      margin-bottom: 15px;
      font-weight: 600;
      color: #444;
    }
    .demo-account {
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      margin: 6px 0;
      cursor: pointer;
      transition: 0.2s;
    }
    .demo-account:hover {
      background: #f3f3f3;
    }
    .demo-account img {
      width: 35px;
      height: 35px;
      border-radius: 50%;
    }
  `;
  document.head.appendChild(style);
}

function mockGoogleLogin(email, name) {
  localStorage.setItem("renteasyUser", JSON.stringify({ email, name, loginType: "google" }));
  alert(`Welcome, ${name}! (Demo Google Login Successful)`);

  // Redirect to dashboard (update path per role)
  if (email.includes("manager")) {
    window.location.href = "manager-dashboard.html";
  } else if (email.includes("landlord")) {
    window.location.href = "landlord-dashboard.html";
  } else {
    window.location.href = "dashboard.html";
  }
}