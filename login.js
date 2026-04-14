const TICKETMASTER_API_KEY = "TXXauuZh0lKla6ztRD9zeXtDKRd3ze8D";

const paragraphs = [
  "✨ Transform your vision into reality! From intimate gatherings to grand celebrations, we bring your dream event to life with precision and creativity.",
  "🎤We are more than what meets the eye. We are storytellers – from strategic conceptualization to building it on ground.",
  "💫 Your story, our passion. We don't just plan events – we create experiences that leave lasting impressions on every guest.",
  "🌟 From concept to curtain call, we handle every detail. Let us turn your special occasion into a masterpiece of memories.",
  "🎯Upcoming Weddings - Celebrate love with unforgettable wedding events featuring elegant setups, full event production, and personalized touches for your special day.",
  "🎉Parties of All Kinds! This distinguished celebration is crafted to provide an elegant, memorable experience with entertainment, engaging activities, ceremonial cake-cutting, professional photography, and delightful dining. Your presence will make this milestone truly unforgettable."
];

let slideInterval = null;
let currentIndex = 0;
let slider = null;
let dots = [];

function createSlidingTextSection() {
  const slidingDiv = document.createElement('div');
  slidingDiv.className = 'sliding-text-container login-mode';
  slidingDiv.id = 'slidingTextContainer';
  slidingDiv.innerHTML = `
    <div class="slider-wrapper">
      <div class="slider" id="textSlider">
        ${paragraphs.map(p => `<div class="slide"><p>${escapeHtml(p)}</p></div>`).join('')}
      </div>
    </div>
    <div class="slider-dots" id="sliderDots">
      ${paragraphs.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`).join('')}
    </div>
  `;
  document.body.insertBefore(slidingDiv, document.body.firstChild);
  
  slider = document.getElementById('textSlider');
  dots = document.querySelectorAll('.dot');
  const totalSlides = paragraphs.length;
  
  function updateSlider(index) {
    currentIndex = index;
    slider.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((dot, i) => {
      if (i === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
  
  function nextSlide() {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateSlider(currentIndex);
  }
  
  if (slideInterval) clearInterval(slideInterval);
  slideInterval = setInterval(nextSlide, 8000);
  
  setTimeout(() => {
    const freshDots = document.querySelectorAll('.dot');
    console.log('Found dots:', freshDots.length);
    
    freshDots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Dot clicked!');
        
        clearInterval(slideInterval);
        const index = parseInt(dot.getAttribute('data-index'));
        updateSlider(index);
        slideInterval = setInterval(nextSlide, 8000);
      });
    });
  }, 100);
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function updateFormPosition(mode) {
  const modalOverlay = document.getElementById('authModal');
  const slidingText = document.getElementById('slidingTextContainer');
  
  if (mode === 'login') {
    modalOverlay.classList.remove('signup-mode');
    modalOverlay.classList.add('login-mode');
    if (slidingText) {
      slidingText.classList.remove('signup-mode');
      slidingText.classList.add('login-mode');
    }
  } else {
    modalOverlay.classList.remove('login-mode');
    modalOverlay.classList.add('signup-mode');
    if (slidingText) {
      slidingText.classList.remove('login-mode');
      slidingText.classList.add('signup-mode');
    }
  }
}

let users = JSON.parse(localStorage.getItem("eventhub_users")) || [
  { 
    email: "demo@example.com", 
    password: "demo123", 
    isGuest: false,
    reservations: [] 
  }
];

function saveUsers() {
  localStorage.setItem("eventhub_users", JSON.stringify(users));
}

function findUser(email) {
  return users.find(u => u.email === email);
}

function signup(email, password) {
  if (!email || !password) return { success: false, msg: "Email and password required" };
  if (findUser(email)) return { success: false, msg: "User already exists" };
  const newUser = { email, password, isGuest: false, reservations: [] };
  users.push(newUser);
  saveUsers();
  return { success: true, msg: "Account created! Please login." };
}

function login(email, password) {
  const user = findUser(email);
  if (!user || user.password !== password) return { success: false, msg: "Invalid credentials" };
  if (user.isGuest) return { success: false, msg: "Guest account conflict" };
  return { success: true, user: { email: user.email, isGuest: false, reservations: user.reservations || [] } };
}

function redirectToMain(userData) {
  sessionStorage.setItem('currentUser', JSON.stringify(userData));
  window.location.href = 'main.html';
}

let currentAuthMode = 'login';

function setAuthMode(mode) {
  currentAuthMode = mode;
  const submitBtn = document.getElementById("submitAuthBtn");
  if (mode === 'login') {
    submitBtn.innerText = "Log In";
    document.getElementById("switchAuthText").innerHTML = `Don't have an account? <span id="toggleMode">Sign up</span>`;
    updateFormPosition('login');
  } else {
    submitBtn.innerText = "Sign Up";
    document.getElementById("switchAuthText").innerHTML = `Already have an account? <span id="toggleMode">Log in</span>`;
    updateFormPosition('signup');
  }
  
  const newToggle = document.getElementById("toggleMode");
  if (newToggle) {
    const freshToggle = newToggle.cloneNode(true);
    newToggle.parentNode.replaceChild(freshToggle, newToggle);
    freshToggle.addEventListener("click", (e) => {
      if (currentAuthMode === 'login') setAuthMode('signup');
      else setAuthMode('login');
    });
  }
}

async function handleAuthSubmit() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  if (!email || !password) {
    alert("Please fill email and password");
    return;
  }
  if (currentAuthMode === 'signup') {
    const result = signup(email, password);
    if (result.success) {
      alert(result.msg + " Please login.");
      setAuthMode('login');
      document.getElementById("authEmail").value = email;
      document.getElementById("authPassword").value = "";
    } else {
      alert(result.msg);
    }
  } else {
    const result = login(email, password);
    if (result.success) {
      redirectToMain(result.user);
    } else {
      alert(result.msg);
    }
  }
}

function guestEntry() {
  const guestUser = { email: "Guest", isGuest: true, reservations: [] };
  redirectToMain(guestUser);
}

window.addEventListener("DOMContentLoaded", () => {
  createSlidingTextSection();
  setAuthMode('login');
  
  document.getElementById("submitAuthBtn").addEventListener("click", handleAuthSubmit);
  document.getElementById("guestBtn").addEventListener("click", guestEntry);
});