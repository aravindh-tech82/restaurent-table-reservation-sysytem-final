// app.js - Core controller, routing, page view manager & logic

// State Management for active booking wizard
let bookingState = {
  restaurantId: 'luxe-1', // single luxury restaurant simulation
  date: '',
  timeSlot: '',
  guests: 2,
  seatingArea: 'indoor',
  selectedTableId: null,
  tableName: ''
};

// Global Notifications Utility
window.showNotification = function(message, type = 'info') {
  const alertBanner = document.getElementById('global-alert-banner');
  if (!alertBanner) return;

  alertBanner.className = `alert-banner active ${type}`;
  
  // Icon based on type
  let iconHtml = '';
  if (type === 'success') iconHtml = '<i class="lucide-check-circle-2">✓</i>';
  else if (type === 'error') iconHtml = '<i class="lucide-alert-circle">✗</i>';
  else iconHtml = '<i class="lucide-info">ℹ</i>';

  alertBanner.innerHTML = `${iconHtml} <span>${message}</span>`;

  setTimeout(() => {
    alertBanner.classList.remove('active');
  }, 3500);
};

// DOM Content Loaded Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initial Sync of Database Cache from Backend API
  await db.init();

  // 2. Setup theme switcher
  setupTheme();

  // 3. Routing Init
  handleRouting();
  window.addEventListener('hashchange', handleRouting);

  // 4. Handle Splash Screen transition
  const splash = document.getElementById('page-splash');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('fade-out');
      // After transition finishes, remove from flow
      setTimeout(() => splash.style.display = 'none', 600);
    }, 2200);
  }

  // 5. Global Form Event Listeners
  setupFormListeners();

  // 6. AI Chatbot UI setup
  setupChatbotUI();

  // 7. Custom luxury effects
  initCustomCursor();
  initGlitterBackground();

  // 8. Google Sign-In init
  initGoogleSignIn();
});

// Theme setup (Dark by default, toggles light)
function setupTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;
  
  const savedTheme = localStorage.getItem('luxe_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    toggleBtn.innerHTML = '🌙'; // moon to switch back to dark
  }

  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('luxe_theme', isLight ? 'light' : 'dark');
    toggleBtn.innerHTML = isLight ? '🌙' : '☀️';
    
    // Refresh charts if we are on dashboard page
    if (window.location.hash.startsWith('#reports')) {
      initReportsPage();
    }
  });
}

// Client Side Router
function handleRouting() {
  const hash = window.location.hash || '#welcome';
  const pages = document.querySelectorAll('.page');
  const navLinks = document.querySelectorAll('.nav-link');
  
  // Clean up any 3D environment when leaving seating layout
  if (hash !== '#table-layout') {
    threeDLayout.destroy();
  }

  // Clean up or initialize 3D Hero cloche on Welcome page
  if (hash === '#welcome') {
    setTimeout(() => {
      threeDLayout.initHero('home-3d-hero-container');
    }, 100);
  } else {
    threeDLayout.destroyHero();
  }

  // Find target page element
  let targetPageId = hash.replace('#', 'page-');
  let targetPage = document.getElementById(targetPageId);
  
  if (!targetPage) {
    targetPage = document.getElementById('page-welcome');
  }

  // Role-Based Route Guarding
  const currentUser = db.getCurrentUser();
  const isAdminRoute = hash.startsWith('#admin') || hash === '#manage-tables' || hash === '#manage-reservations' || hash === '#customer-management' || hash === '#reports';
  const isCustomerRoute = hash === '#my-reservations' || hash === '#profile' || hash === '#table-reservation' || hash === '#table-layout' || hash === '#confirmation' || hash === '#payment' || hash === '#success';

  if (isAdminRoute) {
    if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'Staff')) {
      window.showNotification('Access denied. Admin or Staff privileges required.', 'error');
      window.location.hash = '#login';
      return;
    }
  }

  if (isCustomerRoute) {
    if (!currentUser) {
      window.showNotification('Please log in to continue.', 'error');
      window.location.hash = '#login';
      return;
    }
  }

  // Deactivate all pages and activate target
  pages.forEach(p => p.classList.remove('active'));
  targetPage.classList.add('active');

  // Update navigation link highlights
  navLinks.forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Header display details
  updateHeaderNav(currentUser);

  // Initialize specific page contents
  initializePage(hash);
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update Nav bar buttons based on role
function updateHeaderNav(user) {
  const guestNav = document.getElementById('nav-guest-links');
  const customerNav = document.getElementById('nav-customer-links');
  const adminNav = document.getElementById('nav-admin-links');
  const userBadge = document.getElementById('nav-user-badge');

  if (guestNav) guestNav.style.display = 'none';
  if (customerNav) customerNav.style.display = 'none';
  if (adminNav) adminNav.style.display = 'none';
  if (userBadge) userBadge.style.display = 'none';

  if (!user) {
    if (guestNav) guestNav.style.display = 'flex';
  } else {
    if (userBadge) {
      userBadge.style.display = 'flex';
      userBadge.querySelector('.user-name').textContent = user.name;
      userBadge.querySelector('.user-role').textContent = `(${user.role})`;
    }
    
    if (user.role === 'Admin' || user.role === 'Staff') {
      if (adminNav) adminNav.style.display = 'flex';
    } else {
      if (customerNav) customerNav.style.display = 'flex';
    }
  }
}

// Router Initializer Hooks
function initializePage(hash) {
  switch(hash) {
    case '#welcome':
      initWelcomePage();
      break;
    case '#home':
      initHomePage();
      break;
    case '#restaurant-details':
      initDetailsPage();
      break;
    case '#table-reservation':
      initReservationSetupPage();
      break;
    case '#table-layout':
      initTable3DLayoutPage();
      break;
    case '#confirmation':
      initConfirmationPage();
      break;
    case '#payment':
      initPaymentPage();
      break;
    case '#success':
      initSuccessPage();
      break;
    case '#my-reservations':
      initMyReservationsPage();
      break;
    case '#profile':
      initProfilePage();
      break;
    case '#admin-dashboard':
      initAdminDashboard();
      break;
    case '#manage-tables':
      initManageTablesPage();
      break;
    case '#manage-reservations':
      initManageReservationsPage();
      break;
    case '#customer-management':
      initCustomerManagementPage();
      break;
    case '#reports':
      initReportsPage();
      break;
  }
}

// Page Initializers

function initWelcomePage() {
  const reviewsList = document.getElementById('welcome-reviews-list');
  if (reviewsList) {
    const reviews = db.getReviews();
    reviewsList.innerHTML = reviews.slice(0, 3).map(r => `
      <div class="card review-item">
        <div class="review-header">
          <span class="review-user">${r.userName}</span>
          <span style="color: var(--gold-primary); font-weight: bold;">${'★'.repeat(r.rating)}</span>
        </div>
        <p class="review-comment">"${r.comment}"</p>
      </div>
    `).join('');
  }
}

function initHomePage() {
  const container = document.getElementById('featured-list');
  if (container) {
    container.innerHTML = `
      <div class="card restaurant-card" onclick="window.location.hash='#restaurant-details'">
        <img src="assets/banner.jpg" class="restaurant-img" alt="Luxe Dining banner">
        <div class="restaurant-info">
          <div class="restaurant-name">Luxe Dining Restaurant</div>
          <div class="restaurant-meta">
            <span class="rating-badge">★ 4.9</span>
            <span>$$$$</span>
            <span>Gourmet Cuisine</span>
          </div>
          <p class="restaurant-desc">Experience fine Michelin-starred gastronomy blended with modern interactive 3D table selection and impeccable tableside service.</p>
          <div class="card-footer">
            <span style="color: var(--gold-primary); font-weight: 500;">Open Today: 12 PM - 11 PM</span>
            <button class="btn btn-primary btn-sm">Explore Menu</button>
          </div>
        </div>
      </div>
    `;
  }
}

function initDetailsPage() {
  const reviewsContainer = document.getElementById('details-reviews-list');
  if (reviewsContainer) {
    const reviews = db.getReviews();
    reviewsContainer.innerHTML = reviews.map(r => `
      <div class="review-item">
        <div class="review-header">
          <span class="review-user">${r.userName}</span>
          <span style="color: var(--gold-primary); font-size: 0.9rem;">${'★'.repeat(r.rating)}</span>
        </div>
        <p class="review-comment">${r.comment}</p>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${r.date}</span>
      </div>
    `).join('');
  }
}

function initReservationSetupPage() {
  const dateInput = document.getElementById('booking-date');
  if (dateInput && !dateInput.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().split('T')[0];
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  // Setup peak warning indicators from backend Gemini AI model
  const checkPeakTime = async () => {
    const dateVal = dateInput.value;
    const slotVal = document.querySelector('.time-slot-btn.selected')?.dataset.slot;
    const warningDiv = document.getElementById('peak-warning-container');
    
    if (dateVal && slotVal && warningDiv) {
      // Calculate local probability risk immediately
      const prob = chatbot.getPeakTimeProbability(dateVal, slotVal);
      
      warningDiv.style.display = 'block';
      warningDiv.querySelector('.peak-pct').textContent = `${prob}%`;
      warningDiv.querySelector('.peak-desc').textContent = '🤖 Luxe AI is compiling predictive analytics...';
      
      try {
        const res = await fetch('/api/ai/predict-peak-hours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateVal, timeSlot: slotVal })
        });
        const data = await res.json();
        if (data.success) {
          warningDiv.querySelector('.peak-desc').innerHTML = data.reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }
      } catch (e) {
        warningDiv.querySelector('.peak-desc').textContent = 'Highly booked peak hour! We suggest VIP table selection or earlier slots for optimal experience.';
      }
    }
  };

  const slotButtons = document.querySelectorAll('.time-slot-btn');
  slotButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      slotButtons.forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');
      bookingState.timeSlot = e.target.dataset.slot;
      checkPeakTime();
    });
  });

  const seatOptions = document.querySelectorAll('.seating-option');
  seatOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      const target = e.currentTarget;
      seatOptions.forEach(o => o.classList.remove('selected'));
      target.classList.add('selected');
      bookingState.seatingArea = target.dataset.area;
    });
  });

  dateInput.addEventListener('change', checkPeakTime);
}

function initTable3DLayoutPage() {
  const dateInput = document.getElementById('booking-date');
  const guestsInput = document.getElementById('booking-guests');
  const slotSelected = document.querySelector('.time-slot-btn.selected');

  if (!dateInput || !slotSelected) {
    window.showNotification('Please fill in booking details first.', 'error');
    window.location.hash = '#table-reservation';
    return;
  }

  bookingState.date = dateInput.value;
  bookingState.guests = parseInt(guestsInput.value);
  bookingState.timeSlot = slotSelected.dataset.slot;

  document.getElementById('layout-info-header').textContent = `Tables for ${bookingState.date} @ ${bookingState.timeSlot} (${bookingState.seatingArea.toUpperCase()})`;

  const sidePanel = document.getElementById('layout-selection-details');
  const reserveBtn = document.getElementById('layout-reserve-submit');
  
  if (sidePanel) {
    sidePanel.innerHTML = `<div class="text-center var-muted">Please click an available table in the 3D map to select.</div>`;
  }
  if (reserveBtn) reserveBtn.disabled = true;

  // Render Table Layout (delayed slightly to allow transition animations to settle)
  setTimeout(() => {
    threeDLayout.init('three-d-canvas-container', (tableId) => {
      const tables = db.getTables();
      const table = tables.find(t => t.id === tableId);
      if (table) {
        bookingState.selectedTableId = table.id;
        bookingState.tableName = table.name;

        if (sidePanel) {
          sidePanel.innerHTML = `
            <span class="table-badge-large">${table.name}</span>
            <div class="sidebar-row mt-4"><span>Category:</span> <strong>${table.category}</strong></div>
            <div class="sidebar-row"><span>Max Capacity:</span> <strong>${table.capacity} guests</strong></div>
            <div class="sidebar-row"><span>Area:</span> <strong>${table.area.toUpperCase()}</strong></div>
            <div class="sidebar-row"><span>Occasion Match:</span> <strong style="color: var(--gold-primary);">High Fidelity</strong></div>
            
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 10px; line-height:1.5;">
              ${bookingState.guests > table.capacity 
                ? `<span style="color: var(--accent-red);">⚠ Group size exceeds table capacity!</span>` 
                : `✓ Perfect match for your group of ${bookingState.guests}.`}
            </div>
          `;
        }
        if (reserveBtn) {
          reserveBtn.disabled = bookingState.guests > table.capacity;
        }
      }
    });
    threeDLayout.update(bookingState.date, bookingState.timeSlot);
  }, 150);

  // Pull dynamic table recommendations from Gemini
  const existingRecommendBox = document.getElementById('layout-ai-recommendation-box');
  if (existingRecommendBox) existingRecommendBox.remove();

  if (sidePanel) {
    const aiBox = document.createElement('div');
    aiBox.id = 'layout-ai-recommendation-box';
    aiBox.style.marginTop = '20px';
    aiBox.style.padding = '12px';
    aiBox.style.background = 'rgba(229,193,133,0.06)';
    aiBox.style.border = '1px dashed var(--gold-primary)';
    aiBox.style.borderRadius = '8px';
    aiBox.style.fontSize = '0.82rem';
    aiBox.style.lineHeight = '1.4';
    aiBox.innerHTML = '🤖 <strong>Luxe AI Suggestion:</strong> Analysing tables layout...';
    
    sidePanel.parentElement.appendChild(aiBox);
    
    fetch('/api/ai/recommend-table', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guests: bookingState.guests,
        area: bookingState.seatingArea,
        occasion: 'fine dining'
      })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        aiBox.innerHTML = `🤖 <strong>Luxe AI Recommends:</strong><br>${data.reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}`;
      }
    })
    .catch(() => {
      aiBox.innerHTML = `🤖 <strong>Luxe AI Recommends:</strong> VIP suites and Patio garden tables are highly recommended for your group.`;
    });
  }
}

function initConfirmationPage() {
  const user = db.getCurrentUser();
  if (!user || !bookingState.selectedTableId) {
    window.location.hash = '#home';
    return;
  }

  document.getElementById('conf-name').textContent = user.name;
  document.getElementById('conf-email').textContent = user.email;
  document.getElementById('conf-phone').textContent = user.phone;
  document.getElementById('conf-date').textContent = bookingState.date;
  document.getElementById('conf-slot').textContent = bookingState.timeSlot;
  document.getElementById('conf-guests').textContent = bookingState.guests;
  document.getElementById('conf-table').textContent = bookingState.tableName;
  document.getElementById('conf-area').textContent = bookingState.seatingArea.toUpperCase();
}

function initSuccessPage() {
  const recentBookingId = localStorage.getItem('luxe_recent_booking_id') || 'RES-9999';
  document.getElementById('success-booking-id').textContent = recentBookingId;
}

function showMockPaymentModal(data, options) {
  const overlay = document.createElement('div');
  overlay.id = 'mock-payment-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0, 0, 0, 0.82)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '99999';
  overlay.style.backdropFilter = 'blur(8px)';

  const modal = document.createElement('div');
  modal.className = 'card';
  modal.style.width = '90%';
  modal.style.maxWidth = '400px';
  modal.style.padding = '24px';
  modal.style.border = '1px solid var(--gold-primary)';
  modal.style.background = '#240407'; // Burgundy
  modal.style.color = '#fffff0'; // Ivory
  modal.style.textAlign = 'center';
  modal.style.borderRadius = '12px';

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(229,193,133,0.15); padding-bottom:12px;">
      <span style="font-family:var(--font-header); font-size:1.15rem; color:var(--gold-primary); font-weight:bold;">Razorpay Sandbox Simulator</span>
      <span id="close-mock-pay" style="cursor:pointer; font-size:1.4rem; color:var(--text-muted); font-weight:bold;">&times;</span>
    </div>
    
    <div style="font-size:0.82rem; text-align:left; margin-bottom:20px; color: var(--text-secondary); line-height: 1.5;">
      <div style="margin-bottom:6px;"><strong>Merchant:</strong> Luxe Dining</div>
      <div style="margin-bottom:6px;"><strong>Description:</strong> VIP Table Booking Deposit</div>
      <div style="margin-bottom:6px;"><strong>Amount:</strong> ₹500.00</div>
      <div style="margin-bottom:6px;"><strong>Order ID:</strong> <code style="color:var(--gold-primary); font-family:monospace;">${data.orderId}</code></div>
    </div>

    <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(229,193,133,0.1); padding:16px; border-radius:8px; margin-bottom:24px; text-align:left;">
      <label style="font-size:0.75rem; font-weight:bold; color:var(--gold-primary); display:block; margin-bottom:12px; letter-spacing: 0.5px;">SIMULATION OPTIONS</label>
      
      <div style="margin-bottom:12px;">
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size: 0.85rem;">
          <input type="radio" name="mock-pay-method" value="upi_success" checked style="accent-color:var(--gold-primary); width:15px; height:15px;">
          <span>UPI (GPay / PhonePe / Paytm) - Success</span>
        </label>
      </div>

      <div style="margin-bottom:12px;">
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size: 0.85rem;">
          <input type="radio" name="mock-pay-method" value="card_success" style="accent-color:var(--gold-primary); width:15px; height:15px;">
          <span>Credit / Debit Card - Success</span>
        </label>
      </div>

      <div>
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size: 0.85rem;">
          <input type="radio" name="mock-pay-method" value="fail" style="accent-color:var(--gold-primary); width:15px; height:15px;">
          <span>Simulate Payment Failure</span>
        </label>
      </div>
    </div>

    <button id="submit-mock-pay" class="btn btn-primary w-100" style="margin-bottom:10px;">Simulate Payment Receipt (₹500.00)</button>
    <button id="cancel-mock-pay" class="btn btn-secondary w-100">Cancel Payment</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const cleanUp = () => {
    overlay.remove();
    const payBtn = document.getElementById('razorpay-pay-btn');
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = 'Pay with UPI / Razorpay (₹500.00)';
    }
  };

  modal.querySelector('#close-mock-pay').addEventListener('click', () => {
    cleanUp();
    if (options.modal && options.modal.ondismiss) options.modal.ondismiss();
  });
  
  modal.querySelector('#cancel-mock-pay').addEventListener('click', () => {
    cleanUp();
    if (options.modal && options.modal.ondismiss) options.modal.ondismiss();
  });

  modal.querySelector('#submit-mock-pay').addEventListener('click', () => {
    const selected = modal.querySelector('input[name="mock-pay-method"]:checked').value;
    
    if (selected === 'fail') {
      window.showNotification('Simulated sandbox payment rejected.', 'error');
      cleanUp();
      if (options.modal && options.modal.ondismiss) options.modal.ondismiss();
    } else {
      const mockResponse = {
        razorpay_order_id: data.orderId,
        razorpay_payment_id: 'pay_mock_' + Date.now() + Math.floor(Math.random() * 1000),
        razorpay_signature: 'sig_mock_verified'
      };
      cleanUp();
      options.handler(mockResponse);
    }
  });
}

function initPaymentPage() {
  const payBtn = document.getElementById('razorpay-pay-btn');
  const skipBtn = document.getElementById('payment-skip-btn');
  const user = db.getCurrentUser();

  if (!user) {
    window.location.hash = '#login';
    return;
  }

  // 1. Pay with Razorpay button listener
  if (payBtn) {
    const newPayBtn = payBtn.cloneNode(true);
    payBtn.parentNode.replaceChild(newPayBtn, payBtn);

    newPayBtn.addEventListener('click', async () => {
      newPayBtn.disabled = true;
      newPayBtn.textContent = 'Preparing secure checkout...';

      try {
        const res = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 50000 }) // ₹500 in paise
        });
        const data = await res.json();

        if (!data.success) {
          window.showNotification('Failed to initialize payment order.', 'error');
          newPayBtn.disabled = false;
          newPayBtn.textContent = 'Pay with UPI / Razorpay (₹500.00)';
          return;
        }

        const options = {
          key: data.key,
          amount: data.amount,
          currency: 'INR',
          name: 'Luxe Dining',
          description: 'VIP Table Booking Deposit',
          order_id: data.orderId,
          handler: async function (response) {
            window.showNotification('Verifying payment details...', 'info');

            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id || data.orderId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature || ''
                })
              });
              const verifyData = await verifyRes.json();

              if (verifyData.success) {
                window.showNotification('Payment verified successfully!', 'success');

                // Write booking to database
                const bookingParams = {
                  userId: user.id,
                  userName: user.name,
                  userEmail: user.email,
                  userPhone: user.phone,
                  tableId: bookingState.selectedTableId,
                  tableName: bookingState.tableName,
                  date: bookingState.date,
                  timeSlot: bookingState.timeSlot,
                  guests: bookingState.guests,
                  seatingArea: bookingState.seatingArea,
                  notes: (document.getElementById('booking-special-requests')?.value || '') + '\n[Deposit Paid: ₹500 via Razorpay UPI]'
                };

                const bookRes = await db.createReservation(bookingParams);
                if (bookRes.success) {
                  localStorage.setItem('luxe_recent_booking_id', bookRes.reservation.id);
                  await db.sendNotification(
                    user.id,
                    'Payment Received',
                    `Table reservation deposit of ₹500 verified for booking ${bookRes.reservation.id}. Welcome drink unlocked!`,
                    'success'
                  );
                  window.location.hash = '#success';
                } else {
                  window.showNotification('Booking failed. Please contact customer support.', 'error');
                }
              } else {
                window.showNotification('Verification failed: ' + verifyData.message, 'error');
              }
            } catch (err) {
              console.error('Verify payment error:', err);
              window.showNotification('Unable to verify payment signature.', 'error');
            }

            newPayBtn.disabled = false;
            newPayBtn.textContent = 'Pay with UPI / Razorpay (₹500.00)';
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone
          },
          theme: {
            color: '#240407'
          },
          modal: {
            ondismiss: function () {
              newPayBtn.disabled = false;
              newPayBtn.textContent = 'Pay with UPI / Razorpay (₹500.00)';
              window.showNotification('Payment process cancelled.', 'info');
            }
          }
        };

        if (data.isMock) {
          showMockPaymentModal(data, options);
        } else {
          const rzp = new Razorpay(options);
          rzp.open();
        }

      } catch (err) {
        console.error('Launch checkout error:', err);
        window.showNotification('Error starting Razorpay checkout window.', 'error');
        newPayBtn.disabled = false;
        newPayBtn.textContent = 'Pay with UPI / Razorpay (₹500.00)';
      }
    });
  }

  // 2. Skip Payment button listener
  if (skipBtn) {
    const newSkipBtn = skipBtn.cloneNode(true);
    skipBtn.parentNode.replaceChild(newSkipBtn, skipBtn);

    newSkipBtn.addEventListener('click', async () => {
      newSkipBtn.disabled = true;
      newSkipBtn.textContent = 'Booking your table...';

      const bookingParams = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        tableId: bookingState.selectedTableId,
        tableName: bookingState.tableName,
        date: bookingState.date,
        timeSlot: bookingState.timeSlot,
        guests: bookingState.guests,
        seatingArea: bookingState.seatingArea,
        notes: (document.getElementById('booking-special-requests')?.value || '') + '\n[Deposit skipped: Booked only]'
      };

      const bookRes = await db.createReservation(bookingParams);
      if (bookRes.success) {
        localStorage.setItem('luxe_recent_booking_id', bookRes.reservation.id);
        window.showNotification('Booking successfully confirmed without deposit!', 'success');
        window.location.hash = '#success';
      } else {
        window.showNotification('Booking failed: ' + bookRes.message, 'error');
      }

      newSkipBtn.disabled = false;
      newSkipBtn.textContent = 'Skip Payment / Book Only';
    });
  }
}

function initMyReservationsPage() {
  const user = db.getCurrentUser();
  const listContainer = document.getElementById('reservations-list');
  if (!listContainer || !user) return;

  const reservations = db.getReservations().filter(r => r.userId === user.id);

  if (reservations.length === 0) {
    listContainer.innerHTML = `<div class="card text-center text-muted">You have no active or past bookings.</div>`;
    return;
  }

  reservations.sort((a,b) => new Date(b.date + 'T' + b.timeSlot) - new Date(a.date + 'T' + a.timeSlot));

  const today = new Date().toISOString().split('T')[0];

  listContainer.innerHTML = reservations.map(res => {
    const isUpcoming = res.date >= today && res.status !== 'Cancelled';
    const hasFeedback = !!res.feedback;

    let actionsHtml = '';
    if (isUpcoming) {
      actionsHtml = `<button class="btn btn-danger btn-sm" onclick="cancelBookingDirect('${res.id}')">Cancel Booking</button>`;
    } else if (res.status === 'Approved' && !hasFeedback) {
      actionsHtml = `
        <div class="feedback-form-compact mt-4">
          <p style="font-size: 0.85rem; font-weight: 500; margin-bottom: 6px;">Leave Dining Feedback:</p>
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
            <select id="feed-rate-${res.id}" class="input-control" style="width: 80px; padding: 4px 8px;">
              <option value="5">5 ★</option>
              <option value="4">4 ★</option>
              <option value="3">3 ★</option>
              <option value="2">2 ★</option>
              <option value="1">1 ★</option>
            </select>
            <input type="text" id="feed-comm-${res.id}" placeholder="Your comment" class="input-control" style="flex: 1; padding: 4px 10px; font-size: 0.85rem;">
            <button class="btn btn-primary btn-sm" style="padding: 4px 12px; font-size: 0.85rem;" onclick="submitFeedbackDirect('${res.id}')">Submit</button>
          </div>
        </div>
      `;
    } else if (hasFeedback) {
      actionsHtml = `
        <div class="mt-4" style="font-size: 0.85rem; border-top: 1px dashed var(--border-glass); padding-top: 10px;">
          <span style="color: var(--gold-primary); font-weight: bold;">Your Review:</span> ${'★'.repeat(res.feedback.rating)} - <span style="font-style: italic; color: var(--text-secondary);">"${res.feedback.comment}"</span>
        </div>
      `;
    }

    return `
      <div class="card booking-card">
        <div class="booking-main-info">
          <span class="booking-id-tag">${res.id}</span>
          <div class="booking-title">${res.tableName} (${res.seatingArea.toUpperCase()})</div>
          <div class="booking-meta-row">
            <span>📅 ${res.date}</span>
            <span>⏰ ${res.timeSlot}</span>
            <span>👥 ${res.guests} Guests</span>
          </div>
        </div>
        <div>
          <span class="status-badge ${res.status}">${res.status}</span>
          <div class="mt-2 text-right">${actionsHtml}</div>
        </div>
      </div>
    `;
  }).join('');
}

function initProfilePage() {
  const user = db.getCurrentUser();
  if (!user) return;

  document.getElementById('prof-name-title').textContent = user.name;
  document.getElementById('prof-email-title').textContent = user.email;
  document.getElementById('prof-avatar-letter').textContent = user.name.charAt(0).toUpperCase();

  document.getElementById('profile-name').value = user.name;
  document.getElementById('profile-email').value = user.email;
  document.getElementById('profile-phone').value = user.phone;

  const prefBox = document.getElementById('profile-ai-preference');
  if (prefBox) {
    // Analysing preferences offline using history
    const reservations = db.getReservations().filter(r => r.userId === user.id);
    let preferredArea = 'Indoor Dining';
    let preferredCategory = 'VIP Suite';
    if (reservations.length > 0) {
      const outCount = reservations.filter(r => r.seatingArea === 'outdoor').length;
      preferredArea = outCount > (reservations.length / 2) ? 'Outdoor Patio' : 'Indoor Dining Hall';
    }
    
    prefBox.innerHTML = `
      <div style="display:flex; gap:12px; align-items:flex-start;">
        <div style="font-size: 1.5rem;">🤖</div>
        <div>
          <div style="font-weight: 600; color: var(--gold-primary); font-size: 0.95rem; margin-bottom: 4px;">AI Preference Insights</div>
          <div style="font-size: 0.88rem; line-height:1.5;">
            Luxe AI profile analyzes that you prefer dining in the **${preferredArea}**. We recommend VIP suites or window tables on your next booking!
          </div>
        </div>
      </div>
    `;
  }
}

// Global actions
window.cancelBookingDirect = async function(resId) {
  if (confirm(`Are you sure you want to cancel booking ${resId}?`)) {
    const res = await db.cancelReservation(resId);
    if (res.success) {
      window.showNotification('Reservation cancelled successfully.', 'success');
      initMyReservationsPage();
    }
  }
};

window.submitFeedbackDirect = async function(resId) {
  const rating = document.getElementById(`feed-rate-${resId}`).value;
  const comment = document.getElementById(`feed-comm-${resId}`).value;

  if (!comment) {
    window.showNotification('Please fill in feedback comments.', 'error');
    return;
  }

  const res = await db.addFeedback(resId, rating, comment);
  if (res.success) {
    window.showNotification('Thank you for your feedback!', 'success');
    initMyReservationsPage();
  }
};

// ADMIN & STAFF PORTALS

function initAdminDashboard() {
  const reservations = db.getReservations();
  const tables = db.getTables();
  const users = db.getUsers();

  const today = new Date().toISOString().split('T')[0];
  const activeToday = reservations.filter(r => r.date === today && r.status === 'Approved');

  document.getElementById('metric-total-bookings').textContent = reservations.length;
  document.getElementById('metric-occupied-tables').textContent = activeToday.length;
  document.getElementById('metric-available-tables').textContent = Math.max(0, tables.length - activeToday.length);
  document.getElementById('metric-total-customers').textContent = users.filter(u => u.role === 'Customer').length;

  const todayBody = document.getElementById('admin-today-bookings-body');
  if (todayBody) {
    const todayList = reservations.filter(r => r.date === today);
    if (todayList.length === 0) {
      todayBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No reservations scheduled for today.</td></tr>`;
    } else {
      todayBody.innerHTML = todayList.map(r => `
        <tr>
          <td><strong style="color: var(--gold-primary);">${r.id}</strong></td>
          <td>${r.userName}</td>
          <td>${r.tableName}</td>
          <td>${r.timeSlot}</td>
          <td><span class="status-badge ${r.status}">${r.status}</span></td>
        </tr>
      `).join('');
    }
  }
}

function initManageTablesPage() {
  const tables = db.getTables();
  const tableBody = document.getElementById('admin-tables-body');
  if (!tableBody) return;

  tableBody.innerHTML = tables.map(t => `
    <tr>
      <td><strong>${t.name}</strong></td>
      <td>${t.category}</td>
      <td>${t.capacity} Seats</td>
      <td>${t.area.toUpperCase()}</td>
      <td>X: ${t.x}, Z: ${t.z}</td>
      <td>
        <button class="btn btn-secondary btn-sm mr-2" style="padding: 4px 8px;" onclick="loadTableFormEdit('${t.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" style="padding: 4px 8px;" onclick="deleteTableDirect('${t.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

window.loadTableFormEdit = function(tableId) {
  const tables = db.getTables();
  const table = tables.find(t => t.id === tableId);
  if (!table) return;

  document.getElementById('table-id-hidden').value = table.id;
  document.getElementById('table-name').value = table.name;
  document.getElementById('table-category').value = table.category;
  document.getElementById('table-capacity').value = table.capacity;
  document.getElementById('table-area').value = table.area;
  document.getElementById('table-x-coord').value = table.x;
  document.getElementById('table-z-coord').value = table.z;

  document.getElementById('table-form-submit-btn').textContent = 'Update Table';
  window.showNotification(`Loaded Table ${table.name} details into form.`, 'info');
};

window.deleteTableDirect = async function(tableId) {
  if (confirm('Delete this table? This removes it from the 3D layout planner.')) {
    const res = await db.deleteTable(tableId);
    if (res.success) {
      window.showNotification('Table deleted successfully.', 'success');
      initManageTablesPage();
    }
  }
};

function initManageReservationsPage() {
  const reservations = db.getReservations();
  const resBody = document.getElementById('admin-reservations-body');
  if (!resBody) return;

  renderReservationAdminList(reservations);

  const searchInput = document.getElementById('admin-res-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = reservations.filter(r => 
        r.id.toLowerCase().includes(q) || 
        r.userName.toLowerCase().includes(q) || 
        r.tableName.toLowerCase().includes(q) ||
        r.date.includes(q)
      );
      renderReservationAdminList(filtered);
    });
  }
}

function renderReservationAdminList(list) {
  const resBody = document.getElementById('admin-reservations-body');
  if (!resBody) return;

  if (list.length === 0) {
    resBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No reservations found.</td></tr>`;
    return;
  }

  list.sort((a,b) => new Date(b.date + 'T' + b.timeSlot) - new Date(a.date + 'T' + a.timeSlot));

  resBody.innerHTML = list.map(r => {
    let actionButtons = '';
    if (r.status === 'Pending') {
      actionButtons = `
        <button class="btn btn-primary btn-sm mr-2" style="padding: 4px 8px; font-size:0.8rem; background:#10b981;" onclick="updateResStatus('${r.id}', 'Approved')">Approve</button>
        <button class="btn btn-danger btn-sm" style="padding: 4px 8px; font-size:0.8rem;" onclick="updateResStatus('${r.id}', 'Cancelled')">Cancel</button>
      `;
    } else if (r.status === 'Approved') {
      actionButtons = `
        <button class="btn btn-danger btn-sm" style="padding: 4px 8px; font-size:0.8rem;" onclick="updateResStatus('${r.id}', 'Cancelled')">Cancel</button>
      `;
    }

    return `
      <tr>
        <td><strong style="color:var(--gold-primary);">${r.id}</strong></td>
        <td>${r.userName}<br><small class="text-muted">${r.userPhone}</small></td>
        <td>${r.tableName}</td>
        <td>${r.date} ${r.timeSlot}</td>
        <td>${r.guests} guests</td>
        <td><span class="status-badge ${r.status}">${r.status}</span></td>
        <td>${actionButtons}</td>
      </tr>
    `;
  }).join('');
}

window.updateResStatus = async function(resId, status) {
  const res = await db.updateReservationStatus(resId, status);
  if (res.success) {
    window.showNotification(`Reservation ${resId} status updated to ${status}.`, 'success');
    initManageReservationsPage();
  }
};

function initCustomerManagementPage() {
  const users = db.getUsers().filter(u => u.role === 'Customer');
  const custBody = document.getElementById('admin-customers-body');
  if (!custBody) return;

  const reservations = db.getReservations();

  custBody.innerHTML = users.map(u => {
    const custReservations = reservations.filter(r => r.userId === u.id);
    const completedCount = custReservations.filter(r => r.status === 'Approved').length;
    const cancelledCount = custReservations.filter(r => r.status === 'Cancelled').length;

    return `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td>${u.phone}</td>
        <td>${custReservations.length} bookings (${completedCount} Approved, ${cancelledCount} Cancelled)</td>
        <td>Joined ${new Date(u.createdAt).toLocaleDateString()}</td>
      </tr>
    `;
  }).join('');
}

function initReportsPage() {
  dashboardCharts.init(
    'chart-occupancy',
    'chart-weekly',
    'chart-peak',
    'chart-revenue'
  );

  const logs = db.getLogs();
  const logsList = document.getElementById('admin-activity-logs');
  if (logsList) {
    logsList.innerHTML = logs.slice(0, 15).map(l => `
      <div style="font-size:0.85rem; border-bottom: 1px solid var(--border-glass); padding:8px 0; display:flex; justify-content:space-between;">
        <div>
          <strong style="color:var(--gold-primary);">${l.action}</strong> - ${l.details}
          <br><small class="text-muted">By: ${l.user}</small>
        </div>
        <span class="text-muted" style="font-size:0.75rem;">${new Date(l.timestamp).toLocaleTimeString()}</span>
      </div>
    `).join('');
  }
}

function decodeGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding Google ID Token:', e);
    return null;
  }
}

async function initGoogleSignIn() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    
    if (!config.googleClientId) {
      console.warn('Google Client ID not configured on server.');
      return;
    }

    if (typeof window.google === 'undefined' || !window.google.accounts) {
      // Script might still be loading, retry in 500ms
      setTimeout(initGoogleSignIn, 500);
      return;
    }

    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: async (response) => {
        const payload = decodeGoogleJwt(response.credential);
        if (!payload) {
          window.showNotification('Google auth token was invalid.', 'error');
          return;
        }

        window.showNotification('Authenticating via Google...', 'info');

        try {
          const authRes = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: payload.name,
              email: payload.email,
              googleId: payload.sub
            })
          });
          const authData = await authRes.json();
          if (authData.success) {
            db.setCurrentUser(authData.user);
            await db.init(); // Resync users & reservations cache
            window.showNotification(`Welcome, ${authData.user.name}!`, 'success');
            
            // Re-route and update UI nav
            handleRouting();
            window.location.hash = '#home';
          } else {
            window.showNotification(authData.message || 'Google login failed.', 'error');
          }
        } catch (err) {
          console.error('Backend Google Auth failed:', err);
          window.showNotification('Server authentication error.', 'error');
        }
      }
    });

    const loginBtn = document.getElementById('google-login-btn');
    if (loginBtn) {
      window.google.accounts.id.renderButton(loginBtn, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: '280'
      });
    }

    const signupBtn = document.getElementById('google-signup-btn');
    if (signupBtn) {
      window.google.accounts.id.renderButton(signupBtn, {
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        width: '280'
      });
    }

  } catch (err) {
    console.error('Error initializing Google Sign-In:', err);
  }
}

// Submissions Event listeners config
function setupFormListeners() {
  // 1. Customer Login Form
  const loginForm = document.getElementById('login-form-submit');
  if (loginForm) {
    loginForm.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-pass').value;

      if (!email || !pass) {
        window.showNotification('Please fill in all credentials.', 'error');
        return;
      }

      const res = await db.login(email, pass);
      if (res.success) {
        window.showNotification(`Welcome back, ${res.user.name}!`, 'success');
        if (res.user.role === 'Admin' || res.user.role === 'Staff') {
          window.location.hash = '#admin-dashboard';
        } else {
          window.location.hash = '#home';
        }
      } else {
        window.showNotification(res.message, 'error');
      }
    });
  }

  // 2. Customer Sign Up Form
  const signupForm = document.getElementById('signup-form-submit');
  if (signupForm) {
    signupForm.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const phone = document.getElementById('signup-phone').value;
      const pass = document.getElementById('signup-pass').value;

      if (!name || !email || !phone || !pass) {
        window.showNotification('Please complete all fields.', 'error');
        return;
      }

      const res = await db.register(name, email, phone, pass);
      if (res.success) {
        window.showNotification(res.message, 'success');
        window.location.hash = '#login';
      } else {
        window.showNotification(res.message, 'error');
      }
    });
  }

  // 3. User Profile Edit Form
  const profileForm = document.getElementById('profile-form-submit');
  if (profileForm) {
    profileForm.addEventListener('click', async (e) => {
      e.preventDefault();
      const user = db.getCurrentUser();
      if (!user) return;

      const name = document.getElementById('profile-name').value;
      const email = document.getElementById('profile-email').value;
      const phone = document.getElementById('profile-phone').value;

      if (!name || !email || !phone) {
        window.showNotification('Fields cannot be blank.', 'error');
        return;
      }

      const res = await db.updateProfile(user.id, { name, email, phone });
      if (res.success) {
        window.showNotification('Profile updated successfully.', 'success');
        initProfilePage();
        updateHeaderNav(res.user);
      }
    });
  }

  // 4. Logout trigger
  const logoutButtons = document.querySelectorAll('.logout-trigger');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      db.logout();
      window.showNotification('Logged out successfully.', 'info');
      window.location.hash = '#welcome';
    });
  });

  // 5. Setup Reservation Wizard Proceed
  const setupProceedBtn = document.getElementById('reserve-setup-proceed');
  if (setupProceedBtn) {
    setupProceedBtn.addEventListener('click', () => {
      const dateVal = document.getElementById('booking-date').value;
      const guestsVal = document.getElementById('booking-guests').value;
      const slotSelected = document.querySelector('.time-slot-btn.selected');

      if (!dateVal || !guestsVal || !slotSelected) {
        window.showNotification('Please set date, guests, and a time slot.', 'error');
        return;
      }

      window.location.hash = '#table-layout';
    });
  }

  // 6. Complete Layout Reservation (To confirmation)
  const layoutReserveBtn = document.getElementById('layout-reserve-submit');
  if (layoutReserveBtn) {
    layoutReserveBtn.addEventListener('click', () => {
      if (!bookingState.selectedTableId) {
        window.showNotification('Please select a table to proceed.', 'error');
        return;
      }
      window.location.hash = '#confirmation';
    });
  }

  // 7. Confirm Reservation -> Booking DB Write
  const confirmBookingBtn = document.getElementById('confirm-booking-btn');
  if (confirmBookingBtn) {
    confirmBookingBtn.addEventListener('click', async () => {
      const user = db.getCurrentUser();
      if (!user) return;

      const bookingParams = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        tableId: bookingState.selectedTableId,
        tableName: bookingState.tableName,
        date: bookingState.date,
        timeSlot: bookingState.timeSlot,
        guests: bookingState.guests,
        seatingArea: bookingState.seatingArea,
        notes: document.getElementById('booking-special-requests')?.value || ''
      };

      const res = await db.createReservation(bookingParams);
      if (res.success) {
        localStorage.setItem('luxe_recent_booking_id', res.reservation.id);
        window.showNotification('Booking successfully submitted! Payment optional.', 'success');
        window.location.hash = '#success';
      } else {
        window.showNotification(res.message, 'error');
      }
    });
  }

  // 8. Add/Edit Table Admin Form
  const tableFormSubmit = document.getElementById('table-form-submit-btn');
  if (tableFormSubmit) {
    tableFormSubmit.addEventListener('click', async (e) => {
      e.preventDefault();
      const tableId = document.getElementById('table-id-hidden').value;
      const name = document.getElementById('table-name').value;
      const category = document.getElementById('table-category').value;
      const capacity = document.getElementById('table-capacity').value;
      const area = document.getElementById('table-area').value;
      const x = document.getElementById('table-x-coord').value;
      const z = document.getElementById('table-z-coord').value;

      if (!name || !capacity || x === '' || z === '') {
        window.showNotification('Please complete all table properties.', 'error');
        return;
      }

      const tableData = { name, category, capacity, area, x, z };
      
      if (tableId) {
        const res = await db.editTable(tableId, tableData);
        if (res.success) {
          window.showNotification(`Table ${name} updated.`, 'success');
          resetTableForm();
          initManageTablesPage();
        }
      } else {
        const res = await db.addTable(tableData);
        if (res.success) {
          window.showNotification(`Table ${name} created.`, 'success');
          resetTableForm();
          initManageTablesPage();
        }
      }
    });
  }
}

function resetTableForm() {
  document.getElementById('table-id-hidden').value = '';
  document.getElementById('table-name').value = '';
  document.getElementById('table-capacity').value = '4';
  document.getElementById('table-x-coord').value = '0';
  document.getElementById('table-z-coord').value = '0';
  document.getElementById('table-form-submit-btn').textContent = 'Add Table';
}

// AI Floating Chatbot Interface Logic
function setupChatbotUI() {
  const bubble = document.getElementById('ai-chatbot-bubble');
  const windowEl = document.getElementById('ai-chatbot-window');
  const closeBtn = document.getElementById('ai-chat-close');
  const sendBtn = document.getElementById('ai-chat-send');
  const chatInput = document.getElementById('ai-chat-input');
  const chatBody = document.getElementById('ai-chat-body');

  if (!bubble || !windowEl) return;

  bubble.addEventListener('click', () => {
    windowEl.classList.toggle('active');
    setTimeout(() => chatBody.scrollTop = chatBody.scrollHeight, 100);
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      windowEl.classList.remove('active');
    });
  }

  const chips = document.querySelectorAll('.chat-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const msg = chip.textContent;
      submitUserChatMessage(msg);
    });
  });

  const sendMsg = () => {
    const msg = chatInput.value.trim();
    if (!msg) return;
    submitUserChatMessage(msg);
    chatInput.value = '';
  };

  if (sendBtn) sendBtn.addEventListener('click', sendMsg);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMsg();
      }
    });
  }
}

async function submitUserChatMessage(text) {
  const chatBody = document.getElementById('ai-chat-body');
  const user = db.getCurrentUser();
  if (!chatBody) return;

  // Append user message
  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'chat-msg outgoing';
  userMsgEl.textContent = text;
  chatBody.appendChild(userMsgEl);

  chatBody.scrollTop = chatBody.scrollHeight;

  // Bot Typing Simulator
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-msg incoming';
  typingEl.innerHTML = '<i>Typing...</i>';
  chatBody.appendChild(typingEl);
  chatBody.scrollTop = chatBody.scrollHeight;

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, userProfile: user })
    });
    const data = await res.json();
    
    chatBody.removeChild(typingEl);

    // Append Bot message
    const botMsgEl = document.createElement('div');
    botMsgEl.className = 'chat-msg incoming';
    
    // Format bold markdown titles
    let formattedText = data.reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    botMsgEl.innerHTML = formattedText;
    
    chatBody.appendChild(botMsgEl);
    chatBody.scrollTop = chatBody.scrollHeight;

    // Check if the reply includes redirect triggers
    if (data.reply.toLowerCase().includes('redirecting') || data.reply.toLowerCase().includes('open the reservation')) {
      handleChatbotAction({ type: 'OPEN_WIZARD' });
    }
    else if (data.reply.toLowerCase().includes('reserve') && (text.toLowerCase().includes('table') || text.toLowerCase().includes('book'))) {
      const offlineResult = chatbot.getAIResponse(text, user);
      if (offlineResult.action) {
        handleChatbotAction(offlineResult.action);
      }
    }

  } catch (err) {
    console.error('Chat error, using offline model:', err);
    chatBody.removeChild(typingEl);
    
    // Offline local rule-based chatbot fallback
    const offlineResult = chatbot.getAIResponse(text, user);
    const botMsgEl = document.createElement('div');
    botMsgEl.className = 'chat-msg incoming';
    let formattedText = offlineResult.response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    botMsgEl.innerHTML = formattedText;
    chatBody.appendChild(botMsgEl);
    chatBody.scrollTop = chatBody.scrollHeight;
    if (offlineResult.action) {
      handleChatbotAction(offlineResult.action);
    }
  }
}

function handleChatbotAction(action) {
  switch (action.type) {
    case 'OPEN_WIZARD':
      window.showNotification('Opening reservation wizard...', 'info');
      setTimeout(() => {
        window.location.hash = '#table-reservation';
      }, 1000);
      break;
      
    case 'DIRECT_BOOKING':
      window.showNotification('Setting reservation properties...', 'success');
      const params = action.payload;
      
      const dateInput = document.getElementById('booking-date');
      const guestsInput = document.getElementById('booking-guests');
      const slotButtons = document.querySelectorAll('.time-slot-btn');
      
      if (dateInput) dateInput.value = params.date;
      if (guestsInput) guestsInput.value = params.guests;
      
      slotButtons.forEach(btn => {
        if (btn.dataset.slot === params.timeSlot) {
          btn.click();
        }
      });
      
      const seatOptions = document.querySelectorAll('.seating-option');
      seatOptions.forEach(opt => {
        if (opt.dataset.area === params.seatingArea) {
          opt.click();
        }
      });

      bookingState.date = params.date;
      bookingState.guests = params.guests;
      bookingState.timeSlot = params.timeSlot;
      bookingState.seatingArea = params.seatingArea;
      bookingState.selectedTableId = params.tableId;

      const matchedTable = db.getTables().find(t => t.id === params.tableId);
      if (matchedTable) {
        bookingState.tableName = matchedTable.name;
      }

      setTimeout(() => {
        window.location.hash = '#table-layout';
        setTimeout(() => {
          if (typeof threeDLayout !== 'undefined') {
            threeDLayout.setSelected(params.tableId);
            const sidePanel = document.getElementById('layout-selection-details');
            const reserveBtn = document.getElementById('layout-reserve-submit');
            if (sidePanel) {
              sidePanel.innerHTML = `
                <span class="table-badge-large">${bookingState.tableName}</span>
                <div class="sidebar-row mt-4"><span>Category:</span> <strong>${matchedTable.category}</strong></div>
                <div class="sidebar-row"><span>Max Capacity:</span> <strong>${matchedTable.capacity} guests</strong></div>
                <div class="sidebar-row"><span>Area:</span> <strong>${matchedTable.area.toUpperCase()}</strong></div>
                <div class="sidebar-row"><span>Occasion Match:</span> <strong style="color: var(--gold-primary);">AI Recommends</strong></div>
              `;
            }
            if (reserveBtn) reserveBtn.disabled = false;
          }
        }, 500);
      }, 1500);
      break;
  }
}

// 1. Custom Luxury Pointer Follower Implementation
function initCustomCursor() {
  const dot = document.getElementById('custom-cursor-dot');
  const ring = document.getElementById('custom-cursor-ring');
  
  if (!dot || !ring) return;
  
  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;
  
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';
  });
  
  function renderCursor() {
    ringX += (mouseX - ringX) * 0.14;
    ringY += (mouseY - ringY) * 0.14;
    
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    
    requestAnimationFrame(renderCursor);
  }
  
  renderCursor();
  
  window.addEventListener('mouseover', (e) => {
    const isInteractive = e.target.closest('a, button, select, input, textarea, .nav-link, .btn, .time-slot-btn, .seating-option, .chat-chip, .ai-chatbot-bubble');
    if (isInteractive) {
      ring.classList.add('hover');
    } else {
      ring.classList.remove('hover');
    }
  });
}

// 2. Glittering Canvas Particle Engine
function initGlitterBackground() {
  const canvas = document.getElementById('glitter-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let particles = [];
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  class GlitterParticle {
    constructor() {
      this.reset(true);
    }
    
    reset(randomizeY = false) {
      this.x = Math.random() * canvas.width;
      this.y = randomizeY ? Math.random() * canvas.height : canvas.height + 10;
      this.size = Math.random() * 3 + 0.8;
      this.speedY = Math.random() * 0.45 + 0.15;
      this.speedX = Math.sin(Math.random() * Math.PI * 2) * 0.25;
      this.alpha = Math.random() * 0.65 + 0.15;
      this.fadeSpeed = Math.random() * 0.0025 + 0.001;
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.twinkleSpeed = Math.random() * 0.06 + 0.02;
      
      const isLight = document.body.classList.contains('light-theme');
      const lightPalettes = [
        'rgba(80, 11, 20, ',      // Rich Burgundy
        'rgba(197, 160, 89, ',     // Amber Gold
        'rgba(114, 28, 36, ',     // Maroon
        'rgba(197, 160, 89, '
      ];
      const darkPalettes = [
        'rgba(255, 255, 255, ',   // Glistening Ivory/White
        'rgba(243, 223, 196, ',   // Bright Highlight Champagne
        'rgba(229, 193, 133, ',   // Champagne Gold
        'rgba(255, 255, 240, '    // Ivory
      ];
      const palettes = isLight ? lightPalettes : darkPalettes;
      this.colorPrefix = palettes[Math.floor(Math.random() * palettes.length)];
    }
    
    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      this.alpha -= this.fadeSpeed;
      this.twinklePhase += this.twinkleSpeed;
      
      if (this.alpha <= 0 || this.y < -10) {
        this.reset(false);
      }
    }
    
    draw() {
      const currentSize = Math.max(0.2, this.size * (1.0 + Math.sin(this.twinklePhase) * 0.4));
      
      ctx.fillStyle = `${this.colorPrefix}${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  const particleCount = Math.min(180, Math.floor(window.innerWidth / 6));
  for (let i = 0; i < particleCount; i++) {
    particles.push(new GlitterParticle());
  }

  // Immediately update particles to correct colors when theme toggle is clicked
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      setTimeout(() => {
        particles.forEach(p => p.reset(true));
      }, 50);
    });
  }
  
  function animateGlitter() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const isLight = document.body.classList.contains('light-theme');
    ctx.shadowBlur = isLight ? 4 : 8;
    ctx.shadowColor = isLight ? 'rgba(80, 11, 20, 0.45)' : 'rgba(229, 193, 133, 0.85)';
    
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    
    ctx.shadowBlur = 0;
    
    requestAnimationFrame(animateGlitter);
  }
  
  animateGlitter();
}
