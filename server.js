// server.js - Native Node.js backend server with local db.json and Gemini API

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');
const ENV_FILE = path.join(__dirname, '.env');

// 1. Native .env loader
function loadEnv() {
  if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index !== -1) {
        const key = trimmed.substring(0, index).trim();
        let value = trimmed.substring(index + 1).trim();
        // Strip quotes
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
}
loadEnv();

// Seed Data
const SEED_USERS = [
  { id: 'usr-1', name: 'Admin User', email: 'admin@luxedining.com', phone: '+1 (555) 0199', password: 'admin123', role: 'Admin', createdAt: '2026-05-01T10:00:00Z' },
  { id: 'usr-2', name: 'Staff Member', email: 'staff@luxedining.com', phone: '+1 (555) 0288', password: 'staff123', role: 'Staff', createdAt: '2026-05-02T10:00:00Z' },
  { id: 'usr-3', name: 'John Doe', email: 'customer@luxedining.com', phone: '+1 (555) 0377', password: 'customer123', role: 'Customer', createdAt: '2026-05-03T10:00:00Z' },
  { id: 'usr-4', name: 'Sarah Jenkins', email: 'sarah@example.com', phone: '+1 (555) 0466', password: 'customer123', role: 'Customer', createdAt: '2026-05-10T12:30:00Z' }
];

const SEED_TABLES = [
  { id: 'tbl-1', name: 'Table 1', category: '2-Seater', capacity: 2, area: 'indoor', x: -6, z: -4 },
  { id: 'tbl-2', name: 'Table 2', category: '2-Seater', capacity: 2, area: 'indoor', x: -6, z: 0 },
  { id: 'tbl-3', name: 'Table 3', category: '4-Seater', capacity: 4, area: 'indoor', x: -2, z: -4 },
  { id: 'tbl-4', name: 'Table 4', category: '4-Seater', capacity: 4, area: 'indoor', x: -2, z: 0 },
  { id: 'tbl-5', name: 'Family Suite 5', category: 'Family', capacity: 8, area: 'indoor', x: 2, z: -4 },
  { id: 'tbl-6', name: 'VIP Booth 6', category: 'VIP', capacity: 4, area: 'indoor', x: 2, z: 1 },
  { id: 'tbl-7', name: 'VIP Lounge 7', category: 'VIP', capacity: 6, area: 'indoor', x: 6, z: -4 },
  { id: 'tbl-8', name: 'Patio Table 8', category: '2-Seater', capacity: 2, area: 'outdoor', x: -6, z: 5 },
  { id: 'tbl-9', name: 'Patio Table 9', category: '4-Seater', capacity: 4, area: 'outdoor', x: -2, z: 5 },
  { id: 'tbl-10', name: 'Patio Table 10', category: '4-Seater', capacity: 4, area: 'outdoor', x: 2, z: 5 },
  { id: 'tbl-11', name: 'Garden Lounge 11', category: 'Family', capacity: 8, area: 'outdoor', x: 6, z: 5 },
  { id: 'tbl-12', name: 'Patio VIP 12', category: 'VIP', capacity: 4, area: 'outdoor', x: 6, z: 1 }
];

const SEED_RESERVATIONS = [
  { id: 'RES-8921', userId: 'usr-3', userName: 'John Doe', userEmail: 'customer@luxedining.com', userPhone: '+1 (555) 0377', tableId: 'tbl-6', tableName: 'VIP Booth 6', date: '2026-06-01', timeSlot: '08:00 PM', guests: 4, seatingArea: 'indoor', status: 'Approved', notes: 'Anniversary dinner. Would prefer quiet corner.', feedback: { rating: 5, comment: 'Exceptional service and the 3D table selection made booking so easy!' }, timestamp: '2026-05-28T14:22:00Z' },
  { id: 'RES-8922', userId: 'usr-4', userName: 'Sarah Jenkins', userEmail: 'sarah@example.com', userPhone: '+1 (555) 0466', tableId: 'tbl-3', tableName: 'Table 3', date: '2026-06-02', timeSlot: '06:00 PM', guests: 3, seatingArea: 'indoor', status: 'Approved', notes: 'No seafood please.', feedback: { rating: 4, comment: 'Very pleasant evening, food was spectacular!' }, timestamp: '2026-05-30T10:15:00Z' },
  { id: 'RES-8923', userId: 'usr-3', userName: 'John Doe', userEmail: 'customer@luxedining.com', userPhone: '+1 (555) 0377', tableId: 'tbl-8', tableName: 'Patio Table 8', date: '2026-06-03', timeSlot: '12:00 PM', guests: 2, seatingArea: 'outdoor', status: 'Approved', notes: 'Sunny table preferred.', feedback: { rating: 5, comment: 'Beautiful outdoor garden ambiance.' }, timestamp: '2026-06-01T09:05:00Z' },
  { id: 'RES-9001', userId: 'usr-3', userName: 'John Doe', userEmail: 'customer@luxedining.com', userPhone: '+1 (555) 0377', tableId: 'tbl-7', tableName: 'VIP Lounge 7', date: '2026-06-05', timeSlot: '08:00 PM', guests: 5, seatingArea: 'indoor', status: 'Approved', notes: 'Business meeting discussion.', timestamp: '2026-06-03T18:40:00Z' },
  { id: 'RES-9002', userId: 'usr-4', userName: 'Sarah Jenkins', userEmail: 'sarah@example.com', userPhone: '+1 (555) 0466', tableId: 'tbl-11', tableName: 'Garden Lounge 11', date: '2026-06-06', timeSlot: '06:00 PM', guests: 6, seatingArea: 'outdoor', status: 'Pending', notes: 'Birthday celebration.', timestamp: '2026-06-04T08:12:00Z' }
];

const SEED_REVIEWS = [
  { id: 'rev-1', userName: 'John Doe', rating: 5, comment: 'Absolutely stellar! Selecting my exact VIP table beforehand is a game changer.', date: '2026-06-01' },
  { id: 'rev-2', userName: 'Sarah Jenkins', rating: 4, comment: 'The ambiance is breathtaking and the staff was extremely accommodating. Recommended!', date: '2026-06-02' },
  { id: 'rev-3', userName: 'Marcus Brody', rating: 5, comment: 'Excellent gourmet cuisine and a great selection of fine wines.', date: '2026-05-29' }
];

const SEED_NOTIFICATIONS = [
  { id: 'not-1', userId: 'usr-3', title: 'Welcome to Luxe Dining', message: 'Your account is active. Explore our 3D seating maps to book tables!', type: 'info', isRead: false, createdAt: '2026-06-04T12:00:00Z' }
];

const SEED_LOGS = [
  { id: 'log-1', action: 'System Init', user: 'System', timestamp: '2026-06-04T12:00:00Z', details: 'Database initialized on file storage' }
];

// Helper: Read/Write Database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      users: SEED_USERS,
      tables: SEED_TABLES,
      reservations: SEED_RESERVATIONS,
      reviews: SEED_REVIEWS,
      notifications: SEED_NOTIFICATIONS,
      logs: SEED_LOGS
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading DB_FILE, resetting to blank schema:', e);
    return { users: [], tables: [], reservations: [], reviews: [], notifications: [], logs: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function addSystemLog(action, user, details) {
  const db = readDB();
  db.logs.unshift({
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action,
    user,
    timestamp: new Date().toISOString(),
    details
  });
  if (db.logs.length > 200) db.logs.pop();
  writeDB(db);
}

// 2. Call Google Gemini API using native https module
function callGemini(systemPrompt, userQuery, callback) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return callback(new Error('GEMINI_API_KEY missing from environment config'), null);
  }

  const payload = JSON.stringify({
    contents: [{
      parts: [{
        text: `${systemPrompt}\n\nClient Input: ${userQuery}`
      }]
    }]
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const responseJson = JSON.parse(body);
        if (responseJson.candidates && responseJson.candidates[0].content.parts[0].text) {
          callback(null, responseJson.candidates[0].content.parts[0].text);
        } else {
          callback(new Error('Invalid response structure: ' + body), null);
        }
      } catch (err) {
        callback(err, null);
      }
    });
  });

  req.on('error', (e) => {
    callback(e, null);
  });

  req.write(payload);
  req.end();
}

// 3. Send email notifications natively via Resend API
function sendEmailNative(to, subject, htmlContent) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    console.log(`[Email Dispatch Simulation]\nTo: ${to}\nSubject: ${subject}\n-------------------------\n${htmlContent.replace(/<[^>]*>/g, '').trim()}\n-------------------------`);
    return;
  }

  const payload = JSON.stringify({
    from: 'Luxe Dining <onboarding@resend.dev>',
    to: to,
    subject: subject,
    html: htmlContent
  });

  const options = {
    hostname: 'api.resend.com',
    port: 443,
    path: '/emails',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const resJson = JSON.parse(body);
        console.log(`[Resend Email] Dispatched to: ${to}. Status: ${res.statusCode}, ID: ${resJson.id || 'N/A'}`);
      } catch (e) {
        console.error('Error parsing Resend response:', e, 'Raw:', body);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Resend transaction failure:', err);
  });

  req.write(payload);
  req.end();
}

// Helper: parse POST JSON request body
function parseJSONBody(req, res, callback) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      if (!body) return callback({});
      callback(JSON.parse(body));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Malformed JSON payload' }));
    }
  });
}

// 3. HTTP Server setup
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Set default CORS headers (helpful if accessed from separate ports)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // --- API ROUTER ---
  if (pathname.startsWith('/api/')) {
    const dbData = readDB();

    // 1. Auth routes
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      parseJSONBody(req, res, (body) => {
        const { email, password } = body;
        const user = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (user) {
          const sessionUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            token: `mock-jwt-header.${btoa(JSON.stringify({ id: user.id, role: user.role }))}.mock-sig`
          };
          addSystemLog('Login Success', user.name, `User ${user.email} logged in from backend`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, user: sessionUser }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid credentials.' }));
        }
      });
      return;
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      parseJSONBody(req, res, (body) => {
        const { name, email, phone, password } = body;
        if (dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Email already registered.' }));
          return;
        }
        const newUser = {
          id: `usr-${Date.now()}`,
          name,
          email,
          phone,
          password,
          role: 'Customer',
          createdAt: new Date().toISOString()
        };
        dbData.users.push(newUser);
        writeDB(dbData);
        addSystemLog('User Registered', name, `New customer registered: ${email}`);
        
        // Auto-create initial welcome notification
        dbData.notifications.unshift({
          id: `not-${Date.now()}`,
          userId: newUser.id,
          title: 'Welcome to Luxe Dining',
          message: `Hi ${name}, thank you for registering! Explore our menu and 3D seating configurations to book your table.`,
          type: 'info',
          isRead: false,
          createdAt: new Date().toISOString()
        });
        writeDB(dbData);

        const welcomeSubject = 'Welcome to Luxe Dining!';
        const welcomeHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5c185; padding: 20px; border-radius: 8px; background-color: #240407; color: #fffff0;">
            <h2 style="color: #e5c185; text-align: center;">Welcome to Luxe Dining</h2>
            <p>Dear <strong>${name}</strong>,</p>
            <p>Thank you for registering with Luxe Dining, your ultimate destination for luxury fine dining.</p>
            <p>Your account is now active! You can explore our menu, check out our interactive 3D table layout planner, and book your preferred seats online.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/#home" style="background-color: #e5c185; color: #240407; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Explore & Reserve Table</a>
            </div>
            <p style="font-size: 0.85rem; color: #a0a0a0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">If you have any questions or special requests, please chat with our Luxe AI assistant on the website or reply to this email.</p>
          </div>
        `;
        sendEmailNative(email, welcomeSubject, welcomeHtml);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Registration successful.' }));
      });
      return;
    }

    if (pathname === '/api/auth/google' && req.method === 'POST') {
      parseJSONBody(req, res, (body) => {
        const { name, email, googleId } = body;
        if (!email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Google authentication missing email context.' }));
          return;
        }

        let user = dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
          // Auto register new customer
          user = {
            id: `usr-${Date.now()}`,
            name: name || 'Google User',
            email: email,
            phone: 'N/A (Google)',
            password: `google_oauth_pass_${googleId || Date.now()}`,
            role: 'Customer',
            createdAt: new Date().toISOString()
          };
          dbData.users.push(user);
          writeDB(dbData);
          addSystemLog('User Registered (Google)', user.name, `Auto-registered customer via Google Auth: ${email}`);

          dbData.notifications.unshift({
            id: `not-${Date.now()}`,
            userId: user.id,
            title: 'Welcome to Luxe Dining',
            message: `Hi ${user.name}, thank you for registering with Google! Explore our menu and 3D layouts to reserve your seats.`,
            type: 'info',
            isRead: false,
            createdAt: new Date().toISOString()
          });
          writeDB(dbData);

          const welcomeSubject = 'Welcome to Luxe Dining!';
          const welcomeHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5c185; padding: 20px; border-radius: 8px; background-color: #240407; color: #fffff0;">
              <h2 style="color: #e5c185; text-align: center;">Welcome to Luxe Dining</h2>
              <p>Dear <strong>${user.name}</strong>,</p>
              <p>Thank you for registering with Luxe Dining via Google Sign-In, your ultimate destination for luxury fine dining.</p>
              <p>Your customer profile is active! You can explore our menu, check out our interactive 3D table layout planner, and book your preferred seats online.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000/#home" style="background-color: #e5c185; color: #240407; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Explore & Reserve Table</a>
              </div>
              <p style="font-size: 0.85rem; color: #a0a0a0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">If you have any questions or special requests, please chat with our Luxe AI assistant on the website or reply to this email.</p>
            </div>
          `;
          sendEmailNative(user.email, welcomeSubject, welcomeHtml);
        } else {
          addSystemLog('Login Success (Google)', user.name, `User ${user.email} logged in via Google Auth`);
        }

        const sessionUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          token: `mock-jwt-header.${btoa(JSON.stringify({ id: user.id, role: user.role }))}.mock-sig`
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: sessionUser }));
      });
      return;
    }
    if (pathname === '/api/config' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ googleClientId: process.env.GOOGLE_CLIENT_ID || '1057335272-dummygoogleclientid.apps.googleusercontent.com' }));
      return;
    }

    // 2. Tables CRUD routes
    if (pathname === '/api/tables') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(dbData.tables));
      } 
      else if (req.method === 'POST') {
        parseJSONBody(req, res, (body) => {
          const newTable = {
            id: `tbl-${Date.now()}`,
            name: body.name || `Table ${dbData.tables.length + 1}`,
            category: body.category || '4-Seater',
            capacity: parseInt(body.capacity) || 4,
            area: body.area || 'indoor',
            x: parseFloat(body.x) || 0,
            z: parseFloat(body.z) || 0
          };
          dbData.tables.push(newTable);
          writeDB(dbData);
          addSystemLog('Add Table', 'Admin', `Added table ${newTable.name}`);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, table: newTable }));
        });
      }
      return;
    }

    if (pathname.startsWith('/api/tables/') && req.method === 'PUT') {
      const parts = pathname.split('/');
      const tableId = parts[parts.length - 1];
      parseJSONBody(req, res, (body) => {
        const index = dbData.tables.findIndex(t => t.id === tableId);
        if (index !== -1) {
          dbData.tables[index] = {
            ...dbData.tables[index],
            name: body.name,
            category: body.category,
            capacity: parseInt(body.capacity),
            area: body.area,
            x: parseFloat(body.x),
            z: parseFloat(body.z)
          };
          writeDB(dbData);
          addSystemLog('Edit Table', 'Admin', `Updated table properties for ID: ${tableId}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, table: dbData.tables[index] }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Table not found' }));
        }
      });
      return;
    }

    if (pathname.startsWith('/api/tables/') && req.method === 'DELETE') {
      const parts = pathname.split('/');
      const tableId = parts[parts.length - 1];
      const index = dbData.tables.findIndex(t => t.id === tableId);
      if (index !== -1) {
        const tableName = dbData.tables[index].name;
        dbData.tables.splice(index, 1);
        writeDB(dbData);
        addSystemLog('Delete Table', 'Admin', `Deleted table ${tableName}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Table not found' }));
      }
      return;
    }

    // 3. Reservations routes
    if (pathname === '/api/reservations') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(dbData.reservations));
      } 
      else if (req.method === 'POST') {
        parseJSONBody(req, res, (body) => {
          const { tableId, date, timeSlot } = body;
          
          // Check duplicate booking conflict
          const isConflict = dbData.reservations.some(r => 
            r.tableId === tableId && 
            r.date === date && 
            r.timeSlot === timeSlot && 
            r.status !== 'Cancelled'
          );

          if (isConflict) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'This table is already booked for this slot.' }));
            return;
          }

          const newRes = {
            id: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
            userId: body.userId,
            userName: body.userName,
            userEmail: body.userEmail,
            userPhone: body.userPhone || 'N/A',
            tableId: body.tableId,
            tableName: body.tableName,
            date: body.date,
            timeSlot: body.timeSlot,
            guests: parseInt(body.guests),
            seatingArea: body.seatingArea,
            status: body.status || 'Pending',
            notes: body.notes || '',
            timestamp: new Date().toISOString()
          };

          dbData.reservations.push(newRes);
          writeDB(dbData);
          addSystemLog('Create Reservation', newRes.userName, `Created booking ${newRes.id} for table ${newRes.tableName}`);

          // Insert confirmation notification
          dbData.notifications.unshift({
            id: `not-${Date.now()}`,
            userId: newRes.userId,
            title: 'Booking Pending Confirmation',
            message: `Your reservation ${newRes.id} for ${newRes.tableName} on ${newRes.date} at ${newRes.timeSlot} is now pending staff approval.`,
            type: 'info',
            isRead: false,
            createdAt: new Date().toISOString()
          });
          writeDB(dbData);

          // Dispatch reservation request email
          const targetEmail = newRes.userEmail || (dbData.users.find(u => u.id === newRes.userId)?.email);
          if (targetEmail) {
            const emailSubject = `Luxe Dining - Reservation Request Received [${newRes.id}]`;
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5c185; padding: 25px; border-radius: 8px; background-color: #240407; color: #fffff0;">
                <div style="text-align: center; border-bottom: 1px solid rgba(229, 193, 133, 0.3); padding-bottom: 20px; margin-bottom: 20px;">
                  <h2 style="color: #e5c185; margin: 0; font-size: 1.8rem; letter-spacing: 2px;">LUXE DINING</h2>
                  <p style="color: #a0a0a0; font-size: 0.9rem; margin: 5px 0 0 0;">Table Reservation Receipt</p>
                </div>
                <p>Dear <strong>${newRes.userName}</strong>,</p>
                <p>We have received your table reservation request. Your reservation details are summarized below and are currently <strong>Pending Confirmation</strong> from our staff.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: rgba(255, 255, 240, 0.05); border-radius: 4px; overflow: hidden;">
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #e5c185; font-weight: bold; width: 40%;">Reservation ID</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${newRes.id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #e5c185; font-weight: bold;">Table Selection</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${newRes.tableName} (${newRes.seatingArea} Area)</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #e5c185; font-weight: bold;">Date & Time</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${newRes.date} at ${newRes.timeSlot}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #e5c185; font-weight: bold;">Guests</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${newRes.guests} persons</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; color: #e5c185; font-weight: bold;">Special Notes</td>
                    <td style="padding: 12px 15px;">${newRes.notes || 'None'}</td>
                  </tr>
                </table>
                
                <p>We will review your request and send you a follow-up confirmation email once your table status is finalized. You may also track the status in your customer dashboard.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="http://localhost:3000/#reservations" style="background-color: #e5c185; color: #240407; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Track Reservation Status</a>
                </div>
                
                <p style="font-size: 0.85rem; color: #a0a0a0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">If you need to make changes or have any questions, feel free to reply to this email or speak with our Luxe AI chatbot.</p>
              </div>
            `;
            sendEmailNative(targetEmail, emailSubject, emailHtml);
          }

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, reservation: newRes }));
        });
      }
      return;
    }

    if (pathname.startsWith('/api/reservations/') && pathname.endsWith('/status') && req.method === 'PUT') {
      const parts = pathname.split('/');
      const resId = parts[parts.length - 2];
      parseJSONBody(req, res, (body) => {
        const index = dbData.reservations.findIndex(r => r.id === resId);
        if (index !== -1) {
          const oldStatus = dbData.reservations[index].status;
          dbData.reservations[index].status = body.status;
          writeDB(dbData);
          addSystemLog('Update Reservation Status', 'Staff/Admin', `Changed booking ${resId} status from ${oldStatus} to ${body.status}`);

          // Add notification for user
          dbData.notifications.unshift({
            id: `not-${Date.now()}`,
            userId: dbData.reservations[index].userId,
            title: `Reservation ${body.status}`,
            message: `Your booking reservation ${resId} for ${dbData.reservations[index].tableName} has been ${body.status.toLowerCase()} by our staff.`,
            type: body.status === 'Approved' ? 'success' : 'error',
            isRead: false,
            createdAt: new Date().toISOString()
          });
          writeDB(dbData);

          // Dispatch status update email
          const booking = dbData.reservations[index];
          const targetEmail = booking.userEmail || (dbData.users.find(u => u.id === booking.userId)?.email);
          if (targetEmail) {
            const isApproved = body.status === 'Approved';
            const statusText = isApproved ? 'Approved & Confirmed' : body.status;
            const statusColor = isApproved ? '#2ecc71' : '#e74c3c';
            const emailSubject = `Luxe Dining - Reservation ${body.status}! [${resId}]`;
            
            const statusMessage = isApproved 
              ? `Great news! Your table reservation has been <strong>Approved and Confirmed</strong>. We look forward to welcoming you to Luxe Dining.`
              : `We regret to inform you that your table reservation has been <strong>Cancelled</strong>. If you believe this is an error or would like to book a different slot, please contact our support team.`;

            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5c185; padding: 25px; border-radius: 8px; background-color: #240407; color: #fffff0;">
                <div style="text-align: center; border-bottom: 1px solid rgba(229, 193, 133, 0.3); padding-bottom: 20px; margin-bottom: 20px;">
                  <h2 style="color: #e5c185; margin: 0; font-size: 1.8rem; letter-spacing: 2px;">LUXE DINING</h2>
                  <p style="color: #a0a0a0; font-size: 0.9rem; margin: 5px 0 0 0;">Table Reservation Update</p>
                </div>
                <p>Dear <strong>${booking.userName}</strong>,</p>
                <p>${statusMessage}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: rgba(255, 255, 240, 0.05); border-radius: 4px; overflow: hidden;">
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #e5c185; font-weight: bold; width: 40%;">Reservation ID</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${booking.id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #e5c185; font-weight: bold;">Status</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: ${statusColor}; font-weight: bold;">${statusText}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #e5c185; font-weight: bold;">Table Selection</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${booking.tableName} (${booking.seatingArea} Area)</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #e5c185; font-weight: bold;">Date & Time</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${booking.date} at ${booking.timeSlot}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #e5c185; font-weight: bold;">Guests</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${booking.guests} persons</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 15px; color: #e5c185; font-weight: bold;">Special Notes</td>
                    <td style="padding: 12px 15px;">${booking.notes || 'None'}</td>
                  </tr>
                </table>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="http://localhost:3000/#reservations" style="background-color: #e5c185; color: #240407; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View My Reservations</a>
                </div>
                
                <p style="font-size: 0.85rem; color: #a0a0a0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">If you have any questions, feel free to reply directly to this email or speak with our virtual assistant on our website.</p>
              </div>
            `;
            sendEmailNative(targetEmail, emailSubject, emailHtml);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, reservation: dbData.reservations[index] }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Reservation not found' }));
        }
      });
      return;
    }

    if (pathname.startsWith('/api/reservations/') && pathname.endsWith('/feedback') && req.method === 'POST') {
      const parts = pathname.split('/');
      const resId = parts[parts.length - 2];
      parseJSONBody(req, res, (body) => {
        const index = dbData.reservations.findIndex(r => r.id === resId);
        if (index !== -1) {
          const feedback = { rating: parseInt(body.rating), comment: body.comment };
          dbData.reservations[index].feedback = feedback;
          
          // Add to global reviews list
          const newReview = {
            id: `rev-${Date.now()}`,
            userName: dbData.reservations[index].userName,
            rating: feedback.rating,
            comment: feedback.comment,
            date: new Date().toISOString().split('T')[0]
          };
          dbData.reviews.unshift(newReview);
          writeDB(dbData);
          addSystemLog('Submit Feedback', dbData.reservations[index].userName, `Submitted reviews rating ${feedback.rating}/5 for booking ${resId}`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Reservation not found' }));
        }
      });
      return;
    }

    // 4. Notifications routes
    if (pathname === '/api/notifications' && req.method === 'GET') {
      const userId = parsedUrl.searchParams.get('userId');
      const list = userId 
        ? dbData.notifications.filter(n => n.userId === userId) 
        : dbData.notifications;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (pathname === '/api/notifications/send' && req.method === 'POST') {
      parseJSONBody(req, res, (body) => {
        const newNot = {
          id: `not-${Date.now()}`,
          userId: body.userId || 'all',
          title: body.title,
          message: body.message,
          type: body.type || 'info',
          isRead: false,
          createdAt: new Date().toISOString()
        };
        dbData.notifications.unshift(newNot);
        writeDB(dbData);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, notification: newNot }));
      });
      return;
    }

    // 5. Reviews, logs, users profile update routes
    if (pathname === '/api/reviews' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dbData.reviews));
      return;
    }

    if (pathname === '/api/logs' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dbData.logs));
      return;
    }

    if (pathname === '/api/users' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dbData.users));
      return;
    }

    if (pathname.startsWith('/api/users/') && req.method === 'PUT') {
      const parts = pathname.split('/');
      const userId = parts[parts.length - 1];
      parseJSONBody(req, res, (body) => {
        const index = dbData.users.findIndex(u => u.id === userId);
        if (index !== -1) {
          dbData.users[index] = {
            ...dbData.users[index],
            name: body.name,
            email: body.email,
            phone: body.phone
          };
          writeDB(dbData);
          addSystemLog('Profile Updated', body.name, `Updated user account details`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, user: dbData.users[index] }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'User not found' }));
        }
      });
      return;
    }

    // 6. Analytics routes
    if (pathname === '/api/analytics/bookings' && req.method === 'GET') {
      // Aggregate bookings by day of the week
      const counts = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
      dbData.reservations.forEach(r => {
        const day = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' });
        if (counts[day] !== undefined) counts[day]++;
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, summary: counts }));
      return;
    }

    if (pathname === '/api/analytics/tables' && req.method === 'GET') {
      const total = dbData.tables.length;
      const todayStr = new Date().toISOString().split('T')[0];
      const occupied = dbData.reservations.filter(r => r.date === todayStr && r.status === 'Approved').length;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, total, occupied, available: Math.max(0, total - occupied) }));
      return;
    }

    if (pathname === '/api/analytics/peak-hours' && req.method === 'GET') {
      const slots = ['12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM', '10:00 PM'];
      const slotCounts = { '12:00 PM': 0, '02:00 PM': 0, '04:00 PM': 0, '06:00 PM': 0, '08:00 PM': 0, '10:00 PM': 0 };
      dbData.reservations.forEach(r => {
        if (slotCounts[r.timeSlot] !== undefined) slotCounts[r.timeSlot]++;
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, slots: slotCounts }));
      return;
    }

    // 7. Gemini AI endpoints
    if (pathname === '/api/ai/chat' && req.method === 'POST') {
      parseJSONBody(req, res, (body) => {
        const { message, userProfile } = body;
        
        const systemPrompt = `You are "Luxe Dining AI Assistant", a conversational bot for Luxe Dining luxury restaurant.
Provide elegant, polite, and helpful answers about fine dining, cuisines (Caviar, Truffle, Wagyu), operating hours, and reservations.
If asked about tables: recommend VIP Lounge 7 (quiet business space) or Patio VIP 12 (outdoor view).
Keep responses brief, structured, and formal. Formatting title strings as bold.
Current user: ${userProfile ? JSON.stringify(userProfile) : 'Guest'}`;

        callGemini(systemPrompt, message, (err, aiReply) => {
          if (err) {
            console.error('Gemini Chat Error, loading fallback responses:', err);
            // Fallback response loader
            const lower = message.toLowerCase();
            let reply = "Hello! I am Luxe Dining AI. I can recommend tables, check peak times, or help you book tables.";
            if (lower.includes('recommend') || lower.includes('suggest')) {
              reply = "**Luxe Table Recommendations:** For couples, try **Patio VIP 12** (outdoor patio). For business, try **VIP Lounge 7** (indoor corner).";
            } else if (lower.includes('peak') || lower.includes('busy')) {
              reply = "**Luxe Peak Hours:** Friday & Saturday 7:30 PM - 9:30 PM are peak slots. 6:00 PM or 10:00 PM are recommended for a quieter experience.";
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, reply }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, reply: aiReply }));
          }
        });
      });
      return;
    }

    if (pathname === '/api/ai/recommend-table' && req.method === 'POST') {
      parseJSONBody(req, res, (body) => {
        const { guests, area, occasion } = body;
        const tablesStr = JSON.stringify(dbData.tables);
        
        const systemPrompt = `Recommend the single best table from this JSON list of tables: ${tablesStr}.
Match parameters: guests: ${guests}, preferred area: ${area}, occasion/notes: ${occasion || 'normal dinner'}.
Explain why this table fits best. Return response in a beautiful brief format.`;

        callGemini(systemPrompt, 'Recommend a table now.', (err, aiReply) => {
          if (err) {
            console.error('Gemini Recommendation Error, running fallback model:', err);
            const match = dbData.tables.find(t => t.capacity >= guests && (area === 'any' || t.area === area));
            const reply = match 
              ? `**AI Recommendation:** We recommend **${match.name}** (${match.category}, ${match.area.toUpperCase()}). It perfectly accommodates your group size.`
              : `**AI Recommendation:** No direct match found. Try selecting one of our VIP lounges or Patio suites.`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, reply }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, reply: aiReply }));
          }
        });
      });
      return;
    }

    if (pathname === '/api/ai/predict-peak-hours' && req.method === 'POST') {
      parseJSONBody(req, res, (body) => {
        const { date, timeSlot } = body;
        
        const systemPrompt = `Analyze booking occupancy risk for Luxe Dining on Date: ${date} and Time Slot: ${timeSlot}.
Assess if it is a peak hour and what the occupancy percentage risk would be.
Explain brief tips for guests to avoid waitlists.`;

        callGemini(systemPrompt, 'Predict peak hour parameters.', (err, aiReply) => {
          if (err) {
            console.error('Gemini Predict Error, running local probability model:', err);
            // compute local risk probability
            let risk = 40;
            const day = new Date(date).getDay();
            if (day === 5 || day === 6) risk += 30; // Friday/Saturday
            if (timeSlot === '08:00 PM') risk += 25;
            else if (timeSlot === '06:00 PM') risk += 15;
            
            const reply = `**AI Peak Prediction:** Occupancy risk is projected at **${Math.min(95, risk)}%**. Tips: Book early or reserve at 12:00 PM / 10:00 PM to skip peak slots.`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, reply }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, reply: aiReply }));
          }
        });
      });
      return;
    }

    // 8. Razorpay Payment endpoints
    if (pathname === '/api/payment/create-order' && req.method === 'POST') {
      parseJSONBody(req, res, (body) => {
        const amount = parseInt(body.amount) || 50000; // in paise (₹500.00 default)
        const apiKey = process.env.RAZORPAY_KEY_ID;
        const apiSecret = process.env.RAZORPAY_KEY_SECRET;

        const sendMockOrder = (responseObj, amt) => {
          responseObj.writeHead(200, { 'Content-Type': 'application/json' });
          responseObj.end(JSON.stringify({
            success: true,
            isMock: true,
            key: 'rzp_test_defaultLuxeDining',
            orderId: `order_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            amount: amt
          }));
        };

        if (apiKey && apiSecret && !apiKey.startsWith('your_')) {
          const authStr = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
          const payload = JSON.stringify({
            amount: amount,
            currency: 'INR',
            receipt: `receipt_booking_${Date.now()}`
          });

          const options = {
            hostname: 'api.razorpay.com',
            port: 443,
            path: '/v1/orders',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${authStr}`,
              'Content-Length': Buffer.byteLength(payload)
            }
          };

          const reqPay = https.request(options, (resPay) => {
            let bodyPay = '';
            resPay.on('data', chunk => bodyPay += chunk);
            resPay.on('end', () => {
              try {
                const payJson = JSON.parse(bodyPay);
                if (payJson.id) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: true,
                    isMock: false,
                    key: apiKey,
                    orderId: payJson.id,
                    amount: amount
                  }));
                } else {
                  console.warn('Razorpay returned error response, falling back:', payJson);
                  sendMockOrder(res, amount);
                }
              } catch (e) {
                console.error('Error parsing Razorpay response, falling back:', e);
                sendMockOrder(res, amount);
              }
            });
          });

          reqPay.on('error', (err) => {
            console.error('Razorpay request failed, falling back:', err);
            sendMockOrder(res, amount);
          });

          reqPay.write(payload);
          reqPay.end();
        } else {
          // Fallback to simulated sandbox checkout details
          sendMockOrder(res, amount);
        }
      });
      return;
    }

    if (pathname === '/api/payment/verify' && req.method === 'POST') {
      parseJSONBody(req, res, (body) => {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
        const apiSecret = process.env.RAZORPAY_KEY_SECRET;

        if (!razorpay_order_id || !razorpay_payment_id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Missing payment signature components' }));
          return;
        }

        // Handle mock verification
        if (razorpay_order_id.startsWith('order_mock_')) {
          addSystemLog('Payment Verified', 'System', `Mock payment verified: ID ${razorpay_payment_id}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Mock payment verified successfully' }));
          return;
        }

        if (apiSecret && !apiSecret.startsWith('your_')) {
          try {
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', apiSecret);
            hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
            const generatedSignature = hmac.digest('hex');

            if (generatedSignature === razorpay_signature) {
              addSystemLog('Payment Verified', 'Razorpay', `Secure transaction verified: Payment ID ${razorpay_payment_id}`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Payment signature verified successfully' }));
            } else {
              console.warn('Razorpay signature mismatch:');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Signature verification failed' }));
            }
          } catch (e) {
            console.error('Signature crypto error:', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Internal validation error' }));
          }
        } else {
          // Key Secret missing but not simulated: default success for development fallback
          addSystemLog('Payment Verified', 'System Fallback', `Verified payment ID: ${razorpay_payment_id}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Sandbox payment verified (development bypass)' }));
        }
      });
      return;
    }

  }

  // --- STATIC FILES ROUTER ---
  let safeFilePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safeFilePath === '/' || safeFilePath === '\\') {
    safeFilePath = 'index.html';
  }

  const absolutePath = path.join(__dirname, safeFilePath);

  // Verify paths to prevent directory traversal escapes
  if (!absolutePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.json': 'application/json',
      '.svg': 'image/svg+xml'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    
    const stream = fs.createReadStream(absolutePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Luxe Dining backend server running at http://localhost:${PORT}`);
  console.log(`Using Database file: ${DB_FILE}`);
});
