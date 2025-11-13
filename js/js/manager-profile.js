document.getElementById("profileForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const serviceArea = document.getElementById("serviceArea").value;
  const password = document.getElementById("password").value;

  // Here you can connect to backend API to update profile
  alert(`Profile updated for ${fullName}!`);

  // Optionally reset password field
  document.getElementById("password").value = "";
});

// Dummy ratings data
const ratings = [
  { user: "John Doe", comment: "Very responsive and helpful", rating: 5 },
  { user: "Jane Smith", comment: "Professional service", rating: 4 },
  { user: "Aliyu Bello", comment: "Good communication", rating: 4 },
];

const ratingsList = document.getElementById("ratingsList");
ratings.forEach(r => {
  const li = document.createElement("li");
  li.textContent = `${r.user} (${r.rating}⭐): ${r.comment}`;
  ratingsList.appendChild(li);
});