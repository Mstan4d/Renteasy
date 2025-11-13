/* Helper: generate ID */
function shortId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 900).toString(36);
}

let map, marker, geocoder;

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const steps = Array.from(document.querySelectorAll('.form-step'));
  const nextBtns = Array.from(document.querySelectorAll('.next-btn'));
  const prevBtns = Array.from(document.querySelectorAll('.prev-btn'));
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const postForm = document.getElementById('postForm');
  const summaryBox = document.getElementById('summaryBox');

  // Image inputs & previews
  const imageGroups = {
    kitchen: { input: document.getElementById('images-kitchen'), preview: document.getElementById('preview-kitchen') },
    dining: { input: document.getElementById('images-dining'), preview: document.getElementById('preview-dining') },
    outside: { input: document.getElementById('images-outside'), preview: document.getElementById('preview-outside') },
    inside: { input: document.getElementById('images-inside'), preview: document.getElementById('preview-inside') },
    other: { input: document.getElementById('images-other'), preview: document.getElementById('preview-other') }
  };

  // Track pending post data
  const pending = {
    id: shortId('LIST-'),
    title: '',
    description: '',
    price: 0,
    propertyType: '',
    posterType: '',
    contactPhone: '',
    locationText: '',
    lat: '',
    lng: '',
    images: { kitchen: [], dining: [], outside: [], inside: [], other: [] },
    timestamp: new Date().toISOString(),
    verified: false,
    referral: null
  };

  // Sidebar toggle
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('hidden'));
    const userName = sessionStorage.getItem('userName') || 'Guest';
    document.getElementById('userGreeting').textContent = userName;
  }

  // Parse referral from URL
  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get('ref');
  if (refFromUrl) pending.referral = refFromUrl;

  /* ---------- STEP NAV ---------- */
  function goToStep(stepId) {
    steps.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(stepId);
    if (target) target.classList.add('active');

    // update step indicators
    document.querySelectorAll('.step-indicator').forEach(ind => {
      ind.style.background = (ind.dataset.step === stepId.split('-')[1]) ? '#eaf2ff' : '#fff';
    });

    if (stepId === 'step-4') buildSummary();
  }

  nextBtns.forEach(btn => btn.addEventListener('click', () => {
    const next = btn.dataset.next;

    if (btn.closest('#step-1')) {
      const title = document.getElementById('title').value.trim();
      const desc = document.getElementById('description').value.trim();
      const price = document.getElementById('price').value;
      const propType = document.getElementById('propertyType').value;
      const posterType = document.getElementById('posterType').value;
      const phone = document.getElementById('contactPhone').value.trim();
      if (!title || !desc || !price || !propType || !phone) return alert('Please fill required basic fields.');
      pending.title = title;
      pending.description = desc;
      pending.price = Number(price);
      pending.propertyType = propType;
      pending.posterType = posterType;
      pending.contactPhone = phone;
    }

    if (btn.closest('#step-2')) {
      const loc = document.getElementById('locationText').value.trim();
      const lat = document.getElementById('lat').value.trim();
      const lng = document.getElementById('lng').value.trim();
      if (!loc) return alert('Please supply a location or address.');
      pending.locationText = loc;
      pending.lat = lat;
      pending.lng = lng;
    }

    goToStep(next);
  }));

  prevBtns.forEach(btn => btn.addEventListener('click', () => {
    const prev = btn.dataset.prev;
    goToStep(prev);
  }));

  /* ---------- IMAGE PREVIEW ---------- */
  Object.keys(imageGroups).forEach(key => {
    const group = imageGroups[key];
    if (!group.input) return;
    group.input.addEventListener('change', () => {
      group.preview.innerHTML = '';
      pending.images[key] = [];
      Array.from(group.input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = document.createElement('img');
          img.src = e.target.result;
          group.preview.appendChild(img);
          pending.images[key].push(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    });
  });

  /* ---------- CONFIRMATION ---------- */
  function buildSummary() {
    summaryBox.innerHTML = '';
    const wrap = document.createElement('div');

    wrap.innerHTML = `
      <h4>${pending.title}</h4>
      <p><strong>Type:</strong> ${pending.propertyType}</p>
      <p><strong>Price:</strong> ₦${Number(pending.price).toLocaleString()}</p>
      <p><strong>Description:</strong> ${pending.description}</p>
      <p><strong>Location:</strong> ${pending.locationText} ${pending.lat && pending.lng ? `(lat:${pending.lat}, lng:${pending.lng})` : ''}</p>
      <p><strong>Contact:</strong> ${pending.contactPhone}</p>
    `;

    const imgSummary = document.createElement('div');
    imgSummary.innerHTML = '<strong>Images:</strong>';
    Object.keys(pending.images).forEach(k => {
      if (pending.images[k].length) {
        const p = document.createElement('p');
        p.textContent = `${k}: ${pending.images[k].length} image(s)`;
        imgSummary.appendChild(p);
      }
    });
    wrap.appendChild(imgSummary);

    if (pending.referral) {
      const ref = document.createElement('p');
      ref.innerHTML = `<strong>Referred by:</strong> ${pending.referral}`;
      wrap.appendChild(ref);
    }

    summaryBox.appendChild(wrap);
  }

  /* ---------- POSTAS ---------- */
  document.querySelectorAll('.postas-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const as = btn.dataset.postas;
      sessionStorage.setItem('pendingPost', JSON.stringify(pending));
      sessionStorage.setItem('pendingPostAs', as);
      const userId = sessionStorage.getItem('userId');
      const role = sessionStorage.getItem('role');

      if (userId && role === as) {
        finalizeAndSavePost(as);
        return;
      }

      const forward = encodeURIComponent(window.location.pathname + window.location.search);
      if (as === 'manager') window.location.href = `manager-signup.html?forward=${forward}`;
      else window.location.href = `signup.html?role=${as}&forward=${forward}`;
    });
  });

  /* ---------- VERIFICATION ---------- */
  document.getElementById('requestVerification').addEventListener('click', () => {
    if (!pending.title) pending.title = document.getElementById('title').value.trim();
    if (!pending.title) return alert('Complete basic details first.');
    const adminQueue = JSON.parse(localStorage.getItem('adminListings')) || [];
    const adminEntry = {...pending, adminId: null, status:'PendingVerification', queuedAt:new Date().toISOString()};
    adminQueue.push(adminEntry);
    localStorage.setItem('adminListings', JSON.stringify(adminQueue));
    alert('Request sent to admin/manager for verification.');
  });

  /* ---------- FINALIZE ---------- */
  function finalizeAndSavePost(asRole) {
    const userId = sessionStorage.getItem('userId') || 'guest-' + shortId();
    pending.posterType = asRole;
    pending.userId = userId;
    pending.id = pending.id || shortId('LIST-');
    pending.timestamp = new Date().toISOString();
    const listings = JSON.parse(localStorage.getItem('listings')) || [];
    listings.push(pending);
    localStorage.setItem('listings', JSON.stringify(listings));
    sessionStorage.removeItem('pendingPost');
    sessionStorage.removeItem('pendingPostAs');
    alert('Listing posted! Awaiting admin approval.');
    window.location.href = 'dashboard.html';
  }

  function resumePendingIfAny() {
    const pend = sessionStorage.getItem('pendingPost');
    const pendAs = sessionStorage.getItem('pendingPostAs');
    if (!pend || !pendAs) return;
    Object.assign(pending, JSON.parse(pend));
    const role = sessionStorage.getItem('role');
    if (role && role === pendAs) finalizeAndSavePost(pendAs);
    else goToStep('step-4');
  }

  resumePendingIfAny();

  /* ---------- GOOGLE MAPS ---------- */
  window.initMap = function() {
    geocoder = new google.maps.Geocoder();
    const lat = parseFloat(pending.lat) || 6.5244;
    const lng = parseFloat(pending.lng) || 3.3792;
    const mapDiv = document.getElementById('map');
    map = new google.maps.Map(mapDiv, {
      center: {lat, lng},
      zoom: 15
    });

    marker = new google.maps.Marker({
      position: {lat, lng},
      map,
      draggable: true
    });

    // Update lat/lng when marker moved
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      document.getElementById('lat').value = pos.lat().toFixed(6);
      document.getElementById('lng').value = pos.lng().toFixed(6);
      pending.lat = pos.lat().toFixed(6);
      pending.lng = pos.lng().toFixed(6);
    });

    // Update map if address entered
    document.getElementById('locationText').addEventListener('blur', () => {
      const address = document.getElementById('locationText').value;
      if (!address) return;
      geocoder.geocode({address}, (results, status) => {
        if (status === 'OK') {
          map.setCenter(results[0].geometry.location);
          marker.setPosition(results[0].geometry.location);
          pending.lat = results[0].geometry.location.lat().toFixed(6);
          pending.lng = results[0].geometry.location.lng().toFixed(6);
          document.getElementById('lat').value = pending.lat;
          document.getElementById('lng').value = pending.lng;
        }
      });
    });
  };
});