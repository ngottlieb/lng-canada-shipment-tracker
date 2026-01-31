import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import './App.css';

// Google Sheets CSV export URL
const GOOGLE_SHEETS_ID = '10lPjFIzm3DzIoph9jjdIJ80Y1dNQ--TH7nzF0e74Seo';
const GOOGLE_SHEETS_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/export?format=csv&gid=0`;

function App() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('departure_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch shipments from Google Sheets CSV export
  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(GOOGLE_SHEETS_CSV_URL);
      if (!response.ok) {
        if (response.status === 404) {
          // CSV doesn't exist yet
          setShipments([]);
          return;
        }
        throw new Error('Failed to fetch shipments from Google Sheets');
      }
      
      const csvText = await response.text();
      
      // Parse CSV
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setShipments(results.data);
        },
        error: (error) => {
          throw new Error(`CSV parsing error: ${error.message}`);
        }
      });
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchShipments();
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchShipments();
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchShipments();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort shipments
  const filteredShipments = shipments
    .filter(s => {
      const matchesSearch = 
        s.vessel_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.destination_port?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.imo_number?.includes(searchTerm);
      return matchesSearch;
    })
    .sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (sortField.includes('date')) {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Calculate statistics
  const stats = {
    total: shipments.length,
    totalCapacity: shipments.reduce((sum, s) => sum + (parseInt(s.capacity_cbm) || 0), 0)
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short'
    });
  };

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>🚢 LNG Canada Shipment Tracker</h1>
          <p>Real-time monitoring of LNG vessel departures from Kitimat, BC</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Shipments</h3>
            <p className="value">{stats.total}</p>
          </div>
          <div className="stat-card">
            <h3>Total Shipped Capacity</h3>
            <p className="value">{formatNumber(stats.totalCapacity)} m³</p>
          </div>
        </div>

        <div className="shipments-table">
          <h2>Shipment History</h2>
          
          {error && (
            <div className="error">
              Error: {error}
            </div>
          )}

          <div className="table-controls">
            <input
              type="text"
              className="search-input"
              placeholder="Search by vessel name, destination, or IMO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading shipments...</div>
          ) : filteredShipments.length === 0 ? (
            <div className="empty-state">
              <h3>No shipments found</h3>
              <p>
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'Waiting for vessel departures to be detected'}
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('vessel_name')}>
                    Vessel Name
                  </th>
                  <th className="sortable" onClick={() => handleSort('imo_number')}>
                    IMO Number
                  </th>
                  <th className="sortable" onClick={() => handleSort('departure_date')}>
                    Departure Date
                  </th>
                  <th className="sortable" onClick={() => handleSort('capacity_cbm')}>
                    Capacity (m³)
                  </th>
                  <th className="sortable" onClick={() => handleSort('CER_reported_payload')}>
                    CER Reported Payload
                  </th>
                  <th className="sortable" onClick={() => handleSort('destination_port')}>
                    Destination
                  </th>
                  <th className="sortable" onClick={() => handleSort('actual_arrival')}>
                    Arrival
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment, index) => (
                  <tr key={index}>
                    <td>
                      <strong>
                        <a 
                          href={`https://www.vesselfinder.com/vessels/details/${shipment.imo_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#1976d2', textDecoration: 'none' }}
                          onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                        >
                          {shipment.vessel_name}
                        </a>
                      </strong>
                    </td>
                    <td>{shipment.imo_number}</td>
                    <td>{formatDate(shipment.departure_date)}</td>
                    <td>{formatNumber(shipment.capacity_cbm)}</td>
                    <td>{formatNumber(shipment.cer_reported_payload)}</td>
                    <td>
                      {shipment.destination_country || 'Unknown'}
                      {shipment.destination_port && (
                        <span style={{ color: '#999', fontSize: '0.9em' }}>
                          {' '}({shipment.destination_port})
                        </span>
                      )}
                    </td>
                    <td>
                      {shipment.actual_arrival && shipment.actual_arrival !== 'Unknown'
                        ? formatDate(shipment.actual_arrival)
                        : shipment.estimated_arrival && shipment.estimated_arrival !== 'Unknown'
                        ? `${formatDate(shipment.estimated_arrival)} (estimated)`
                        : 'Unknown'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
