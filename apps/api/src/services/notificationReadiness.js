import { getEmailConfig } from './emailService.js';
import { getSmsConfig } from './smsService.js';

export function getNotificationReadiness() {
  const email = getEmailConfig();
  const sms = getSmsConfig();

  const emailMissing = [];
  if (email.provider === 'smtp') {
    if (!process.env.SMTP_HOST) emailMissing.push('SMTP_HOST');
    if (!process.env.SMTP_FROM && !process.env.SMTP_USER) emailMissing.push('SMTP_FROM or SMTP_USER');
  }

  const smsMissing = [];
  if (sms.provider === 'twilio') {
    if (!process.env.TWILIO_ACCOUNT_SID) smsMissing.push('TWILIO_ACCOUNT_SID');
    if (!process.env.TWILIO_AUTH_TOKEN) smsMissing.push('TWILIO_AUTH_TOKEN');
    if (!process.env.TWILIO_FROM_NUMBER) smsMissing.push('TWILIO_FROM_NUMBER');
  }
  if (sms.provider === 'africas_talking' || sms.provider === 'at') {
    if (!process.env.AT_API_KEY) smsMissing.push('AT_API_KEY');
    if (!process.env.AT_USERNAME) smsMissing.push('AT_USERNAME');
  }

  return {
    email: {
      ...email,
      productionReady: email.provider === 'smtp' && email.smtpConfigured && emailMissing.length === 0,
      missingEnv: emailMissing,
      devNote: email.provider === 'mock' ? 'Logs to data/email-log.json' : null,
    },
    sms: {
      ...sms,
      productionReady:
        (sms.provider === 'twilio' || sms.provider === 'africas_talking' || sms.provider === 'at') &&
        smsMissing.length === 0,
      missingEnv: smsMissing,
      devNote: sms.provider === 'mock' ? 'Logs to data/sms-log.json' : null,
    },
    opsNotifyEmail: process.env.OPS_NOTIFY_EMAIL || 'operations@silverleaf.ac.tz',
  };
}
