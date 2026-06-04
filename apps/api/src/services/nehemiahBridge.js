import { loadSheetRaw } from './sheetLoader.js';

let dbPool = null;

export function isNehemiahDbEnabled() {
  if (process.env.NEHEMIAH_DB_ENABLED === 'false') return false;
  return !!process.env.NEHEMIAH_DB_HOST;
}

async function getDb() {
  if (dbPool) return dbPool;
  if (!isNehemiahDbEnabled()) return null;
  const host = process.env.NEHEMIAH_DB_HOST;
  if (!host) return null;
  try {
    const mysql = await import('mysql2/promise');
    dbPool = mysql.createPool({
      host,
      user: process.env.NEHMIAH_DB_USER || 'root',
      password: process.env.NEHMIAH_DB_PASSWORD || '',
      database: process.env.NEHMIAH_DB_NAME || 'school_bus_tracking',
      waitForConnections: true,
      connectionLimit: 3,
    });
    await dbPool.query('SELECT 1');
    return dbPool;
  } catch (e) {
    console.warn('[nehemiah] MySQL unavailable:', e.message);
    dbPool = null;
    return null;
  }
}

async function statsFromMysql() {
  const db = await getDb();
  if (!db) return null;

  const [attRows] = await db.query(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN attendance_type = 'morning_pickup' THEN 1 ELSE 0 END) as morning_pickup,
      SUM(CASE WHEN attendance_type = 'morning_drop' THEN 1 ELSE 0 END) as morning_drop,
      SUM(CASE WHEN attendance_type = 'evening_pickup' THEN 1 ELSE 0 END) as evening_pickup,
      SUM(CASE WHEN attendance_type = 'evening_drop' THEN 1 ELSE 0 END) as evening_drop
    FROM attendance_records WHERE attendance_date = CURDATE()
  `);
  const [stuRows] = await db.query(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN is_in_credit = 1 THEN 1 ELSE 0 END) as in_credit,
      SUM(current_balance) as total_balance
    FROM students
  `);
  const [busRows] = await db.query(`
    SELECT COUNT(*) as active_buses FROM bus_routes WHERE status = 'active'
  `);

  const att = attRows[0]?.[0] ?? attRows[0];
  const stu = stuRows[0]?.[0] ?? stuRows[0];
  const bus = busRows[0]?.[0] ?? busRows[0];

  return {
    source: 'mysql',
    todayAttendance: {
      total: Number(att?.total ?? 0),
      morningPickup: Number(att?.morning_pickup ?? 0),
      morningDrop: Number(att?.morning_drop ?? 0),
      eveningPickup: Number(att?.evening_pickup ?? 0),
      eveningDrop: Number(att?.evening_drop ?? 0),
    },
    students: {
      total: Number(stu?.total ?? 0),
      active: Number(stu?.active ?? 0),
      inCredit: Number(stu?.in_credit ?? 0),
      totalBalance: Number(stu?.total_balance ?? 0),
    },
    buses: { active: Number(bus?.active_buses ?? 0) },
    financeAlerts: Number(stu?.in_credit ?? 0),
  };
}

async function statsFromPhpApi() {
  const base = process.env.NEHMIAH_API_BASE_URL || process.env.NEHEMIAH_API_BASE_URL;
  if (!base) return null;
  try {
    const url = `${base.replace(/\/$/, '')}/stats.php`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    const s = data.stats;
    return {
      source: 'php_api',
      todayAttendance: {
        total: s.today_attendance?.total ?? 0,
        morningPickup: s.today_attendance?.morning_pickup ?? 0,
        morningDrop: s.today_attendance?.morning_drop ?? 0,
        eveningPickup: s.today_attendance?.evening_pickup ?? 0,
        eveningDrop: s.today_attendance?.evening_drop ?? 0,
      },
      students: {
        total: s.students?.total ?? 0,
        active: s.students?.active ?? 0,
        inCredit: s.students?.in_credit ?? 0,
        totalBalance: s.students?.total_balance ?? 0,
      },
      buses: { active: s.buses?.active ?? 0 },
      financeAlerts: s.students?.in_credit ?? 0,
    };
  } catch (e) {
    console.warn('[nehemiah] PHP API unavailable:', e.message);
    return null;
  }
}

function statsFromSheetAttendance(schoolId = 'sl-main') {
  let scanCount = 0;
  const recent = [];

  for (const slug of ['AttendanceA', 'AttendanceB']) {
    const rows = loadSheetRaw(schoolId, slug)?.slice(1) ?? [];
    for (const r of rows) {
      if (r?.[0] && r?.[1]) {
        scanCount++;
        if (recent.length < 8) recent.push({ name: r[0], timestamp: r[1] });
      }
    }
  }

  return {
    source: 'master_sheet',
    todayAttendance: { total: scanCount, morningPickup: scanCount, morningDrop: 0, eveningPickup: 0, eveningDrop: 0 },
    students: { total: null, active: null, inCredit: null, totalBalance: null },
    buses: { active: null },
    financeAlerts: null,
    recentScans: recent,
    note: 'Set NEHEMIAH_DB_* in .env for live QR/finance from Nehemiah database.',
  };
}

export async function getNehemiahStats(schoolId = 'sl-main') {
  return (
    (await statsFromMysql()) ??
    (await statsFromPhpApi()) ??
    statsFromSheetAttendance(schoolId)
  );
}

export async function getRecentAttendance(limit = 20, schoolId = 'sl-main') {
  const db = await getDb();
  if (db) {
    const [rows] = await db.query(
      `SELECT s.full_name, s.student_id, s.parent_phone, a.attendance_type, a.attendance_time,
              s.is_in_credit, s.current_balance, s.bus_number
       FROM attendance_records a
       JOIN students s ON s.id = a.student_id
       ORDER BY a.attendance_time DESC LIMIT ?`,
      [limit]
    );
    return { source: 'mysql', records: rows };
  }

  const sheet = statsFromSheetAttendance(schoolId);
  return {
    source: sheet.source,
    records: (sheet.recentScans ?? []).map((r) => ({
      full_name: r.name,
      attendance_time: r.timestamp,
    })),
  };
}

export async function getFinanceAlerts(limit = 50) {
  const db = await getDb();
  if (db) {
    const [rows] = await db.query(
      `SELECT student_id, full_name, parent_phone, current_balance, is_in_credit, bus_number, daily_deduction_rate
       FROM students
       WHERE status = 'active' AND (is_in_credit = 1 OR current_balance < 0)
       ORDER BY current_balance ASC
       LIMIT ?`,
      [limit]
    );
    return {
      source: 'mysql',
      count: rows.length,
      alerts: rows.map((r) => ({
        studentId: r.student_id,
        fullName: r.full_name,
        parentPhone: r.parent_phone,
        balance: Number(r.current_balance),
        inCredit: !!r.is_in_credit,
        busNumber: r.bus_number,
        dailyRate: Number(r.daily_deduction_rate),
        smsRecommended: !!r.parent_phone,
      })),
      note: 'SMS/WhatsApp integration: wire Twilio or Africa\'s Talking in phase 5.',
    };
  }

  return {
    source: 'unavailable',
    count: 0,
    alerts: [],
    note: 'Connect NEHEMIAH_DB_* to load students with fee alerts for parent notification.',
  };
}

export async function checkNehemiahConnection() {
  if (!isNehemiahDbEnabled() && !process.env.NEHMIAH_API_BASE_URL) {
    return {
      connected: false,
      mode: 'master_sheet_fallback',
      enabled: false,
      hint: 'Set NEHEMIAH_DB_HOST when ready to link MySQL.',
    };
  }

  const db = await getDb();
  if (db) return { connected: true, mode: 'mysql', enabled: true };
  const base = process.env.NEHMIAH_API_BASE_URL;
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/stats.php`);
      if (res.ok) return { connected: true, mode: 'php_api', enabled: true };
    } catch {
      /* fall through */
    }
  }
  return {
    connected: false,
    mode: 'master_sheet_fallback',
    enabled: isNehemiahDbEnabled(),
    hint: isNehemiahDbEnabled()
      ? 'MySQL configured but connection failed — check NEHEMIAH_DB_* credentials.'
      : 'Using Google Sheet / webhook data until database is linked.',
  };
}

/** Fill parent contact / balance from MySQL when webhook payload is sparse */
export async function enrichAttendanceFromDb(payload) {
  const studentId = payload.student_id || payload.studentId || payload.qr_data;
  if (!studentId) return payload;

  const db = await getDb();
  if (!db) return payload;

  try {
    const [rows] = await db.query(
      `SELECT student_id, full_name, parent_phone, parent_email, current_balance, is_in_credit, bus_number
       FROM students WHERE student_id = ? AND status = 'active' LIMIT 1`,
      [studentId]
    );
    const s = rows[0];
    if (!s) return payload;

    return {
      ...payload,
      student_id: s.student_id,
      full_name: payload.full_name || payload.fullName || s.full_name,
      parent_phone: payload.parent_phone || payload.parentPhone || s.parent_phone,
      parent_email: payload.parent_email || payload.parentEmail || s.parent_email,
      current_balance: payload.current_balance ?? payload.balance ?? s.current_balance,
      is_in_credit: payload.is_in_credit ?? payload.isInCredit ?? s.is_in_credit,
      bus_number: payload.bus_number || payload.busNumber || s.bus_number,
    };
  } catch (e) {
    console.warn('[nehemiah] enrichAttendanceFromDb:', e.message);
    return payload;
  }
}

export async function testNehemiahDatabase() {
  if (!isNehemiahDbEnabled()) {
    return {
      ok: false,
      message: 'Database linking is disabled or NEHEMIAH_DB_HOST is not set.',
      steps: [
        'Set NEHEMIAH_DB_HOST, NEHEMIAH_DB_USER, NEHEMIAH_DB_PASSWORD, NEHEMIAH_DB_NAME in .env',
        'Use the same database as legacy/qrcode (school_bus_tracking)',
        'Restart the API after changing .env',
      ],
    };
  }

  const prev = dbPool;
  dbPool = null;
  try {
    const db = await getDb();
    if (!db) {
      return {
        ok: false,
        message: 'Could not connect to MySQL.',
        steps: [
          'Verify MySQL is running and credentials match legacy/qrcode/config/database.php',
          'Grant the user access to school_bus_tracking',
        ],
      };
    }
    const [tables] = await db.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('students','attendance_records','bus_routes')`,
      [process.env.NEHEMIAH_DB_NAME || 'school_bus_tracking']
    );
    const names = tables.map((t) => t.TABLE_NAME);
    return {
      ok: true,
      message: 'Connected to Nehemiah MySQL.',
      database: process.env.NEHEMIAH_DB_NAME || 'school_bus_tracking',
      tablesFound: names,
      tablesExpected: ['students', 'attendance_records', 'bus_routes'],
    };
  } catch (e) {
    return { ok: false, message: e.message };
  } finally {
    if (!prev) dbPool = null;
  }
}
