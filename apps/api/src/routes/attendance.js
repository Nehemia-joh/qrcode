import { Router } from 'express';
import { resolveSchoolId } from '../data/schools.js';
import { getRecentEvents, getTodayCount } from '../services/attendanceEventsStore.js';

export const attendanceRouter = Router();

attendanceRouter.get('/live', (req, res) => {
  const schoolId = resolveSchoolId(req.query.schoolId);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const events = getRecentEvents(limit, schoolId);
  res.json({
    ok: true,
    source: 'webhook_feed',
    schoolId,
    todayCount: getTodayCount(schoolId),
    records: events.map((e) => ({
      full_name: e.fullName,
      student_id: e.studentId,
      attendance_time: e.attendanceTime,
      attendance_type: e.attendanceType,
      is_in_credit: e.isInCredit,
      current_balance: e.balance,
      bus_number: e.busNumber,
      parent_phone: e.parentPhone,
    })),
  });
});
