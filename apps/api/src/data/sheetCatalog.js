/**
 * Maps Google Sheet / Excel tabs → Operations Manager modules & API.
 * Source workbook: "2026 Transport Master sheet" (13 tabs).
 */
export const TRANSPORT_MASTER_SHEETS = [
  {
    sheetTab: 'Dashboard.',
    slug: 'Dashboard',
    module: 'transport',
    uiRoute: '/transport',
    api: 'GET /api/transport/summary',
    description: 'KPIs: Occupancy, Incidents, Bus arrival, P&L',
    priority: 1,
  },
  {
    sheetTab: 'Transport PL',
    slug: 'Transport_PL',
    module: 'transport',
    uiRoute: '/transport',
    api: 'GET /api/transport/budget',
    description: 'Profit/loss lines and monthly budget vs actual',
    priority: 1,
  },
  {
    sheetTab: 'Bus Incidence',
    slug: 'Bus_Incidence',
    module: 'transport',
    uiRoute: '/transport/incidents',
    api: 'GET /api/transport/incidents',
    description: 'Incident log by campus and bus',
    priority: 1,
  },
  {
    sheetTab: 'Bus Arrival Time',
    slug: 'Bus_Arrival_Time',
    module: 'transport',
    uiRoute: '/transport',
    api: 'GET /api/transport/summary (arrival section)',
    description: 'On-time % by campus (rolled into summary)',
    priority: 1,
  },
  {
    sheetTab: 'Live Locations',
    slug: 'Live_Locations',
    module: 'transport',
    uiRoute: '/transport/gps',
    api: 'GET /api/transport/gps',
    description: 'GPS route compliance Yes/No by day',
    priority: 1,
  },
  {
    sheetTab: 'Repair & Maintenance',
    slug: 'Repair_Maintenance',
    module: 'transport',
    uiRoute: '/transport/fleet',
    api: 'GET /api/transport/fleet',
    description: 'R&M costs per bus',
    priority: 1,
  },
  {
    sheetTab: 'Buses Services',
    slug: 'Buses_Services',
    module: 'transport',
    uiRoute: '/transport/fleet',
    api: 'GET /api/transport/fleet',
    description: 'Service and maintenance line items',
    priority: 1,
  },
  {
    sheetTab: 'Actual vs Budget',
    slug: 'Actual_vs_Budget',
    module: 'transport',
    uiRoute: '/transport/budget',
    api: 'GET /api/transport/budget',
    description: 'Monthly repair budget vs actual',
    priority: 1,
  },
  {
    sheetTab: 'Transport Users.',
    slug: 'Transport_Users',
    module: 'transport',
    uiRoute: '/transport/buses',
    api: 'GET /api/transport/buses',
    description: 'Bus roster, routes, occupancy per vehicle',
    priority: 1,
  },
  {
    sheetTab: 'AttendanceA',
    slug: 'AttendanceA',
    module: 'transport',
    uiRoute: '/transport',
    api: 'GET /api/attendance/live + webhook',
    description: 'AM attendance scan log → live feed',
    priority: 1,
  },
  {
    sheetTab: 'AttendanceB',
    slug: 'AttendanceB',
    module: 'transport',
    uiRoute: '/transport',
    api: 'GET /api/attendance/live + webhook',
    description: 'PM attendance scan log → live feed',
    priority: 1,
  },
  {
    sheetTab: 'QR Code',
    slug: 'QR_Code',
    module: 'transport',
    uiRoute: '/transport/qr',
    api: 'GET /api/transport/qr',
    description: 'Student QR registry by route (Nehemiah link later)',
    priority: 2,
  },
  {
    sheetTab: 'Sheet6',
    slug: 'Sheet6',
    module: 'transport',
    uiRoute: null,
    api: null,
    description: 'Empty / reserved tab in workbook',
    priority: 3,
  },
];

export const NOTIFICATION_CHANNELS = {
  staffReports: {
    channel: 'email',
    trigger: 'Staff submits /reports',
    recipient: 'OPS_NOTIFY_EMAIL',
    replaces: 'Phone calls and emails to ops (row 1.12)',
  },
  parentFeeAlert: {
    channels: ['sms', 'email'],
    trigger: 'QR scan / fee in credit',
    recipient: 'parent_phone / parent_email (DB later)',
    replaces: 'Manual parent calls (row 1.4)',
  },
  adminDigest: {
    channel: 'email',
    trigger: 'Daily credit digest',
    recipient: 'OPS_NOTIFY_EMAIL',
    note: 'Matches legacy PHP cron mail()',
  },
};

export const GOOGLE_SHEET_REFERENCE = {
  spreadsheetId: '1BDkvHWhJnJXS9vx1c2reyXkab494ZF7bji8z76Ck-mw',
  editUrl:
    'https://docs.google.com/spreadsheets/d/1BDkvHWhJnJXS9vx1c2reyXkab494ZF7bji8z76Ck-mw/edit',
  importInstructions:
    'Download as .xlsx from Google Sheets → Admin → Import → Transport. Re-import each month after updates.',
};
