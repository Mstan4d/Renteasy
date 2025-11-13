document.addEventListener("DOMContentLoaded", () => {
  const reviewForm = document.getElementById("reviewForm");
  const reviewList = document.getElementById("reviewList");

  // Get current listing ID from sessionStorage (set when user clicks a listing)
  const currentListingId = sessionStorage.getItem ("currentListingId");

  // Load reviews from localStorage
  function loadReviews() {
    const allReviews = JSON.parse(localStorage.getItem("reviews")) || {};
    const listingReviews = allReviews[currentListingId] || [];

    reviewList.innerHTML = "";
    listingReviews.forEach(review => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${review.name}</strong> 
        <span class="stars">${"⭐".repeat(review.rating)}</span>
        <p>${review.comment}</p>
      `;
      reviewList.appendChild(li);
    });
  }

  // Save review
  if (reviewForm) {
    reviewForm.addEventListener("submit", e => {
      e.preventDefault();

      const name = document.getElementById("reviewerName").value.trim();
      const rating = parseInt(document.getElementById("reviewRating").value);
      const comment = document.getElementById("reviewComment").value.trim();

      if (!name || !rating || !comment) return;

      const allReviews = JSON.parse(localStorage.getItem("reviews")) || {};
      if (!allReviews[currentListingId]) {
        allReviews[currentListingId] = [];
      }

      allReviews[currentListingId].push({ name, rating, comment });
      localStorage.setItem("reviews", JSON.stringify(allReviews));

      reviewForm.reset();
      loadReviews();
    });
  }

  loadReviews();
});