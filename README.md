# LNG Canada Shipment Tracker

A simple dashboard that tracks LNG vessel departures from the LNG Canada facility in Kitimat, BC using data stored in AWS S3.

## Architecture

This application uses a **serverless, S3-based architecture**:

- **Data Storage**: CSV file in AWS S3 bucket (fossil-fuel-shipments-tracker/lng-shipments.csv)
- **Scraper**: Node.js script that scrapes VesselFinder.com and updates S3
- **Frontend**: Static React app that reads directly from S3

No backend server or database required!

## Setup

### 1. Prerequisites

- Node.js 18+ installed
- AWS account with S3 access
- AWS credentials configured

### 2. Configure AWS

Create an S3 bucket named fossil-fuel-shipments-tracker in your AWS account and set up CORS configuration to allow the frontend to read the CSV.

Set the bucket to allow public read access for the lng-shipments.csv file or configure AWS credentials in the frontend.

### 3. Environment Variables

Copy .env.example to .env and fill in your AWS credentials

### 4. Install Dependencies

```bash
npm run install-all
```

This installs dependencies for both the scraper and the React frontend.

## Usage

### Running the Scraper

To scrape VesselFinder for departed vessels and update S3:

```bash
npm run scrape
```

This will:
1. Scrape the VesselFinder port page for Kitimat (CAKTM001)
2. Extract departure information for LNG tankers
3. Fetch vessel details (IMO, MMSI, destination, ETA)
4. Update the CSV file in S3 (avoiding duplicates)

### Running the Dashboard

To start the React dashboard locally:

```bash
npm start
```

The dashboard will open at http://localhost:3000 and display:
- Total shipments tracked
- Total LNG capacity shipped
- Searchable table of all departures with vessel details

The dashboard automatically refreshes data from S3 every 5 minutes.

### Building for Production

To create a production build of the React app:

```bash
npm run build
```

The build files will be in client/build/ and can be deployed to any static hosting service.

## Data Format

The S3 CSV file has these columns: vessel_name, imo_number, mmsi, capacity_cbm, CER_reported_payload, departure_date, destination_port, destination_country, estimated_arrival, notes

## License

MIT
