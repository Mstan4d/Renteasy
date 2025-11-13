document.addEventListener("DOMContentLoaded", () => {
  // Only estate firms can access
  const role = sessionStorage.getItem("role");
  if (role !== "estate") {
    alert("Access denied! Redirecting...");
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("addPropertyForm");
  form.addEventListener("submit", function(e) {
    e.preventDefault();

    const name = document.getElementById("propertyName").value.trim();
    const owner = document.getElementById("ownerName").value.trim();
    const rentAmount = parseFloat(document.getElementById("rentAmount").value);
    const rentDueDate = document.getElementById("rentDueDate").value;
    const rentEndDate = document.getElementById("rentEndDate").value;
    const source = document.getElementById("source").value;
    const rating = parseInt(document.getElementById("rating").value) || null;

    if (!name || !owner || !rentAmount || !rentDueDate || !rentEndDate) {
      return alert("Please fill all required fields.");
    }

    // Save property to localStorage
    const properties = JSON.parse(localStorage.getItem("estateProperties")) || [];
    const newProperty = {
      id: Date.now(),
      name,
      owner,
      rentAmount,
      rentDueDate,
      rentEndDate,
      source,
      rentStatus: "Pending",
      rating
    };
    properties.push(newProperty);
    localStorage.setItem("estateProperties", JSON.stringify(properties));

    alert(`Property "${name}" added successfully!`);
    form.reset();
  });
});