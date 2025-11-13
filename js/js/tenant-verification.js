document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("tenantForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const file = document.getElementById("tenantID").files[0];

    if (!name || !address || !phone || !email || !file) {
      alert("⚠️ Please fill in all required fields.");
      return;
    }

    const tenantData = {
      id: Date.now(),
      name,
      address,
      phone,
      email,
      fileName: file.name,
      status: "pending",
    };

    const existing = JSON.parse(localStorage.getItem("tenantSubmissions")) || [];
    existing.push(tenantData);
    localStorage.setItem("tenantSubmissions", JSON.stringify(existing));

    alert("✅ Verification request submitted! Admin will review your details soon.");
    form.reset();
  });
});