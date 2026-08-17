import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase, saveDatabase } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Fixed Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Oss@2026';
const ADMIN_TOKEN = 'oss_admin_auth_token_secret_998877';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware to protect admin-only routes
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const customHeader = req.headers['x-admin-token'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || customHeader;

  if (token === ADMIN_TOKEN) {
    return next();
  }
  return res.status(401).json({
    success: false,
    error: 'دسترسی غیرمجاز: برای مشاهده و مدیریت این بخش باید با حساب ادمین وارد شوید.',
  });
}

// Helper to format sqlite results into JSON objects
function formatQueryResults(result) {
  if (!result || !result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

// ==================== AUTH ROUTES ==================== //

// Admin Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (
    username &&
    password &&
    String(username).trim() === ADMIN_USERNAME &&
    String(password).trim() === ADMIN_PASSWORD
  ) {
    return res.json({
      success: true,
      token: ADMIN_TOKEN,
      user: {
        username: ADMIN_USERNAME,
        role: 'admin',
      },
    });
  }

  return res.status(401).json({
    success: false,
    error: 'نام کاربری یا رمز عبور ادمین نادرست است.',
  });
});

// Verify Admin Token
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const customHeader = req.headers['x-admin-token'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || customHeader;

  if (token === ADMIN_TOKEN) {
    return res.json({ success: true, isAdmin: true, username: ADMIN_USERNAME });
  }
  return res.json({ success: false, isAdmin: false });
});

// ==================== API ROUTES ==================== //

// 1. Get all submissions (Admin Only)
app.get('/api/submissions', requireAdminAuth, async (req, res) => {
  try {
    const db = await getDatabase();
    const result = db.exec(`
      SELECT 
        s.id, 
        s.title, 
        s.filler_name, 
        s.notes, 
        s.total_assigned, 
        s.total_seats, 
        s.created_at, 
        s.updated_at,
        COUNT(a.id) as actual_assigned_count
      FROM submissions s
      LEFT JOIN seat_assignments a ON s.id = a.submission_id
      GROUP BY s.id
      ORDER BY s.id DESC
    `);
    const submissions = formatQueryResults(result);
    res.json({ success: true, data: submissions });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get single submission with its full seat assignments (Admin Only)
app.get('/api/submissions/:id', requireAdminAuth, async (req, res) => {
  try {
    const db = await getDatabase();
    const subId = parseInt(req.params.id, 10);
    if (isNaN(subId)) {
      return res.status(400).json({ success: false, error: 'Invalid submission ID' });
    }

    const subRes = db.exec(`SELECT * FROM submissions WHERE id = ${subId}`);
    const subRows = formatQueryResults(subRes);
    if (!subRows.length) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    const assignmentsRes = db.exec(`SELECT seat_code, person_name, assigned_at FROM seat_assignments WHERE submission_id = ${subId}`);
    const assignmentRows = formatQueryResults(assignmentsRes);

    const assignmentsMap = {};
    for (const a of assignmentRows) {
      assignmentsMap[a.seat_code] = a.person_name;
    }

    res.json({
      success: true,
      data: {
        ...subRows[0],
        assignments: assignmentsMap,
        rawAssignments: assignmentRows,
      },
    });
  } catch (err) {
    console.error('Error fetching submission details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create a new submission + seat assignments (Public submission allowed)
app.post('/api/submissions', async (req, res) => {
  try {
    const {
      title,
      filler_name,
      notes = '',
      assignments = {},
      total_seats = 32,
    } = req.body;

    if (!filler_name || !filler_name.trim()) {
      return res.status(400).json({ success: false, error: 'نام تکمیل‌کننده فرم الزامی است.' });
    }

    const db = await getDatabase();
    const now = new Date().toISOString();
    const subTitle = (title && title.trim()) ? title.trim() : `چیدمان ثبت شده توسط ${filler_name.trim()}`;

    const assignedEntries = Object.entries(assignments).filter(([_, name]) => name && String(name).trim());
    const totalAssigned = assignedEntries.length;

    db.run(
      `INSERT INTO submissions (title, filler_name, notes, total_assigned, total_seats, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [subTitle, filler_name.trim(), notes.trim(), totalAssigned, total_seats, now, now]
    );

    const lastIdRes = db.exec('SELECT last_insert_rowid() AS id;');
    const submissionId = lastIdRes[0].values[0][0];

    for (const [seatCode, personName] of assignedEntries) {
      db.run(
        `INSERT INTO seat_assignments (submission_id, seat_code, person_name, assigned_at) VALUES (?, ?, ?, ?)`,
        [submissionId, seatCode, String(personName).trim(), now]
      );
    }

    saveDatabase(db);

    res.status(201).json({
      success: true,
      data: {
        id: submissionId,
        title: subTitle,
        filler_name: filler_name.trim(),
        total_assigned: totalAssigned,
        created_at: now,
      },
    });
  } catch (err) {
    console.error('Error creating submission:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update an existing submission (Admin Only)
app.put('/api/submissions/:id', requireAdminAuth, async (req, res) => {
  try {
    const subId = parseInt(req.params.id, 10);
    if (isNaN(subId)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const {
      title,
      filler_name,
      notes = '',
      assignments = {},
      total_seats = 32,
    } = req.body;

    const db = await getDatabase();
    const checkRes = db.exec(`SELECT id FROM submissions WHERE id = ${subId}`);
    if (!checkRes.length || !checkRes[0].values.length) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    const now = new Date().toISOString();
    const assignedEntries = Object.entries(assignments).filter(([_, name]) => name && String(name).trim());
    const totalAssigned = assignedEntries.length;

    db.run(
      `UPDATE submissions SET 
        title = ?, 
        filler_name = ?, 
        notes = ?, 
        total_assigned = ?, 
        total_seats = ?, 
        updated_at = ? 
       WHERE id = ?`,
      [title, filler_name, notes, totalAssigned, total_seats, now, subId]
    );

    // Delete existing assignments for this submission and re-insert
    db.run(`DELETE FROM seat_assignments WHERE submission_id = ${subId}`);

    for (const [seatCode, personName] of assignedEntries) {
      db.run(
        `INSERT INTO seat_assignments (submission_id, seat_code, person_name, assigned_at) VALUES (?, ?, ?, ?)`,
        [subId, seatCode, String(personName).trim(), now]
      );
    }

    saveDatabase(db);
    res.json({ success: true, message: 'چیدمان با موفقیت به‌روزرسانی شد.' });
  } catch (err) {
    console.error('Error updating submission:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete submission (Admin Only)
app.delete('/api/submissions/:id', requireAdminAuth, async (req, res) => {
  try {
    const subId = parseInt(req.params.id, 10);
    if (isNaN(subId)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const db = await getDatabase();
    db.run(`DELETE FROM seat_assignments WHERE submission_id = ${subId}`);
    db.run(`DELETE FROM submissions WHERE id = ${subId}`);
    saveDatabase(db);

    res.json({ success: true, message: 'رکورد با موفقیت حذف شد.' });
  } catch (err) {
    console.error('Error deleting submission:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. People roster management (Read is public, Modification is Admin Only)
app.get('/api/people', async (req, res) => {
  try {
    const db = await getDatabase();
    const result = db.exec('SELECT * FROM people ORDER BY id ASC');
    const people = formatQueryResults(result);
    res.json({ success: true, data: people });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/people', requireAdminAuth, async (req, res) => {
  try {
    const { names } = req.body;
    if (!names || !Array.isArray(names)) {
      return res.status(400).json({ success: false, error: 'Names list required' });
    }

    const db = await getDatabase();
    const now = new Date().toISOString();
    let addedCount = 0;

    for (const rawName of names) {
      const name = String(rawName || '').trim();
      if (!name) continue;
      try {
        db.run('INSERT OR IGNORE INTO people (name, created_at) VALUES (?, ?)', [name, now]);
        addedCount++;
      } catch (e) {
        // ignore
      }
    }

    saveDatabase(db);
    const result = db.exec('SELECT * FROM people ORDER BY id ASC');
    res.json({ success: true, data: formatQueryResults(result), addedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset roster to default (Admin Only)
app.post('/api/people/reset', requireAdminAuth, async (req, res) => {
  try {
    const db = await getDatabase();
    db.run('DELETE FROM people;');
    
    const initialList = [
      "رضا هاشمی", "عرفان بنیادی", "محمد زارع پور", "خانم سلطانی", 
      "خانم امیر حسینی", "خانم فرزین", "مهدی کارگر", "علیرضا عبادی", 
      "محمد یوسفی", "محمد جولایی", "میثم پورکرمی", "علی موسوی", 
      "علیرضا قربانی", "سینا ارفعی", "احسان عمادی فرد", "سلیمان", 
      "مجید عسگری", "محمدمهدی بنیادی", "مهدی خطیر", "علی خاتمیان", 
      "امیرحسین میرزایی نیا", "فرحناز حاجی زاده", "سهیل اسدزاده", 
      "محمدمهدی شعاعی", "مبین رازقندی", "بهزاد نعیمیان", "اسد امینی پور", 
      "بابک خوئینی", "خانم شریف زاده", "نفر جدید", "منصور خالقیان", 
      "روزبه شهیدی", "محمد قاسمی"
    ];

    const now = new Date().toISOString();
    for (const name of initialList) {
      db.run('INSERT OR IGNORE INTO people (name, created_at) VALUES (?, ?)', [name, now]);
    }
    saveDatabase(db);

    const result = db.exec('SELECT * FROM people ORDER BY id ASC');
    res.json({ success: true, data: formatQueryResults(result) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete single person (Admin Only)
app.delete('/api/people/:id', requireAdminAuth, async (req, res) => {
  try {
    const personId = parseInt(req.params.id, 10);
    const db = await getDatabase();
    db.run(`DELETE FROM people WHERE id = ${personId}`);
    saveDatabase(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Global stats (Admin Only)
app.get('/api/stats', requireAdminAuth, async (req, res) => {
  try {
    const db = await getDatabase();
    const totalSubsRes = db.exec('SELECT COUNT(*) AS total FROM submissions');
    const totalAssignmentsRes = db.exec('SELECT COUNT(*) AS total FROM seat_assignments');
    const uniqueFillersRes = db.exec('SELECT COUNT(DISTINCT filler_name) AS total FROM submissions');
    const mostPopularSeatsRes = db.exec(`
      SELECT seat_code, COUNT(*) as count 
      FROM seat_assignments 
      GROUP BY seat_code 
      ORDER BY count DESC 
      LIMIT 6
    `);

    const recentSubmissionsRes = db.exec(`
      SELECT id, title, filler_name, total_assigned, created_at 
      FROM submissions 
      ORDER BY id DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totalSubmissions: totalSubsRes[0]?.values[0]?.[0] || 0,
        totalSeatAssignments: totalAssignmentsRes[0]?.values[0]?.[0] || 0,
        uniqueFillers: uniqueFillersRes[0]?.values[0]?.[0] || 0,
        mostPopularSeats: formatQueryResults(mostPopularSeatsRes),
        recentSubmissions: formatQueryResults(recentSubmissionsRes),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== FRONTEND SERVING ==================== //

async function startServer() {
  // Initialize Database on startup
  await getDatabase();
  console.log('SQLite database initialized successfully');

  if (!isProd) {
    // Development mode with Vite Middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (${isProd ? 'Production' : 'Development with Vite'})`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
});
