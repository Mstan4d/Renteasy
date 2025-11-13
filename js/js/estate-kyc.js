document.addEventListener("DOMContentLoaded", () => {
  const role = sessionStorage.getItem("role");
  if (role !== "estate") {
    alert("Access denied!");
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("kycForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const businessName = document.getElementById("businessName").value;
    const license = document.getElementById("license").files[0];
    const officeProof = document.getElementById("officeProof").files[0];
    const contactPerson = document.getElementById("contactPerson").value;

    if (!businessName || !license || !officeProof) {
      return alert("Please fill all required fields");
    }

    // Save KYC request to localStorage (simulate backend)
    const kycRequests = JSON.parse(localStorage.getItem("estateKYC")) || [];
    kycRequests.push({
      businessName,
      license: license.name,
      officeProof: officeProof.name,
      contactPerson,
      status: "Pending",
      submittedAt: new Date().toISOString()
    });

    localStorage.setItem("estateKYC", JSON.stringify(kycRequests));
    alert("KYC submitted successfully! Await admin approval.");

    // Disable form if needed
    form.reset();
  });
});