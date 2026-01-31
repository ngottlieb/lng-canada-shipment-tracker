# Historical Data Import Guide

This guide explains how to populate your LNG Canada Shipment Tracker with historical data going back to June 2025.

## 📊 Import Methods

### Method 1: Automatic Import (Recommended)

Uses marine tracking APIs or generates realistic sample data automatically.

```bash
node server/scripts/importHistorical.js
```

**What it does:**
- Attempts to fetch real historical port calls from MarineTraffic API (if configured)
- Falls back to generating realistic sample data spanning June 2025 to present
- Creates 50-60 shipments with appropriate timing (every 3-7 days)
- Includes vessel details, capacities, destinations, and arrival times
- Automatically calculates voyage durations
- Marks past shipments as "arrived" with actual arrival times

**Sample output:**
```
🚢 LNG Canada Historical Data Import
=====================================

📅 Date range: 6/1/2025 to 1/30/2026
📊 Generating sample historical shipment data...
📦 Generated 54 sample shipments

📥 Importing 54 shipments...
  Imported: 54, Skipped: 0

✅ Import complete!
   Imported: 54
   Skipped (duplicates): 0
   Errors: 0
```

### Method 2: CSV Import

Import from a custom CSV file with your own data.

```bash
node server/scripts/importCSV.js data/sample_historical.csv
```

**CSV Format:**
```csv
vessel_name,imo_number,departure_date,capacity_cbm,destination_port,destination_country,estimated_arrival,actual_arrival,status
LNG Endeavour,9745678,2025-06-15T10:30:00Z,174000,Tokyo,Japan,2025-06-27T14:00:00Z,2025-06-27T16:30:00Z,arrived
Pacific Breeze,9823451,2025-06-20T08:15:00Z,210000,Shanghai,China,2025-07-04T09:00:00Z,2025-07-04T11:20:00Z,arrived
```

**Required columns:**
- `vessel_name` - Name of the vessel
- `imo_number` - International Maritime Organization number (must be unique)
- `departure_date` - ISO 8601 format (e.g., 2025-06-15T10:30:00Z)
- `capacity_cbm` - Cargo capacity in cubic meters
- `destination_port` - Destination port name
- `destination_country` - Destination country
- `estimated_arrival` - Estimated arrival time (ISO 8601)
- `actual_arrival` - Actual arrival time (ISO 8601) or empty if in transit
- `status` - Either "arrived" or "in_transit"

A sample CSV file is included at `data/sample_historical.csv` with 33 historical shipments.

### Method 3: MarineTraffic API (Production)

For real historical data, configure your MarineTraffic API key in `.env`:

```bash
MARINETRAFFIC_API_KEY=your_actual_api_key
```

Then run:
```bash
node server/scripts/importHistorical.js
```

**Requirements:**
- MarineTraffic API subscription with PS07 (Port Calls) access
- API key with historical data permissions

The script will automatically fetch real port calls from Kitimat for the specified date range.

## 🎯 Sample Data Details

The included sample data (`data/sample_historical.csv`) contains:

- **33 shipments** from June 2025 to January 2026
- **8 different vessels** rotating through the terminal
- **Realistic schedules**: Departures every 3-7 days
- **8 major Asian destinations**: Tokyo, Shanghai, Busan, Osaka, etc.
- **Varied capacities**: 174,000 - 266,000 m³ (Q-Flex and Q-Max class LNG carriers)
- **Accurate voyage times**: 12-16 days transit to Asia
- **2 current in-transit shipments** (departed late January)

### Vessels in Sample Data:
1. **LNG Endeavour** (174,000 m³) - Q-Flex class
2. **Pacific Breeze** (210,000 m³) - Large Q-Flex
3. **Energy Pioneer** (174,000 m³) - Q-Flex class
4. **Arctic Spirit** (266,000 m³) - Q-Max class
5. **Northern Star** (210,000 m³) - Large Q-Flex
6. **Global Explorer** (174,000 m³) - Q-Flex class
7. **Ocean Navigator** (210,000 m³) - Large Q-Flex
8. **LNG Horizon** (174,000 m³) - Q-Flex class

### Destinations:
- 🇯🇵 **Japan**: Tokyo, Yokohama, Osaka (12-13 days)
- 🇨🇳 **China**: Shanghai, Ningbo (14-15 days)
- 🇰🇷 **South Korea**: Busan, Incheon (13-14 days)
- 🇹🇼 **Taiwan**: Kaohsiung (16 days)

## 📈 After Import

Once imported, you can:

1. **View in Dashboard**: Open http://localhost:3000
2. **Filter by status**: See all arrived vs in-transit shipments
3. **Search**: Find specific vessels or destinations
4. **Sort**: By departure date, capacity, destination, etc.
5. **Analyze**: View total capacity shipped, average voyage times, etc.

## 🔄 Re-importing Data

### Clear existing data and re-import:
```bash
# Delete the database
rm shipments.db

# Reinitialize
node server/database/init.js

# Import historical data
node server/scripts/importHistorical.js
```

### Import additional data:
If you already have data and want to add more, the import script will skip duplicates (based on IMO number).

## 🛠️ Customization

### Adjust date range:
Edit `server/scripts/importHistorical.js`:
```javascript
const startDate = '2025-06-01T00:00:00Z';  // Change start date
const endDate = new Date().toISOString();   // Change end date
```

### Modify frequency:
```javascript
// Change shipment frequency (currently 3-7 days)
currentDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 5) + 3);
```

### Add more vessels:
```javascript
const vessels = [
  { name: 'Your Vessel', imo: '9999999', capacity: 174000 },
  // Add more...
];
```

### Add more destinations:
```javascript
const destinations = [
  { port: 'Mumbai', country: 'India', days: 20 },
  // Add more...
];
```

## 📊 Statistics After Import

With the sample data, you'll see approximately:

- **Total Shipments**: 33
- **In Transit**: 2
- **Arrived**: 31
- **Total Capacity**: ~6.6 million m³
- **Average per month**: ~4-5 shipments
- **Peak capacity**: 266,000 m³ (Q-Max carriers)

## ⚠️ Important Notes

1. **IMO numbers must be unique** - Each vessel/voyage needs a unique identifier
2. **Dates must be in ISO 8601 format** - Use format: `2025-06-15T10:30:00Z`
3. **Capacity is in cubic meters** - Typical LNG carriers: 125,000 - 266,000 m³
4. **Status must be** `arrived` or `in_transit`
5. **Leave actual_arrival empty** for in-transit shipments

## 🆘 Troubleshooting

### "Duplicate IMO number" error
Each shipment needs a unique IMO. In reality, vessels make multiple voyages, so you'd add a suffix:
- First voyage: `9745678`
- Second voyage: `9745678-2`
- Third voyage: `9745678-3`

Or better yet, generate unique transaction IDs.

### "Invalid date format" error
Ensure dates are in ISO 8601 format:
✅ `2025-06-15T10:30:00Z`
❌ `06/15/2025 10:30 AM`

### "Cannot find module" error
Make sure you're running from the project root:
```bash
cd "/Users/ngottlieb/Documents/Projects/LNG Canada Shipment Tracker"
node server/scripts/importHistorical.js
```

## 🚀 Quick Start

**Easiest way to get 8 months of historical data:**

```bash
# Import sample data (33 realistic shipments)
node server/scripts/importCSV.js data/sample_historical.csv

# Or generate automatic sample data (50+ shipments)
node server/scripts/importHistorical.js

# View in dashboard
# Already running at http://localhost:3000
```

That's it! Your dashboard will now show a complete history of LNG shipments from June 2025 to present.
