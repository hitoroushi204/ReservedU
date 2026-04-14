const TICKETMASTER_API_KEY = "TXXauuZh0lKla6ztRD9zeXtDKRd3ze8D";
let currentUser = null;

try {
  const storedUser = sessionStorage.getItem('currentUser');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
  } else {
    window.location.href = 'login.html';
  }
} catch (e) {
  window.location.href = 'login.html';
}

if (currentUser && !currentUser.reservations) {
  currentUser.reservations = [];
}

let users = JSON.parse(localStorage.getItem("eventhub_users")) || [
  { email: "demo@example.com", password: "demo123", isGuest: false, reservations: [] }
];

function saveUsers() {
  localStorage.setItem("eventhub_users", JSON.stringify(users));
}

function findUser(email) {
  return users.find(u => u.email === email);
}

function addReservationToUser(email, reservation) {
  const user = findUser(email);
  if (user && !user.isGuest) {
    if (!user.reservations) user.reservations = [];
    user.reservations.push({
      ...reservation,
      id: Date.now(),
      reservedAt: new Date().toISOString(),
      status: 'confirmed'  // Add status field
    });
    saveUsers();
    if (currentUser && currentUser.email === email) {
      currentUser.reservations = user.reservations;
    }
  }
}

function cancelReservation(email, reservationId) {
  const user = findUser(email);
  if (user && !user.isGuest) {
    const reservationIndex = user.reservations.findIndex(r => r.id === reservationId);
    if (reservationIndex !== -1) {
      user.reservations.splice(reservationIndex, 1);
      saveUsers();
      if (currentUser && currentUser.email === email) {
        currentUser.reservations = user.reservations;
      }
      return true;
    }
  }
  return false;
}

function getUserReservations(email) {
  const user = findUser(email);
  return user?.reservations || [];
}

function showReservationHistory() {
  if (!currentUser || currentUser.isGuest) {
    alert("Guest users don't have reservation history. Please sign up or log in!");
    return;
  }
  
  const reservations = getUserReservations(currentUser.email);
  const historyContent = document.getElementById("historyContent");
  
  if (reservations.length === 0) {
    historyContent.innerHTML = `<div class="no-history">📭 No reservations yet. Start exploring and book an event!</div>`;
  } else {
    historyContent.innerHTML = reservations.map(res => `
      <div class="history-item" data-reservation-id="${res.id}">
        <h4>🎫 ${escapeHtml(res.eventName)}</h4>
        <p><strong>📅 Date:</strong> ${res.reserveDate}</p>
        <p><strong>📍 Venue:</strong> ${escapeHtml(res.venue)}</p>
        <p><strong>👤 Booked for:</strong> ${escapeHtml(res.fullName)}</p>
        <p><strong>🕐 Reserved on:</strong> ${new Date(res.reservedAt).toLocaleString()}</p>
        <span class="history-status status-confirmed">✅ Confirmed</span>
        <button class="cancel-reservation-btn" data-id="${res.id}">❌ Cancel Reservation</button>
      </div>
    `).join('');
    
    document.querySelectorAll('.cancel-reservation-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const reservationId = parseInt(btn.getAttribute('data-id'));
        cancelReservationHandler(reservationId);
      });
    });
  }
  
  const historyModal = document.getElementById("historyModal");
  historyModal.style.visibility = "visible";
  historyModal.style.opacity = "1";
}

function cancelReservationHandler(reservationId) {
  const reservations = getUserReservations(currentUser.email);
  const reservation = reservations.find(r => r.id === reservationId);
  
  if (!reservation) {
    alert("Reservation not found!");
    return;
  }
  
  const confirmCancel = confirm(
    `Are you sure you want to cancel your reservation for "${reservation.eventName}" on ${reservation.reserveDate}?\n\nThis action cannot be undone.`
  );
  
  if (confirmCancel) {
    const success = cancelReservation(currentUser.email, reservationId);
    if (success) {
      alert(`✅ Reservation for "${reservation.eventName}" has been cancelled.`);
      showReservationHistory();
      if (eventsDataCache.length) renderEvents(eventsDataCache);
    } else {
      alert("Failed to cancel reservation. Please try again.");
    }
  }
}

let eventsDataCache = [];

async function fetchEvents(searchTerm = "music") {
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(searchTerm)}&size=20&apikey=${TICKETMASTER_API_KEY}`;
  try {
    console.log("Fetching events for:", searchTerm);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    if (data._embedded && data._embedded.events) {
      return data._embedded.events.map(ev => ({
        id: ev.id,
        name: ev.name,
        date: ev.dates?.start?.localDate || "Date TBA",
        venue: ev._embedded?.venues?.[0]?.name || "Venue unknown",
        image: ev.images?.find(img => img.width >= 640)?.url || ev.images?.[0]?.url || "https://placehold.co/600x400?text=Event",
        url: ev.url,
        info: ev.info || ev.description?.text || "No additional info available",
        priceRange: ev.priceRanges ? `$${ev.priceRanges[0].min} - $${ev.priceRanges[0].max}` : "Price on request"
      }));
    } else {
      console.log("No events found");
      return [];
    }
  } catch (err) {
    console.warn("API fetch error, using mock data:", err);
    return [
      { id: "mock1", name: "Summer Music Festival", date: "2025-07-15", venue: "Central Park", image: "https://picsum.photos/id/29/400/200", priceRange: "$49 - $129", info: "Live bands & food trucks" },
      { id: "mock2", name: "Tech Conference 2025", date: "2025-09-10", venue: "Convention Hall", image: "https://picsum.photos/id/0/400/200", priceRange: "$199", info: "Keynotes & networking" },
      { id: "mock3", name: "Jazz Night", date: "2025-06-20", venue: "Blue Note", image: "https://picsum.photos/id/144/400/200", priceRange: "$35", info: "Intimate jazz session" }
    ];
  }
}

function renderEvents(events) {
  const container = document.getElementById("eventsGrid");
  if (!events.length) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem;">✨ No events found. Try another keyword!</div>`;
    return;
  }
  container.innerHTML = events.map(event => `
    <div class="event-card" data-id="${event.id}" data-event='${JSON.stringify(event).replace(/'/g, "&#39;")}'>
      <img class="event-img" src="${event.image}" alt="${event.name}" loading="lazy" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
      <div class="event-info">
        <div class="event-title">${escapeHtml(event.name)}</div>
        <div class="event-date">📅 ${event.date}</div>
        <div class="event-venue">📍 ${event.venue}</div>
        ${currentUser && !currentUser.isGuest ? '<div style="margin-top:6px; font-size:0.7rem; color:#2c7da0;">🔑 Click to reserve</div>' : '<div class="guest-badge">👤 Guest mode: view only</div>'}
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const eventData = JSON.parse(card.getAttribute('data-event'));
      openEventDetail(eventData);
    });
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

let reservationStep = 'details';
let currentDetailEvent = null;

function openEventDetail(event) {
  currentDetailEvent = event;
  reservationStep = 'details';
  const detailDiv = document.getElementById("detailContent");
  const isLoggedIn = currentUser && !currentUser.isGuest;
  const rentDisabledAttr = !isLoggedIn ? 'disabled' : '';
  const rentButtonText = !isLoggedIn ? '🔒 Login to reserve' : '🎟️ Reserve / Rent this event';
  detailDiv.innerHTML = `
    <img src="${event.image}" alt="${event.name}" onerror="this.src='https://placehold.co/600x400?text=Event'">
    <h2 style="margin-top: 12px;">${escapeHtml(event.name)}</h2>
    <p><strong>📅 Date:</strong> ${event.date}</p>
    <p><strong>📍 Venue:</strong> ${event.venue}</p>
    <p><strong>💰 Price range:</strong> ${event.priceRange}</p>
    <p><strong>ℹ️ Info:</strong> ${event.info || "Experience this amazing event!"}</p>
    <button id="rentActionBtn" class="rent-btn" ${rentDisabledAttr}>${rentButtonText}</button>
    <div id="paymentStepContainer"></div>
  `;
  const modal = document.getElementById("detailModal");
  modal.style.visibility = "visible";
  modal.style.opacity = "1";

  const rentBtn = document.getElementById("rentActionBtn");
  if (rentBtn && isLoggedIn) {
    rentBtn.addEventListener("click", () => showPaymentStep(event));
  } else if (rentBtn && !isLoggedIn) {
    rentBtn.addEventListener("click", () => {
      alert("Please log in as a registered user to reserve events.");
    });
  }
}

function showPaymentStep(event) {
  if (reservationStep !== 'details') return;
  reservationStep = 'payment';
  const paymentContainer = document.getElementById("paymentStepContainer");
  paymentContainer.innerHTML = `
    <div class="payment-form">
      <h4>📋 Reservation details for "${escapeHtml(event.name)}"</h4>
      <label>Select date:</label>
      <input type="date" id="reserveDate" min="${new Date().toISOString().split('T')[0]}" value="${event.date !== 'Date TBA' ? event.date : ''}">
      <label>Full name on ticket:</label>
      <input type="text" id="fullName" placeholder="Your full name" required>
      <label>Card number (demo):</label>
      <input type="text" id="cardNum" placeholder="4242 4242 4242 4242" maxlength="19">
      <button id="confirmReserveBtn" class="btn-primary reserve-btn">✨ Reserve Now</button>
    </div>
  `;
  const confirmBtn = document.getElementById("confirmReserveBtn");
  confirmBtn.addEventListener("click", async () => {
    const reserveDate = document.getElementById("reserveDate").value;
    const fullName = document.getElementById("fullName").value;
    if (!reserveDate || !fullName) {
      alert("Please fill in reservation date and your full name.");
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 800));
    paymentContainer.innerHTML = `<div class="success-msg">✅ Reservation successful! You have reserved "${event.name}" on ${reserveDate} for ${fullName}. Enjoy the event!</div>`;
    reservationStep = 'success';
    const rentBtn = document.getElementById("rentActionBtn");
    if (rentBtn) rentBtn.disabled = true;
    
    if (currentUser && !currentUser.isGuest) {
      addReservationToUser(currentUser.email, {
        eventName: event.name,
        venue: event.venue,
        reserveDate: reserveDate,
        fullName: fullName,
        eventImage: event.image
      });
    }
  });
}

async function loadEventsAndRender(searchTerm = "music") {
  const grid = document.getElementById("eventsGrid");
  grid.innerHTML = `<div style="grid-column:1/-1; text-align:center;">🔍 Fetching ${searchTerm} events...</div>`;
  const events = await fetchEvents(searchTerm);
  eventsDataCache = events;
  renderEvents(events);
}

function updateUIForUser() {
  const userDisplaySpan = document.getElementById("usernameDisplay");
  const avatarSpan = document.getElementById("avatar");
  const dropdownAvatar = document.getElementById("dropdownAvatar");
  const dropdownUsername = document.getElementById("dropdownUsername");
  const dropdownEmail = document.getElementById("dropdownEmail");
  
  if (currentUser) {
    if (currentUser.isGuest) {
      userDisplaySpan.innerText = "Guest";
      avatarSpan.innerText = "👤";
      if (dropdownAvatar) dropdownAvatar.innerText = "👤";
      if (dropdownUsername) dropdownUsername.innerText = "Guest User";
      if (dropdownEmail) dropdownEmail.innerText = "Guest mode - no history";
    } else {
      const displayName = currentUser.email.split('@')[0];
      userDisplaySpan.innerText = displayName;
      avatarSpan.innerText = displayName.charAt(0).toUpperCase();
      if (dropdownAvatar) dropdownAvatar.innerText = displayName.charAt(0).toUpperCase();
      if (dropdownUsername) dropdownUsername.innerText = displayName;
      if (dropdownEmail) dropdownEmail.innerText = currentUser.email;
    }
  }
  if (eventsDataCache.length) renderEvents(eventsDataCache);
}

function logout() {
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

function toggleProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  dropdown.classList.toggle("show");
}

function closeProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  dropdown.classList.remove("show");
}

let activeCategories = new Set();
let currentSearchTerm = "concert";

const categoryKeywords = {
  'concert': 'concert',
  'festival': 'festival',
  'jazz': 'jazz',
  'rock': 'rock concert',
  'classical': 'classical music',
  'wedding': 'wedding',
  'anniversary': 'anniversary celebration',
  'birthday': 'birthday party',
  'engagement': 'engagement party',
  'party': 'party celebration',
  'club': 'nightlife club',
  'dinner': 'dinner event',
  'holiday': 'holiday celebration',
  'conference': 'business conference',
  'seminar': 'seminar workshop',
  'networking': 'networking event',
  'workshop': 'workshop training',
  'art': 'art exhibition',
  'theater': 'theater performance',
  'dance': 'dance show',
  'film': 'film screening movie',
  'sports': 'sports game',
  'marathon': 'marathon run',
  'outdoor': 'outdoor adventure'
};

function filterSidebarCategories(searchTerm) {
  const categoryItems = document.querySelectorAll('.category-item');
  const searchLower = searchTerm.toLowerCase();
  
  categoryItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (searchTerm === '' || text.includes(searchLower)) {
      item.style.display = '';
      const group = item.closest('.category-group');
      if (group) group.style.display = '';
    } else {
      item.style.display = 'none';
      const group = item.closest('.category-group');
      if (group && Array.from(group.querySelectorAll('.category-item')).every(el => el.style.display === 'none')) {
        group.style.display = 'none';
      } else if (group) {
        group.style.display = '';
      }
    }
  });
}

function toggleCategory(category, element) {
  if (activeCategories.has(category)) {
    activeCategories.delete(category);
    element.classList.remove('active');
  } else {
    activeCategories.add(category);
    element.classList.add('active');
  }
  updateActiveFiltersDisplay();
  applyFilters();
}

function clearAllFilters() {
  activeCategories.clear();
  const categoryItems = document.querySelectorAll('.category-item');
  categoryItems.forEach(item => {
    item.classList.remove('active');
  });
  updateActiveFiltersDisplay();
  applyFilters();
}

function updateActiveFiltersDisplay() {
  const container = document.getElementById('activeFilters');
  if (!container) return;
  
  if (activeCategories.size === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = Array.from(activeCategories).map(cat => `
    <div class="filter-tag">
      ${getCategoryIcon(cat)} ${getCategoryDisplayName(cat)}
      <span class="remove-filter" data-category="${cat}">✕</span>
    </div>
  `).join('');
  
  document.querySelectorAll('.remove-filter').forEach(removeBtn => {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const category = removeBtn.getAttribute('data-category');
      const element = document.querySelector(`.category-item[data-category="${category}"]`);
      if (element) {
        element.classList.remove('active');
      }
      activeCategories.delete(category);
      updateActiveFiltersDisplay();
      applyFilters();
    });
  });
}

function getCategoryIcon(category) {
  const icons = {
    'concert': '🎸', 'festival': '🎪', 'jazz': '🎷', 'rock': '🤘', 'classical': '🎻',
    'wedding': '💒', 'anniversary': '💝', 'birthday': '🎂', 'engagement': '💍',
    'party': '🎊', 'club': '🪩', 'dinner': '🍽️', 'holiday': '🎄',
    'conference': '📊', 'seminar': '📚', 'networking': '🤝', 'workshop': '🛠️',
    'art': '🖼️', 'theater': '🎭', 'dance': '💃', 'film': '🎬',
    'sports': '⚽', 'marathon': '🏃', 'outdoor': '🏕️'
  };
  return icons[category] || '📌';
}

function getCategoryDisplayName(category) {
  const names = {
    'concert': 'Concerts', 'festival': 'Festivals', 'jazz': 'Jazz & Blues', 'rock': 'Rock & Metal', 'classical': 'Classical',
    'wedding': 'Weddings', 'anniversary': 'Anniversaries', 'birthday': 'Birthdays', 'engagement': 'Engagements',
    'party': 'Parties', 'club': 'Nightlife', 'dinner': 'Dinner Parties', 'holiday': 'Holiday Events',
    'conference': 'Conferences', 'seminar': 'Seminars', 'networking': 'Networking', 'workshop': 'Workshops',
    'art': 'Art Exhibitions', 'theater': 'Theater', 'dance': 'Dance', 'film': 'Film Screenings',
    'sports': 'Sports', 'marathon': 'Marathons', 'outdoor': 'Outdoor'
  };
  return names[category] || category;
}

async function applyFilters() {
  let searchQuery = currentSearchTerm;
  
  if (activeCategories.size > 0) {
    const categoryKeywordsList = Array.from(activeCategories).map(cat => categoryKeywords[cat] || cat);
    searchQuery = categoryKeywordsList.join(' ');
  }
  
  const grid = document.getElementById("eventsGrid");
  grid.innerHTML = `<div style="grid-column:1/-1; text-align:center;">🔍 Searching for ${searchQuery}...</div>`;
  const events = await fetchEvents(searchQuery);
  eventsDataCache = events;
  renderEvents(events);
}

function initSidebarFilters() {
  const categoryItems = document.querySelectorAll('.category-item');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const sidebarSearchInput = document.getElementById('sidebarSearchInput');
  
  console.log("Found category items:", categoryItems.length);
  
  categoryItems.forEach(item => {
    item.addEventListener('click', () => {
      const category = item.getAttribute('data-category');
      console.log("Category clicked:", category);
      toggleCategory(category, item);
    });
  });
  
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  }
  
  if (sidebarSearchInput) {
    sidebarSearchInput.addEventListener('input', (e) => {
      filterSidebarCategories(e.target.value);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  updateUIForUser();
  loadEventsAndRender("concert");
  
  initSidebarFilters();

  const profileIcon = document.getElementById("profileIcon");
  if (profileIcon) {
    profileIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleProfileDropdown();
    });
  }
  
  document.addEventListener("click", (e) => {
    const profileIcon = document.getElementById("profileIcon");
    const dropdown = document.getElementById("profileDropdown");
    if (profileIcon && dropdown && !profileIcon.contains(e.target)) {
      closeProfileDropdown();
    }
  });
  
  const dropdownLogoutBtn = document.getElementById("dropdownLogoutBtn");
  if (dropdownLogoutBtn) {
    dropdownLogoutBtn.addEventListener("click", () => {
      closeProfileDropdown();
      logout();
    });
  }
  
  const reservationHistoryBtn = document.getElementById("reservationHistoryBtn");
  if (reservationHistoryBtn) {
    reservationHistoryBtn.addEventListener("click", () => {
      closeProfileDropdown();
      showReservationHistory();
    });
  }
  
  const logoutHeaderBtn = document.getElementById("logoutHeaderBtn");
  if (logoutHeaderBtn) {
    logoutHeaderBtn.addEventListener("click", logout);
  }
  
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", async () => {
      const searchVal = document.getElementById("searchInput").value.trim();
      if (!searchVal) return;
      currentSearchTerm = searchVal;
      clearAllFilters();
      await loadEventsAndRender(searchVal);
    });
  }
  
  const detailModal = document.getElementById("detailModal");
  const closeDetailBtn = document.getElementById("closeDetailBtn");
  if (closeDetailBtn) {
    closeDetailBtn.addEventListener("click", () => {
      detailModal.style.visibility = "hidden";
      detailModal.style.opacity = "0";
    });
  }
  window.addEventListener("click", (e) => {
    if (e.target === detailModal) {
      detailModal.style.visibility = "hidden";
      detailModal.style.opacity = "0";
    }
  });
  
  const historyModal = document.getElementById("historyModal");
  const closeHistoryBtn = document.getElementById("closeHistoryBtn");
  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener("click", () => {
      historyModal.style.visibility = "hidden";
      historyModal.style.opacity = "0";
    });
  }
  window.addEventListener("click", (e) => {
    if (e.target === historyModal) {
      historyModal.style.visibility = "hidden";
      historyModal.style.opacity = "0";
    }
  });
});