// 🧠 Load static default data
const defaultProvidersData = {
  cleaners: [
    { name: "Blessing CleanCare", rating: 4.8, img: "https://via.placeholder.com/80" },
    { name: "SparklePro Cleaning", rating: 4.6, img: "https://via.placeholder.com/80" },
  ],
  electricians: [
    { name: "PowerFix Electric", rating: 4.7, img: "https://via.placeholder.com/80" },
    { name: "LightWave Experts", rating: 4.5, img: "https://via.placeholder.com/80" },
  ],
  plumbers: [
    { name: "FlowMaster Plumbing", rating: 4.9, img: "https://via.placeholder.com/80" },
  ],
  painters: [
    { name: "FineTouch Painters", rating: 4.6, img: "https://via.placeholder.com/80" },
  ],
  carpenters: [
    { name: "OakCraft Carpentry", rating: 4.7, img: "https://via.placeholder.com/80" },
  ],
  gardeners: [
    { name: "GreenEdge Gardens", rating: 4.8, img: "https://via.placeholder.com/80" },
  ],
};

// 🧩 Merge localStorage data (newly registered providers)
function getAllProviders() {
  const stored = JSON.parse(localStorage.getItem("providersData")) || {};
  const merged = { ...defaultProvidersData };

  // Merge stored providers into the main data set
  for (const category in stored) {
    if (!merged[category]) merged[category] = [];
    merged[category] = [...merged[category], ...stored[category]];
  }

  return merged;
}

// Initialize data
const providersData = getAllProviders();

// 🧱 Display providers in selected category
function showProviders(category) {
  const providerGrid = document.getElementById("providerGrid");
  providerGrid.innerHTML = "";

  if (!providersData[category] || providersData[category].length === 0) {
    providerGrid.innerHTML = "<p>No providers available yet.</p>";
    return;
  }

  providersData[category].forEach(provider => {
    const card = document.createElement("div");
    card.classList.add("provider-card");
    card.innerHTML = `
  <img src="${provider.img}" alt="${provider.name}">
  <h3>${provider.name}</h3>
  <p>⭐ ${provider.rating || "New"}</p>
  <a href="provider-profile.html?category=${category}&name=${encodeURIComponent(provider.name)}" class="book-btn">View Profile</a>
`;
    providerGrid.appendChild(card);
  });

  document.getElementById("providerSection").scrollIntoView({ behavior: "smooth" });
}

// 🔍 Search logic
function searchService() {
  const query = document.getElementById("serviceSearch").value.toLowerCase();
  if (query && providersData[query]) {
    showProviders(query);
  } else {
    alert("No results found for that service. Try Cleaners, Plumbers, or Electricians.");
  }
}