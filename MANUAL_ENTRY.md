# Manual Shipment Entry Form

Use this template to manually log shipments from news articles, press releases, or public sources.

## Entry Template

```
Date: _______________
Source: _______________
URL: _______________

Vessel Name: _______________
IMO Number: _______________ (optional, look up on vesselfinder.com)
Departure Date: _______________ (YYYY-MM-DD)
Capacity: _______________ m³ (typical: 174,000 for Q-Flex, 266,000 for Q-Max)
Destination: _______________
Country: _______________
Status: [ ] Departed  [ ] Arrived
```

## Quick Add to CSV

Once you gather info, add a line to your CSV:

```csv
Vessel Name,IMO,Departure Date,Capacity,Destination,Country,Est Arrival,Actual Arrival,Status
```

## Where to Find Information

### 1. LNG Canada Website
- https://www.lngcanada.ca/news/
- Look for: "First cargo", "Export", "Shipment"

### 2. Local BC News
- Daily Hive Vancouver
- Vancouver Sun
- CBC British Columbia
- Look for: Kitimat LNG news

### 3. Industry Publications (Free Articles)
- Riviera Maritime News
- LNG Industry magazine
- Natural Gas World

### 4. Vessel Tracking (Free)
- VesselFinder.com - Search vessel name, see history
- MarineTraffic.com - Free tier shows basic info
- MyShipTracking.com - Free basic tracking

### 5. Social Media
- LinkedIn: LNG Canada company page
- Twitter: @LNGCanada
- Port of Kitimat updates

## Example Entries

### Example 1: From Press Release
```
Date: June 15, 2025
Source: LNG Canada Press Release
URL: https://www.lngcanada.ca/news/first-cargo-departure

Vessel Name: Pacific Breeze
IMO Number: 9823451
Departure Date: 2025-06-15
Capacity: 210,000 m³
Destination: Tokyo
Country: Japan
Status: [X] Departed
```

### Example 2: From News Article
```
Date: July 3, 2025
Source: Vancouver Sun
URL: https://vancouversun.com/...

Vessel Name: Energy Pioneer
IMO Number: Unknown (use vesselfinder.com)
Departure Date: ~2025-07-01
Capacity: ~174,000 m³ (estimated)
Destination: Shanghai
Country: China
Status: [X] Arrived (article mentions arrival)
```

## Tips

1. **Finding IMO numbers**: Search vessel name on vesselfinder.com
2. **Estimating capacity**: 
   - Q-Flex: 210,000-217,000 m³
   - Standard: 125,000-175,000 m³
   - Q-Max: 266,000 m³
3. **Voyage time**: Japan ~12 days, China ~14-15 days, Korea ~13 days
4. **When info is missing**: Leave blank or use "Unknown"

## Batch Import

Once you have 5-10 entries, create a CSV file:

```bash
# Save your entries to data/my_shipments.csv
# Then import:
node server/scripts/importCSV.js data/my_shipments.csv
```

## Quick Web Research Commands

Search these in your browser:

```
"LNG Canada" "cargo" site:lngcanada.ca
"Kitimat LNG" "vessel" OR "tanker" after:2025-06-01
"LNG Canada" "first shipment" OR "export"
```

## Tracking Sheet Option

Or use Google Sheets with this format:
- Column A: Vessel Name
- Column B: IMO
- Column C: Departure Date
- Column D: Capacity
- Column E: Destination
- Column F: Country
- Column G: Status

Export as CSV when ready to import.
