# LNG Canada Shipment Tracker

A dashboard tracking LNG vessel departures from the LNG Canada facility in Kitimat, BC.

## Architecture

Serverless, S3-based:
- **Data**: CSV in AWS S3 (`fossil-fuel-shipments-tracker/lng-shipments.csv`)
- **Scraper**: Node.js script scraping VesselFinder.com → updates S3
- **Frontend**: Static React app reading directly from S3

No backend server or database.

## Project Structure

```
shipment-tracker/
├── client/src/App.js       # Main React dashboard component
├── services/
│   ├── vesselFinderService.js  # Web scraper for VesselFinder.com
│   └── sheetsService.js        # Google Sheets API integration (legacy)
├── scripts/scrapeAndImport.js  # Orchestrates scraping and S3 upload
├── data/                       # Historical CSV data files
└── .env                        # AWS credentials (not committed)
```

## Common Commands

```bash
npm run install-all   # Install root + client dependencies
npm run scrape        # Scrape VesselFinder and update S3
npm start             # Start React dev server at localhost:3000
npm run build         # Production build → client/build/
```

## Data Format

S3 CSV columns: `vessel_name, imo_number, mmsi, capacity_cbm, CER_reported_payload, departure_date, destination_port, destination_country, estimated_arrival, notes`

## Environment Variables

Copy `.env.example` to `.env` and configure AWS credentials.

Required: AWS credentials with read/write access to the `fossil-fuel-shipments-tracker` S3 bucket.

## Deployment

Frontend deploys to GitHub Pages (`npm run deploy` via gh-pages).
Scraper runs manually or on a schedule via `npm run scrape`.
