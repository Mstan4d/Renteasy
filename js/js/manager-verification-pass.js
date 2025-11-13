document.addEventListener("DOMContentLoaded", () => {
  const email = sessionStorage.getItem("email");
  if (!email) {
    // Redirect non-logged-in users
    window.location.href = "login.html";
    return;
  }

  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const kycForm = document.getElementById("kycForm");

  emailInput.value = email;

  // Load previous KYC if exists
  const verifications = JSON.parse(localStorage.getItem("managerVerifications")) || [];
  const myVerification = verifications.find(v => v.email === email);

  if (myVerification) {
    fullNameInput.value = myVerification.fullName || "";
    phoneInput.value = myVerification.phone || "";
    // If ID already uploaded, inform user (optional)
  }

  kycForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const phone = phoneInput.value.trim();
    const idProof = document.getElementById("idProof").files[0];
    const otherDocs = Array.from(document.getElementById("otherDocs").files);

    if (!fullName || !phone || !idProof) return alert("Please fill all required fields and upload ID proof.");

    const newKYC = {
      email,
      fullName,
      phone,
      status: "Pending",
      submittedAt: new Date().toISOString(),
      idProofName: idProof.name,
      otherDocsNames: otherDocs.map(f => f.name)
    };

    // Save or update
    if (myVerification) {
      const index = verifications.findIndex(v => v.email === email);
      verifications[index] = newKYC;
    } else {
      verifications.push(newKYC);
    }

    localStorage.setItem("managerVerifications", JSON.stringify(verifications));

    alert("KYC submitted successfully! Status: Pending");

    // Redirect back to dashboard
    window.location.href = "manager-dashboard.html";
  });
});