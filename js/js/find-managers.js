// find-managers.js
// RentEasy | Manager Discovery Logic

document.addEventListener("DOMContentLoaded", () => {
  const managerListEl = document.getElementById("managerList");
  const stateEl = document.getElementById("filterState");
  const lgaEl = document.getElementById("filterLga");
  const typeEl = document.getElementById("filterType");
  const searchEl = document.getElementById("searchBox");
  const sortEl = document.getElementById("sortFilter");
  const totalCountEl = document.getElementById("totalManagers");
  const clearBtn = document.getElementById("clearFilters");

  // ✅ Load from storage or fallback
  let managers = JSON.parse(localStorage.getItem("managers")) || getSampleManagers();

  // ✅ Merge with firms that have added estate properties
  const estateProperties = JSON.parse(localStorage.getItem("estateProperties")) || [];
  estateProperties.forEach(p => {
    if (p.estateFirm && !managers.some(m => m.email === p.estateFirm.email)) {
      managers.push({
        id: 'AUTO-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: p.estateFirm.name,
        company: p.estateFirm.company || p.estateFirm.name,
        email: p.estateFirm.email,
        state: p.state,
        lga: p.lga,
        serviceArea: p.lga,
        tier: 'Verified Firm',
        rating: p.estateFirm.rating || 4.7,
        reviews: p.estateFirm.reviews || 0,
        verifiedOn: new Date().toISOString(),
        logo: p.estateFirm.logo || "images/firm-placeholder.png",
        bio: p.estateFirm.bio || "Registered real estate partner on RentEasy.",
      });
    }
  });

  // 👇 REMOVE DUPLICATES: ensure a firm appears only once in managers
const seenEmails = new Set();
managers = managers.filter(m => {
  if (!m.email) return true; // keep entries without email (rare)
  if (seenEmails.has(m.email)) return false; // duplicate, remove
  seenEmails.add(m.email);
  return true;
});
// 👆 END REMOVE DUPLICATES

  localStorage.setItem("managers", JSON.stringify(managers));

  // ✅ Filtering & display
  function renderManagers() {
    const state = stateEl.value.trim().toLowerCase();
    const lga = lgaEl.value.trim().toLowerCase();
    const tier = typeEl.value.trim().toLowerCase();
    const search = searchEl.value.trim().toLowerCase();
    const sort = sortEl.value;

    let filtered = managers.filter(m => {
      const matchState = !state || (m.state || "").toLowerCase() === state;
      const matchLga = !lga || (m.lga || "").toLowerCase() === lga;
      const matchTier = !tier || (m.tier || "").toLowerCase() === tier;
      const matchSearch = !search || 
        [m.name, m.company, m.serviceArea].some(v => (v || "").toLowerCase().includes(search));

      const isQualifiedFirm = (m.tier || "").toLowerCase().includes("firm") ||
                              (m.tier || "").toLowerCase().includes("partner");
      const isHighRatedManager = (m.role === "manager") && (m.rating || 0) >= 4.7;

      return matchState && matchLga && matchTier && matchSearch && (isQualifiedFirm || isHighRatedManager);
    });

    // ✅ Sorting
    if (sort === "toprated") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === "nearest") {
      filtered.sort((a, b) => {
        const sameState = (a.state === stateEl.value);
        const sameLga = (a.lga === lgaEl.value);
        return sameState && sameLga ? (b.rating - a.rating) : sameState ? -1 : 1;
      });
    } else if (sort === "newest") {
      filtered.sort((a, b) => new Date(b.verifiedOn || b.addedOn) - new Date(a.verifiedOn || a.addedOn));
    }

    // ✅ Output
    managerListEl.innerHTML = filtered.map(m => `
      <div class="manager-card">
        <img src="${m.logo || 'images/user.png'}" alt="${m.name}" class="manager-logo">
        <div class="manager-info">
          <h3>${m.name}</h3>
          <p>${m.company || ""}</p>
          <p><strong>${m.state || ""}</strong> ${m.lga ? "- " + m.lga : ""}</p>
          <p>⭐ ${m.rating || "–"} (${m.reviews || 0} reviews)</p>
          <p class="tier">${m.tier || "Manager"}</p>
          <p class="bio">${m.bio || ""}</p>
        </div>
        <div class="manager-actions">
          <button class="btn-contact" data-id="${m.id}">Contact</button>
          <button class="btn-hire" data-id="${m.id}">Hire</button>
        </div>
      </div>
    `).join("");

    totalCountEl.textContent = `${filtered.length}`;
  }

  renderManagers();

  // ✅ Dynamic LGA list
  stateEl.addEventListener("change", () => {
    const selected = stateEl.value;
    const lgas = getLgasForState(selected);
    lgaEl.innerHTML = `<option value="">All LGAs</option>` + lgas.map(l => `<option value="${l}">${l}</option>`).join("");
    renderManagers();
  });

  [lgaEl, typeEl, searchEl, sortEl].forEach(el => el.addEventListener("input", renderManagers));
  clearBtn.addEventListener("click", () => {
    stateEl.value = "";
    lgaEl.innerHTML = `<option value="">All LGAs</option>`;
    typeEl.value = "";
    searchEl.value = "";
    sortEl.value = "toprated";
    renderManagers();
  });

  // ✅ Contact / Hire button logic + firmLeads tracking
  managerListEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-contact") || e.target.classList.contains("btn-hire")) {
      const id = e.target.dataset.id;
      const action = e.target.classList.contains("btn-hire") ? "hire" : "contact";
      const m = managers.find(x => x.id === id);
      if (!m) return alert("Manager not found!");

      const userEmail = sessionStorage.getItem("email") || "guest@renteasy";
      const userRole = sessionStorage.getItem("role") || "visitor";

      const newLead = {
        id: Date.now(),
        firmId: id,
        firmName: m.name,
        firmEmail: m.email,
        requestedBy: userEmail,
        role: userRole,
        action,
        state: m.state,
        lga: m.lga,
        timestamp: new Date().toISOString()
      };

      const leads = JSON.parse(localStorage.getItem("firmLeads") || "[]");
      leads.push(newLead);
      localStorage.setItem("firmLeads", JSON.stringify(leads));

      alert(`✅ ${action === "hire" ? "Hire request" : "Contact"} sent to ${m.name}`);
    }
  });
});

// ===== Utility functions =====

// Sample placeholder data
function getSampleManagers() {
  return [
    {
      id: "MGR-1",
      name: "Prime Estates Ltd.",
      company: "Prime Estates Ltd.",
      email: "prime@estate.com",
      state: "Lagos",
      lga: "Ikeja",
      serviceArea: "Ikeja",
      tier: "Verified Firm",
      rating: 4.9,
      reviews: 72,
      verifiedOn: "2025-03-15",
      logo: "images/prime.png",
      bio: "We manage high-end apartments and shortlets across Lagos.",
    },
    {
      id: "MGR-2",
      name: "Comfort Homes",
      company: "Comfort Homes Agency",
      email: "contact@comforthomes.ng",
      state: "Abuja",
      lga: "Garki",
      serviceArea: "Garki",
      tier: "Certified Partner",
      rating: 4.8,
      reviews: 51,
      verifiedOn: "2025-01-10",
      logo: "images/comfort.png",
      bio: "Trusted property managers serving central Abuja.",
    }
  ];
}

// LGAs per state (simplified sample)
function getLgasForState(state) {
  const data = {
    Lagos: ["Ikeja", "Surulere", "Yaba", "Lekki", "Epe"],
    Abuja: ["Garki", "Wuse", "Maitama", "Kubwa"],
    Enugu: ["Enugu North", "Enugu South", "Nsukka"],
    Rivers: ["Port Harcourt", "Obio/Akpor", "Eleme"]
  };
  return data[state] || [];
}