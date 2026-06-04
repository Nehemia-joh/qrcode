import PDFDocument from 'pdfkit';
import { getTransportSummaryForSchool } from './transportParser.js';
import { getOperationsSummary } from './operationsAggregator.js';
import { getSchool } from '../data/schools.js';

const NAVY = '#002368';
const AMBER = '#f59e0b';

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function writeHeader(doc, title, schoolName, period) {
  doc.fillColor(NAVY).fontSize(18).text('Silverleaf Operations Manager', { align: 'left' });
  doc.fillColor('#333').fontSize(14).text(title, { underline: false });
  doc.fontSize(10).fillColor('#666').text(`${schoolName} · ${period}`);
  doc.moveDown(0.5);
  doc.strokeColor(AMBER).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();
}

function writeKpiTable(doc, kpis) {
  if (!kpis?.length) {
    doc.fontSize(10).fillColor('#666').text('No KPI data available.');
    return;
  }
  doc.fontSize(11).fillColor(NAVY).text('Key performance indicators');
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#333');
  for (const k of kpis.slice(0, 20)) {
    const target = k.target != null ? `${k.target}${k.unit === '%' ? '%' : ''}` : '—';
    const actual = k.actual != null ? `${k.actual}${k.unit === '%' ? '%' : ''}` : '—';
    doc.text(`${k.label}: ${actual} (target ${target})`);
  }
}

export async function buildTransportSummaryPdf(schoolId) {
  const data = getTransportSummaryForSchool(schoolId);
  const school = getSchool(schoolId);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const period = [data.reportMonth, data.reportYear].filter(Boolean).join(' ') || new Date().toLocaleDateString();

  writeHeader(doc, 'Transport summary report', school?.name || schoolId, period);
  writeKpiTable(doc, data.kpis);

  if (data.occupancy?.rows?.length) {
    doc.moveDown();
    doc.fontSize(11).fillColor(NAVY).text('Occupancy by campus');
    doc.fontSize(9).fillColor('#333');
    for (const r of data.occupancy.rows.slice(0, 12)) {
      doc.text(`${r.label}: ${r.overall ?? r.usariver ?? '—'}`);
    }
  }

  doc.moveDown();
  doc.fontSize(8).fillColor('#999').text(
    `Generated ${new Date().toISOString()} · Source: master transport sheet`,
    { align: 'center' }
  );

  return streamToBuffer(doc);
}

export async function buildOperationsOverviewPdf(schoolId) {
  const summary = getOperationsSummary(schoolId);
  const school = getSchool(schoolId);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  writeHeader(doc, 'Operations overview report', school?.name || schoolId, new Date().toLocaleDateString());

  for (const mod of summary.modules || []) {
    doc.fontSize(11).fillColor(NAVY).text(mod.name || mod.id);
    writeKpiTable(doc, mod.kpis);
    doc.moveDown(0.5);
  }

  doc.fontSize(8).fillColor('#999').text(`Generated ${new Date().toISOString()}`, { align: 'center' });
  return streamToBuffer(doc);
}
