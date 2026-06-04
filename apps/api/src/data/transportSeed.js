/** Sample Transport Summary — matches master sheet (Jan–May 2024, report month June). */
export const transportSummarySeed = {
  reportMonth: 'June',
  reportYear: 2024,
  kpis: [
    { key: 'occupancy', label: 'Occupancy', target: 95, actual: 89.21, unit: '%' },
    { key: 'incidents', label: 'Incidents', target: 0, actual: 13, unit: 'count' },
    { key: 'bus_arrival', label: 'Bus Arrival Time', target: 90, actual: 66.39, unit: '%' },
    { key: 'transport_pl', label: 'Transport P&L', target: 90, actual: -58.33, unit: '%' },
  ],
  occupancy: {
    rows: [
      { label: 'Total Students Using Transport', total: 612, usariver: 421, am: 114, kijenge: 35, ilboru: 19, boma: 23 },
      { label: 'Total Bus Capacity', total: 686, usariver: 480, am: 130, kijenge: 30, ilboru: 16, boma: 30 },
      { label: 'Total Spare Seats', total: 74, usariver: 59, am: 16, kijenge: -5, ilboru: -3, boma: 7 },
      { label: 'Overall Occupancy %', total: 89, usariver: 88, am: 88, kijenge: 117, ilboru: 119, boma: 77 },
    ],
    targetPct: 95,
    targetedStudentsAt95: 652,
    gapToTarget: 40,
    monthlyGrowth: [
      { month: 'Jan', total: 606, usariver: 421, am: 113, kijenge: 34, ilboru: 19, boma: 19 },
      { month: 'Feb', total: 606, usariver: 421, am: 113, kijenge: 34, ilboru: 19, boma: 19 },
      { month: 'Mar', total: 606, usariver: 421, am: 113, kijenge: 34, ilboru: 19, boma: 19 },
    ],
    narrative: '',
  },
  incidents: {
    monthly: [
      { month: 'Jan', total: 1, usariver: 1, arushaModern: 0 },
      { month: 'Feb', total: 6, usariver: 1, arushaModern: 5 },
      { month: 'Mar', total: 1, usariver: 1, arushaModern: 0 },
      { month: 'Apr', total: 2, usariver: 1, arushaModern: 1 },
      { month: 'May', total: 3, usariver: 0, arushaModern: 3 },
    ],
    ytdTotal: 13,
    narrative: '',
  },
  busArrival: {
    targetPct: 90,
    monthly: [
      { month: 'Jan', usariver: 100, am: 68.75, mbegu: 33.86, total: 67.54 },
      { month: 'Feb', usariver: 97.5, am: 76.19, mbegu: 34.21, total: 69.3 },
      { month: 'Mar', usariver: 90, am: 60.29, mbegu: 51.54, total: 67.28 },
      { month: 'Apr', usariver: 94.85, am: 50, mbegu: 44.16, total: 63 },
      { month: 'May', usariver: 95.56, am: 65, mbegu: 33.88, total: 64.81 },
    ],
    ytd: { usariver: 95.58, am: 64.05, mbegu: 39.53, total: 66.39 },
    narrative: '',
  },
  profitLoss: {
    currency: 'TZS',
    lines: [
      { key: 'fee_collection', label: 'Transport fee collection', total: 182975000, usariver: 129050000, am: 33375000, kijenge: 9575000, ilboru: 5450000, boma: 5525000 },
      { key: 'fuel', label: 'Fuel expenses', total: -42913514, usariver: -28762162, am: -14151351, kijenge: 0, ilboru: 0, boma: 0 },
      { key: 'rental', label: 'Rental Cost', total: -207782396, usariver: -114078463, am: -53626171, kijenge: -15640966, ilboru: -15640966, boma: -8795829 },
      { key: 'salaries', label: "Driver & Rider's Salaries", total: -20250000, usariver: -12750000, am: -7500000, kijenge: 0, ilboru: 0, boma: 0 },
      { key: 'repairs', label: 'Repairs & Maintenance', total: -18750000, usariver: -12500000, am: -6250000, kijenge: 0, ilboru: 0, boma: 0 },
    ],
    netProfitLoss: { total: -106720910, usariver: -39040625, am: -48152523, kijenge: -6065966, ilboru: -10190966, boma: -3270829 },
    narrative: '',
  },
};
