// database.js - Backend Database Interface with Client-Side caching & API Fetching

const API_BASE = '/api';

// In-Memory Client Cache to keep UI read-queries synchronous
const cache = {
  users: [],
  tables: [],
  reservations: [],
  reviews: [],
  notifications: [],
  logs: [],
  currentUser: null
};

// Sync session from sessionStorage on load
try {
  const savedSession = sessionStorage.getItem('luxe_current_session');
  if (savedSession) {
    cache.currentUser = JSON.parse(savedSession);
  }
} catch (e) {
  console.error('Error loading session from sessionStorage:', e);
}

const db = {
  // Sync Cache from Backend
  async init() {
    try {
      const [users, tables, reservations, reviews, logs] = await Promise.all([
        fetch(`${API_BASE}/users`).then(r => r.json()),
        fetch(`${API_BASE}/tables`).then(r => r.json()),
        fetch(`${API_BASE}/reservations`).then(r => r.json()),
        fetch(`${API_BASE}/reviews`).then(r => r.json()),
        fetch(`${API_BASE}/logs`).then(r => r.json())
      ]);

      cache.users = users;
      cache.tables = tables;
      cache.reservations = reservations;
      cache.reviews = reviews;
      cache.logs = logs;

      if (cache.currentUser) {
        await this.syncNotifications(cache.currentUser.id);
      }

      console.log('Client-side cache synchronized with backend database!');
    } catch (err) {
      console.error('Error synchronizing cache with backend API server:', err);
    }
  },

  // User Session Management
  getUsers() {
    return cache.users;
  },

  getCurrentUser() {
    return cache.currentUser;
  },

  setCurrentUser(user) {
    cache.currentUser = user;
    if (user) {
      sessionStorage.setItem('luxe_current_session', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('luxe_current_session');
    }
  },

  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.setCurrentUser(data.user);
        await this.init(); // Resync cache on login
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Login failed.' };
    } catch (e) {
      return { success: false, message: 'Server connection failed.' };
    }
  },

  async register(name, email, phone, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await this.init(); // Resync users list
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Registration failed.' };
    } catch (e) {
      return { success: false, message: 'Server connection failed.' };
    }
  },

  logout() {
    this.setCurrentUser(null);
    cache.notifications = [];
  },

  async updateProfile(userId, profileData) {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Update local cache
        const index = cache.users.findIndex(u => u.id === userId);
        if (index !== -1) cache.users[index] = data.user;
        if (cache.currentUser && cache.currentUser.id === userId) {
          this.setCurrentUser({ ...cache.currentUser, ...profileData });
        }
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Profile update failed.' };
    } catch (e) {
      return { success: false, message: 'Server connection failed.' };
    }
  },

  async resetPassword(email, newPassword) {
    // Simulated Password reset
    try {
      addSystemLog('Password Reset', email, 'Simulated password reset request');
      return { success: true, message: 'A password reset link has been dispatched to your email.' };
    } catch (e) {
      return { success: false, message: 'Operation failed.' };
    }
  },

  // Tables Management (REST API calls)
  getTables() {
    return cache.tables;
  },

  async addTable(tableData) {
    try {
      const res = await fetch(`${API_BASE}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await this.init(); // Refresh table caches
        return { success: true, table: data.table };
      }
      return { success: false, message: data.message || 'Add table failed' };
    } catch (e) {
      return { success: false, message: 'Server connection failed.' };
    }
  },

  async editTable(tableId, tableData) {
    try {
      const res = await fetch(`${API_BASE}/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await this.init(); // Refresh tables
        return { success: true, table: data.table };
      }
      return { success: false, message: data.message || 'Edit table failed' };
    } catch (e) {
      return { success: false, message: 'Server connection failed.' };
    }
  },

  async deleteTable(tableId) {
    try {
      const res = await fetch(`${API_BASE}/tables/${tableId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await this.init(); // Refresh tables
        return { success: true };
      }
      return { success: false, message: data.message || 'Delete table failed' };
    } catch (e) {
      return { success: false, message: 'Server connection failed.' };
    }
  },

  // Reservations Management (REST API calls)
  getReservations() {
    return cache.reservations;
  },

  async createReservation(bookingData) {
    try {
      const res = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await this.init(); // Sync reservations and logs
        return { success: true, reservation: data.reservation };
      }
      return { success: false, message: data.message || 'Booking conflict encountered.' };
    } catch (e) {
      return { success: false, message: 'Server connection failed.' };
    }
  },

  async updateReservationStatus(resId, status) {
    try {
      const res = await fetch(`${API_BASE}/reservations/${resId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await this.init(); // Resync reservations
        return { success: true, reservation: data.reservation };
      }
      return { success: false, message: data.message || 'Status update failed.' };
    } catch (e) {
      return { success: false, message: 'Server connection failed.' };
    }
  },

  async cancelReservation(resId) {
    return this.updateReservationStatus(resId, 'Cancelled');
  },

  async addFeedback(resId, rating, comment) {
    try {
      const res = await fetch(`${API_BASE}/reservations/${resId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await this.init(); // Refresh reviews & reservations cache
        return { success: true };
      }
      return { success: false, message: data.message || 'Feedback submission failed.' };
    } catch (e) {
      return { success: false, message: 'Server connection failed.' };
    }
  },

  // Reviews & Logs
  getReviews() {
    return cache.reviews;
  },

  getLogs() {
    return cache.logs;
  },

  // Notifications APIs
  getNotifications() {
    return cache.notifications;
  },

  async syncNotifications(userId) {
    try {
      const res = await fetch(`${API_BASE}/notifications?userId=${userId}`);
      if (res.ok) {
        cache.notifications = await res.json();
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  },

  async sendNotification(userId, title, message, type = 'info') {
    try {
      const res = await fetch(`${API_BASE}/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, message, type })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (cache.currentUser && cache.currentUser.id === userId) {
          await this.syncNotifications(userId);
        }
        return { success: true };
      }
      return { success: false };
    } catch (e) {
      return { success: false };
    }
  },

  // Table Seating Availability (Calculated locally from cached variables)
  getTableAvailability(date, timeSlot) {
    const tables = this.getTables();
    const reservations = this.getReservations();
    
    // Find active bookings for this day + slot
    const bookedTableIds = reservations
      .filter(r => r.date === date && r.timeSlot === timeSlot && r.status !== 'Cancelled')
      .map(r => r.tableId);

    // Map cached tables
    return tables.map(table => ({
      ...table,
      isAvailable: !bookedTableIds.includes(table.id)
    }));
  }
};

window.db = db;
console.log('Luxe Dining DB Fetch Client Initialized!');
