document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();

  // Get form values
  const name = document.getElementById("name").value.trim();
  const serviceType = document.getElementById("serviceType").value;
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value.trim();

  // Basic validation
  if (!name || !serviceType || !phone || !email || !password) {
    alert("⚠️ Please fill in all fields.");
    return;
  }

  // Retrieve existing provider accounts
  let providers = JSON.parse(localStorage.getItem("providerAccounts")) || [];

  // Check if email already exists
  if (providers.some(provider => provider.email === email)) {
    alert("⚠️ An account with this email already exists. Please log in instead.");
    return;
  }

  // Create new provider object
  const newProvider = {
    name,
    serviceType,
    phone,
    email,
    password,
    createdAt: new Date().toISOString()
  };

  // Save new provider to localStorage
  providers.push(newProvider);
  localStorage.setItem("providerAccounts", JSON.stringify(providers));

  // Automatically log in the provider
  localStorage.setItem("activeProvider", JSON.stringify(newProvider));

  alert("✅ Registration successful! Welcome to RentEasy Services.");
  window.location.href = "provider-dashboard.html";
});

document.getElementById("providerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const providerData = {
    name: document.getElementById("providerName").value,
    serviceType: document.getElementById("serviceType").value,
    experience: document.getElementById("experience").value,
    contact: document.getElementById("contact").value,
    email: document.getElementById("email").value,
    image: document.getElementById("image").value,
  };

  try {
    const response = await fetch("http://localhost:5000/api/providers/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(providerData),
    });

    const result = await response.json();
    if (result.success) {
      alert("✅ Provider registered successfully!");
      e.target.reset();
    } else {
      alert("❌ Failed to register provider: " + result.message);
    }
  } catch (error) {
    alert("⚠️ Error connecting to backend");
    console.error(error);
  }
});