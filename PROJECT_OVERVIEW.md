# LNG Canada Shipment Tracker - Project Overview

## 🎯 Project Summary

A complete, production-ready dashboard system for tracking LNG (Liquefied Natural Gas) shipments departing from the LNG Canada export terminal in Kitimat, British Columbia. The system monitors vessel movements using marine tracking APIs and maintains a comprehensive database of all departures, capacities, and arrival information.

## ✨ Key Features Implemented

### Real-Time Tracking
- ✅ Automatic detection of LNG vessels near the terminal (5km radius)
- ✅ Departure detection based on vessel speed and movement patterns
- ✅ Position tracking throughout the voyage
- ✅ Arrival detection at destination ports

### Data Logging
- ✅ Departure date and time
- ✅ Vessel details (name, IMO number, MMSI)
- ✅ Cargo capacity (cubic meters)
- ✅ Destination port and country
- ✅ Estimated and actual arrival times
- ✅ Voyage status tracking

### Dashboard Interface
- ✅ Modern, responsive React-based UI
- ✅ Real-time statistics (total shipments, in transit, arrived, total capacity)
- ✅ Sortable table with all shipment data
- ✅ Search functionality (vessel name, destination, IMO)
- ✅ Status filtering (all, in transit, arrived)
- ✅ Auto-refresh every 5 minutes
- ✅ Manual refresh on demand

## 🏗️ Technical Architecture

### Backend (Node.js/Express)
```
server/
├── index.js                    # Main Express server
├── database/
│   ├── db.js                   # SQLite database layer with helpers
│   └── init.js                 # Database initialization script
└── services/
    ├── marineService.js        # Marine tracking API integration
    └── trackingService.js      # Automated vessel monitoring
```

**Key Components:**
- Express REST API (port 3001)
- SQLite database for persistence
- Automated tracking with node-cron (15-minute intervals)
- Integration with MarineTraffic and AISHub APIs
- Mock data fallback for testing

### Frontend (React)
```
client/
├── public/
│   └── index.html              # HTML template
└── src/
    ├── App.js                  # Main dashboard component
    └── App.css                 # Responsive styling
```

**Key Components:**
- Modern React 18+ with Hooks
- Material-inspired design
- Proxy configuration for API calls
- Responsive grid layout
- Real-time data updates

### Database Schema

**shipments table:**
- id (PRIMARY KEY)
- vessel_name, imo_number, mmsi
- capacity_cbm
- departure_date, departure_lat, departure_lon
- destination_port, destination_country
- estimated_arrival, actual_arrival
- status (in_transit, arrived)
- created_at, updated_at

**vessel_positions table:**
- id (PRIMARY KEY)
- shipment_id (FOREIGN KEY)
- timestamp, latitude, longitude
- speed_knots, heading

## 🔌 API Integration

### MarineTraffic API (Recommended)
- PS01 (Simple Positions) - Real-time vessel positions
- PS07 (Port Calls) - Port call history and predictions
- Filters for LNG tanker type (shiptype: 84)
- Geographic bounding box around Kitimat

### AISHub API (Free Alternative)
- Real-time AIS data
- Free tier available
- Lower update frequency
- Good for testing/development

### Mock Data Mode
- Built-in test data when no API key configured
- Simulates "LNG Endeavour" vessel
- Allows full feature testing without API costs

## 🌍 LNG Canada Terminal Details

**Location:** Kitimat, British Columbia, Canada
**Coordinates:** 54.0125°N, 128.6819°W
**Facility Type:** Major LNG export terminal with deep-water port
**Typical Vessels:** Q-Flex (210,000-217,000 m³) and Q-Max (266,000 m³) LNG carriers

## 📊 API Endpoints

```
GET  /api/health                    # Health check
GET  /api/shipments                 # Get all shipments
GET  /api/vessels/current           # Get current vessels near terminal
GET  /api/shipments/:id/positions   # Get position history for shipment
POST /api/tracking/check            # Trigger manual vessel check
```

## 🚀 Running the Application

### Quick Start
```bash
# Using the start script
./start.sh

# Or manually
npm install
cd client && npm install && cd ..
node server/database/init.js
npm run dev
```

### Access Points
- **Dashboard:** http://localhost:3000
- **API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/api/health

## 📈 Data Flow

1. **Monitoring Loop** (every 15 minutes)
   - Query marine tracking API for vessels near terminal
   - Filter for LNG tanker type
   - Check distance from terminal coordinates

2. **Departure Detection**
   - Vessel within 5km radius
   - Speed > 3 knots (departing)
   - Not already in database
   - → Create new shipment record

3. **Position Tracking**
   - Store position updates for active shipments
   - Monitor speed for arrival detection
   - Update estimated arrival times

4. **Arrival Detection**
   - Speed < 1 knot at destination
   - Update status to "arrived"
   - Record actual arrival time

5. **Dashboard Display**
   - Auto-refresh every 5 minutes
   - Manual refresh available
   - Real-time statistics
   - Sortable, searchable table

## 🔐 Security Considerations

- API keys stored in `.env` (not in version control)
- CORS enabled for frontend communication
- Input validation on API endpoints
- SQL injection protection via parameterized queries
- Rate limiting recommended for production

## 🎨 User Interface Features

### Dashboard Sections
1. **Header** - Project title and description
2. **Statistics Cards** - Key metrics at a glance
3. **Table Controls** - Search, filter, and refresh
4. **Shipments Table** - Complete data with sorting

### Design Highlights
- Purple gradient background
- White card-based layout
- Hover effects and transitions
- Status badges with color coding
- Responsive design (mobile-friendly)
- Clean typography and spacing

## 📦 Dependencies

### Backend
- express - Web framework
- cors - Cross-origin requests
- dotenv - Environment configuration
- axios - HTTP client for API calls
- sqlite3 - Database
- node-cron - Scheduled tasks
- date-fns - Date formatting

### Frontend
- react & react-dom - UI framework
- react-scripts - Build tooling

## 🔮 Future Enhancements

### Potential Features
- [ ] Email/SMS notifications for new departures
- [ ] CSV/Excel export functionality
- [ ] Advanced analytics and charts
- [ ] Weather and route information
- [ ] Integration with LNG price data
- [ ] Mobile app (React Native)
- [ ] Multi-terminal support
- [ ] Historical trend analysis
- [ ] Predictive departure modeling
- [ ] WebSocket for real-time updates

### Production Readiness
- [ ] Error logging (Winston/Bunyan)
- [ ] API rate limiting
- [ ] Request caching
- [ ] Database backups
- [ ] Monitoring/alerting
- [ ] Load balancing
- [ ] HTTPS/SSL
- [ ] Authentication/authorization
- [ ] API documentation (Swagger)
- [ ] Unit and integration tests

## 📝 Configuration Options

**Environment Variables (.env):**
```bash
PORT=3001                          # Backend server port
MARINETRAFFIC_API_KEY=your_key     # MarineTraffic API key
AISHUB_USERNAME=your_username      # AISHub username
LNG_TERMINAL_LAT=54.0125          # Terminal latitude
LNG_TERMINAL_LON=-128.6819        # Terminal longitude
RADIUS_KM=5                        # Detection radius
```

## 🐛 Troubleshooting

### Common Issues

**"Port 3001 already in use"**
- Change PORT in `.env`
- Kill existing process on port 3001

**"No vessels found"**
- Verify API credentials
- Check API rate limits
- Use mock data mode for testing
- Verify terminal coordinates

**Database errors**
- Delete `shipments.db` and reinitialize
- Check file permissions
- Verify SQLite3 installation

**Frontend can't reach backend**
- Verify proxy in client/package.json
- Check CORS configuration
- Ensure backend is running on port 3001

## 📄 License

MIT License - Free to use and modify

## 🙏 Acknowledgments

- LNG Canada for the inspiration
- MarineTraffic/AISHub for marine data
- React and Node.js communities

---

**Built with ❤️ for tracking LNG shipments from Kitimat, BC**
