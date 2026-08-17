import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'seating.sqlite');

let dbInstance = null;
let SQL = null;

function isCorruptDatabaseError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /database disk image is malformed|not a database|file is encrypted/i.test(message);
}

function backupCorruptDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `${DB_FILE}.corrupt-${timestamp}`;
  fs.copyFileSync(DB_FILE, backupFile);
  console.error(`Corrupt database preserved at ${backupFile}`);
}

export async function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
      initTables(dbInstance);
      saveDatabase(dbInstance);
      return dbInstance;
    } catch (err) {
      if (!isCorruptDatabaseError(err)) {
        throw err;
      }

      console.error('Existing database is corrupt; creating a fresh database:', err);
      // Keep the original bytes available for manual recovery before replacing it.
      backupCorruptDatabase();
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  saveDatabase(dbInstance);
  return dbInstance;
}

export function saveDatabase(db) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

function initTables(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      filler_name TEXT NOT NULL,
      notes TEXT,
      total_assigned INTEGER NOT NULL DEFAULT 0,
      total_seats INTEGER NOT NULL DEFAULT 32,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS seat_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      seat_code TEXT NOT NULL,
      person_name TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default roster if empty
  const peopleCount = db.exec('SELECT COUNT(*) AS count FROM people;');
  const count = peopleCount[0]?.values[0]?.[0] || 0;
  if (count === 0) {
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
      try {
        db.run('INSERT OR IGNORE INTO people (name, created_at) VALUES (?, ?)', [name, now]);
      } catch (e) {
        // ignore duplicate
      }
    }
  }
}
