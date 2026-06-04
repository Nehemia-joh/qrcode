import { recordAttendanceEvent } from './attendanceEventsStore.js';
import { notifyParentFeeAlert } from './smsService.js';
import { notifyParentFeeEmail } from './emailService.js';
import { enrichAttendanceFromDb } from './nehemiahBridge.js';

function feeNotifyEnabled() {
  return process.env.AUTO_FEE_NOTIFY_ON_SCAN !== 'false';
}

export async function handleAttendanceWebhook(rawBody) {
  const body = await enrichAttendanceFromDb(rawBody);
  const event = recordAttendanceEvent(body);

  const notify = { attempted: false, sms: null, email: null, errors: [] };
  const inCredit = !!(body.is_in_credit ?? body.isInCredit);

  if (feeNotifyEnabled() && inCredit) {
    notify.attempted = true;
    const student = {
      studentId: body.student_id || body.studentId,
      full_name: body.full_name || body.fullName,
      fullName: body.full_name || body.fullName,
      parent_phone: body.parent_phone || body.parentPhone,
      parentPhone: body.parent_phone || body.parentPhone,
      parent_email: body.parent_email || body.parentEmail,
      parentEmail: body.parent_email || body.parentEmail,
      balance: body.current_balance ?? body.balance,
      current_balance: body.current_balance ?? body.balance,
    };

    if (student.parent_phone || student.parentPhone) {
      try {
        notify.sms = await notifyParentFeeAlert(student);
      } catch (e) {
        notify.errors.push({ channel: 'sms', message: e.message });
      }
    }

    if (student.parent_email || student.parentEmail) {
      try {
        notify.email = await notifyParentFeeEmail(student);
      } catch (e) {
        notify.errors.push({ channel: 'email', message: e.message });
      }
    }

    if (!student.parent_phone && !student.parentPhone && !student.parent_email && !student.parentEmail) {
      notify.errors.push({
        channel: 'none',
        message: 'Student in credit but no parent phone/email on webhook or database',
      });
    }
  }

  return { event, notify, inCredit };
}
