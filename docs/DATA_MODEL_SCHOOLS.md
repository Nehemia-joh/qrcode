# Schools vs campuses vs master sheet

## How the transport master sheet is organized

The **2026 Transport Master** workbook is **one file** for the Silverleaf group. Inside the **Dashboard** tab, KPIs are split by **columns**, not separate files:

| Column | Campus |
|--------|--------|
| Total | All campuses combined |
| Usariver | Usariver |
| AM | Arusha Modern |
| Kijenge | Kijenge |
| Ilboru | Ilboru |
| Boma | Boma |

Bus arrival also uses **Mbegu** in some rows.

## How the app maps this

| School dropdown | What you see |
|-----------------|--------------|
| **Silverleaf — All Campuses** | Group totals + table comparing every campus in the sheet |
| **Silverleaf — Usariver** (etc.) | Only that campus column (transport, incidents, buses filtered) |
| **Silverleaf — Dodoma** (etc.) | Empty until you import a **dedicated** workbook for that region |

## Import

- **Group / campuses in master sheet:** Import once under **Silverleaf — All Campuses** (or `sl-main`). All mapped campuses update together.
- **New region not in the sheet:** Select that school → **Load data** → upload its own `.xlsx`.

## Future

Per-school workbooks in `data/schools/{schoolId}/sheets/` override the group sheet when you onboard Moshi, Dodoma, etc. with their own files.
