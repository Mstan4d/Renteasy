document.addEventListener("DOMContentLoaded", () => {

  // Show logged-in user if exists
  const usernameSpan = document.getElementById("usernameDisplay");
  const email = sessionStorage.getItem("email");
  if (usernameSpan && email) {
    const username = email.split("@")[0]; // simple display
    usernameSpan.textContent = `Hi, ${username}`;
  } 

  const listingsContainer = document.getElementById("listing-container");

  // ================== DISPLAY LISTINGS ==================
  const listings = JSON.parse(localStorage.getItem("allListings")) || [
    { id:1, title:"2 Bedroom Flat in Lekki", price:1500000, desc:"Spacious · Gated estate", img:"images/house1.jpg", location:"Lekki, Lagos", state:"Lagos", lga:"Lekki" },
    { id:2, title:"Self-contain in Garki", price:400000, desc:"Near market · Secure", img:"images/house2.jpg", location:"Garki, Abuja", state:"Abuja", lga:"Garki" },
    { id:3, title:"3 Bedroom Duplex in Ikeja", price:3000000, desc:"Fully furnished · Parking", img:"images/house3.jpg", location:"Ikeja, Lagos", state:"Lagos", lga:"Ikeja" }
  ];

  function displayListings(list = listings) {
    listingsContainer.innerHTML = "";
    if (!list.length) { listingsContainer.innerHTML="<p>No listings found</p>"; return; }
    list.forEach(house => {
      const card = document.createElement("div");
      card.classList.add("post-card");
      card.innerHTML = `
        <img src="${house.img}" alt="${house.title}" />
        <h3>${house.title}</h3>
        <p>₦${house.price.toLocaleString()} · ${house.desc}</p>
        <p><b>Location:</b> ${house.location}</p>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="map-btn">📍 View on Map</button>
          <button class="details-btn">🔍 View Details</button>
        </div>
      `;
      listingsContainer.appendChild(card);

      card.querySelector('.map-btn').addEventListener('click', () => openMap(house.location));
      card.querySelector('.details-btn').addEventListener('click', () => {
        localStorage.setItem("currentListing", JSON.stringify(house));
        window.location.href = "listings.html";
      });
    });
  }

  displayListings();

  // ================== SEARCH FILTER ==================
  document.getElementById("searchBtn")?.addEventListener("click", e => {
    e.preventDefault();
    const loc = document.getElementById("search-location").value.toLowerCase();
    const price = parseInt(document.getElementById("search-price").value);
    const filtered = listings.filter(l =>
      (!loc || l.location.toLowerCase().includes(loc)) &&
      (isNaN(price) || l.price <= price)
    );
    displayListings(filtered);
    document.getElementById("listings").scrollIntoView({ behavior:"smooth" });
  });

  // ================== STAwindow.locationDataTES + LGAs ==================
  const statesAndLGAs = window.locationData || {};
  const stateSelect = document.getElementById("state");
  const lgaSelect = document.getElementById("lga");
  if(stateSelect && lgaSelect) {
    Object.keys(statesAndLGAs).forEach(s => {
      const opt = document.createElement("option"); opt.value=s; opt.textContent=s; stateSelect.appendChild(opt);
    });
    stateSelect.addEventListener("change", () => {
      lgaSelect.innerHTML='<option value="">--Choose LGA--</option>';
      if(statesAndLGAs[stateSelect.value]) {
        statesAndLGAs[stateSelect.value].forEach(lga => {
          const opt=document.createElement("option"); opt.value=lga; opt.textContent=lga; lgaSelect.appendChild(opt);
        });
      }
    });
  }

  // ================== LOGGED IN USER ==================
  const navLinks = document.querySelector(".nav-links");
  const userEmail = sessionStorage.getItem("email");
  if(userEmail) {
    const userDropdown = document.createElement("div");
    userDropdown.classList.add("user-dropdown");
    userDropdown.innerHTML = `
      <span>${userEmail} ▼</span>
      <div class="user-dropdown-content">
        <a href="dashboard.html">Dashboard</a>
        <a href="logout.html" onclick="logout()">Logout</a>
      </div>
    `;
    navLinks.appendChild(userDropdown);
  }

  // ================== HAMBURGER MENU ==================
  const hamburger = document.querySelector(".hamburger");
  if(hamburger) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

});

// ================== OPEN GOOGLE MAPS ==================
function openMap(location) {
  const query = encodeURIComponent(location);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
}

// ================== LOGOUT ==================
function logout() {
  sessionStorage.clear();
  window.location.href = "login.html";
}