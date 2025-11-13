document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("landlordForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const file = document.getElementById("ownership").files[0];

    if (!name || !address || !phone || !email || !file) {
      alert("⚠️ Please fill in all required fields.");
      return;
    }

    // Retrieve old submissions
    let landlordSubmissions = JSON.parse(localStorage.getItem("landlordSubmissions")) || [];

    // Check for duplicate email
    const existing = landlordSubmissions.find(l => l.email === email);
    if (existing) {
      alert("⚠️ This email has already submitted a verification request.");
      return;
    }

    // Create landlord data object
    const landlordData = {
      id: Date.now(),
      name,
      address,
      phone,
      email,
      fileName: file.name,
      status: "pending",
      verified: false,
      dateSubmitted: new Date().toLocaleString()
    };

    // Save new submission
    landlordSubmissions.push(landlordData);
    localStorage.setItem("landlordSubmissions", JSON.stringify(landlordSubmissions));

    alert("✅ Verification request sent successfully! Our admin will review it soon.");
    form.reset();
  });

  // Smooth scroll from hero button to form
  document.querySelector(".start-btn").addEventListener("click", () => {
    document.getElementById("verify-form").scrollIntoView({ behavior: "smooth" });
  });
});