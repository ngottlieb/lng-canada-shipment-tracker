# Quick Start Guide

## Prerequisites
- Node.js 16+ and npm installed
- Marine tracking API key (optional for testing - mock data will be used)

## Installation

1. **Install root dependencies**
   ```bash
   npm install
   ```

2. **Install client dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

3. **Configure environment (optional for testing)**
   ```bash
   # .env file is already created with default mock settings
   # To use real marine data, edit .env and add your API keys
   ```

4. **Initialize the database**
   ```bash
   node server/database/init.js
   ```

## Running the Application

### Option 1: Development Mode (Both servers)
```bash
npm run dev
```
This starts both backend (port 3001) and frontend (port 3000) servers.

### Option 2: Separate Servers

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
cd client
npm start
```

## Access the Dashboard

Open your browser to: **http://localhost:3000**

## Getting Marine Tracking API Keys

### MarineTraffic API (Recommended for production)

1. Visit: https://www.marinetraffic.com/en/ais-api-services
2. Create an account
3. Subscribe to PS07 (Port Calls) or PS01 (Vessel Positions) package
4. Copy your API key to `.env` file

### AISHub API (Free alternative)

1. Visit: http://www.aishub.net/
2. Register for an account
3. Request API access
4. Copy your username to `.env` file

## Testing Without API Keys

The application includes mock data that simulates an LNG vessel near the terminal. This allows you to test all features without API credentials:

1. Run the app with default `.env` settings
2. Click "🔄 Refresh" button in the dashboard
3. A mock vessel "LNG Endeavour" will appear in the tracking system

## Features

- ✅ Real-time vessel tracking near LNG Canada terminal
- ✅ Automatic detection of vessel departures
- ✅ Shipment logging with capacity and destination
- ✅ Estimated and actual arrival tracking
- ✅ Search and filter functionality
- ✅ Auto-refresh every 5 minutes
- ✅ Manual refresh on demand
- ✅ Responsive dashboard design

## Architecture

```
├── server/                 # Backend API
│   ├── index.js           # Express server
│   ├── database/          # SQLite database layer
│   └── services/          # Marine tracking services
├── client/                # React frontend
│   ├── src/
│   │   ├── App.js        # Main dashboard component
│   │   └── App.css       # Styles
└── shipments.db          # SQLite database (created on init)
```

## Troubleshooting

**Port already in use:**
```bash
# Change PORT in .env file
PORT=3002
```

**Database errors:**
```bash
# Reinitialize database
rm shipments.db
node server/database/init.js
```

**API errors:**
- Check API key is correct in `.env`
- Verify API subscription is active
- Check rate limits on your API plan
- Fall back to mock data for testing

## Production Build

```bash
cd client
npm run build
# Serve the build folder with Express or any static server
```

## Next Steps

1. Configure real API keys for production use
2. Set up automated monitoring
3. Add email/SMS notifications
4. Export data to CSV
5. Add analytics and visualizations
