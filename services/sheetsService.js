const { google } = require('googleapis');
const dayjs = require('dayjs');

// Initialize Google Sheets API
let sheets = null;
let spreadsheetId = null;
let sheetName = null;

/**
 * Initialize the Google Sheets service with credentials from environment variables
 */
function initSheetsService() {
  if (sheets) return sheets;

  // Parse the service account credentials from environment variable
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  
  spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID environment variable is required');
  }

  // Create auth client
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

/**
 * Get the name of the first sheet in the spreadsheet
 */
async function getSheetName() {
  if (sheetName) return sheetName;
  
  const sheetsAPI = initSheetsService();
  const response = await sheetsAPI.spreadsheets.get({
    spreadsheetId,
  });
  
  if (response.data.sheets && response.data.sheets.length > 0) {
    sheetName = response.data.sheets[0].properties.title;
  } else {
    sheetName = 'Sheet1';
  }
  
  return sheetName;
}

/**
 * Read all shipments from the Google Sheet
 * @returns {Promise<Array>} Array of shipment objects
 */
async function readShipmentsFromSheet() {
  try {
    const sheetsAPI = initSheetsService();
    const sheet = await getSheetName();
    
    const response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet}!A:L`, // Adjust range as needed
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return [];
    }

    // Skip header row and map to objects
    const headers = rows[0];
    const shipments = rows.slice(1).map(row => {
      const shipment = {};
      headers.forEach((header, index) => {
        shipment[header.toLowerCase().replace(/ /g, '_')] = row[index] || '';
      });
      return shipment;
    });

    return shipments;
  } catch (error) {
    console.error('Error reading from Google Sheet:', error.message);
    throw error;
  }
}

/**
 * Add new shipments to the Google Sheet
 * @param {Array} newShipments - Array of shipment objects to add
 * @returns {Promise<Object>} Object with added count and total count
 */
async function addShipmentsToSheet(newShipments) {
  try {
    const sheetsAPI = initSheetsService();
    const sheet = await getSheetName();
    
    // Read the header row to understand the column structure
    const headerResponse = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet}!1:1`,
    });
    
    const headers = headerResponse.data.values ? headerResponse.data.values[0] : [];
    
    if (headers.length === 0) {
      throw new Error('No headers found in the sheet. Please ensure the first row has column headers.');
    }
    
    console.log('Sheet headers:', headers);
    
    // Read existing shipments
    const existingShipments = await readShipmentsFromSheet();
    
    console.log(`Found ${existingShipments.length} existing shipments in sheet`);
    
    // Check for duplicates based on IMO number AND departure date (same day, ignoring time)
    const existingKeys = new Set(existingShipments.map(s => {
      // Handle both imo and imo_number fields
      const imo = s.imo || s.imo_number || '';
      
      // Use dayjs to parse and format date consistently
      const departureDate = s.departure_date ? dayjs(s.departure_date).format('YYYY-MM-DD') : '';
      
      const key = `${imo}:${departureDate}`;
      return key;
    }));
    
    const shipmentsToAdd = newShipments.filter(shipment => {
      const imo = shipment.imo || '';
      
      // Use dayjs to parse and format date consistently
      const departureDate = shipment.departure_date ? dayjs(shipment.departure_date).format('YYYY-MM-DD') : '';
      
      const key = `${imo}:${departureDate}`;
      console.log(`  New shipment key: ${key} (${shipment.name})`);
      
      const isDuplicate = existingKeys.has(key);
      
      if (isDuplicate) {
        console.log(`    ✓ DUPLICATE FOUND - Skipping`);
      } else {
        console.log(`    ✗ Not a duplicate - Will add`);
      }
      
      return !isDuplicate;
    });

    if (shipmentsToAdd.length === 0) {
      console.log('No new shipments to add (all are duplicates)');
      return {
        added: 0,
        total: existingShipments.length
      };
    }

    // Map shipments to rows based on header order
    const rows = shipmentsToAdd.map(shipment => {
      return headers.map(header => {
        const normalizedHeader = header.toLowerCase().trim();
        
        // Map to exact sheet columns
        const fieldMap = {
          'vessel_name': shipment.name || '',
          'mmsi': shipment.mmsi || '',
          'imo_number': shipment.imo || '',
          'departure_date': shipment.departure_date || '',
          'capacity_cbm': shipment.capacity || '',
          'cer_reported_payload': '',
          'destination_port': shipment.destination || '',
          'destination_country': shipment.destination_country || '',
          'estimated_arrival': shipment.estimated_arrival || '',
          'actual_arrival': '',
          'notes': shipment.notes || '',
          'flagged': ''
        };
        
        return fieldMap[normalizedHeader] !== undefined ? fieldMap[normalizedHeader] : '';
      });
    });

    // Append rows to the sheet
    const lastColumn = String.fromCharCode(64 + headers.length);
    const response = await sheetsAPI.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheet}!A:${lastColumn}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    console.log(`Added ${shipmentsToAdd.length} shipments to Google Sheet`);

    return {
      added: shipmentsToAdd.length,
      total: existingShipments.length + shipmentsToAdd.length
    };
  } catch (error) {
    console.error('Error adding shipments to Google Sheet:', error.message);
    throw error;
  }
}

/**
 * Initialize the sheet with headers if it's empty
 */
async function initializeSheet() {
  try {
    const sheetsAPI = initSheetsService();
    const sheet = await getSheetName();
    
    const response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet}!A1:H1`,
    });

    // If no headers exist, create them
    if (!response.data.values || response.data.values.length === 0) {
      await sheetsAPI.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheet}!A1:H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'Name',
            'IMO',
            'MMSI',
            'Capacity',
            'Destination',
            'Destination Country',
            'Estimated Arrival',
            'Departure Date'
          ]],
        },
      });
      console.log(`Initialized sheet '${sheet}' with headers`);
    }
  } catch (error) {
    console.error('Error initializing sheet:', error.message);
    throw error;
  }
}

/**
 * Update actual arrival for a specific shipment
 * @param {string} imo - IMO number of the vessel
 * @param {string} departureDate - Departure date in YYYY-MM-DD format
 * @param {string} actualArrival - Actual arrival date/time
 * @param {boolean} shouldFlag - Whether to flag this shipment
 * @returns {Promise<boolean>} True if updated successfully
 */
async function updateShipmentArrival(imo, departureDate, actualArrival, shouldFlag = false) {
  try {
    const sheetsAPI = initSheetsService();
    const sheet = await getSheetName();
    
    // Read all data to find the row
    const response = await sheetsAPI.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet}!A:L`,
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) return false;
    
    const headers = rows[0];
    const imoIndex = headers.findIndex(h => h.toLowerCase().includes('imo'));
    const departureDateIndex = headers.findIndex(h => h.toLowerCase().includes('departure'));
    const actualArrivalIndex = headers.findIndex(h => h.toLowerCase().includes('actual_arrival'));
    const flaggedIndex = headers.findIndex(h => h.toLowerCase().includes('flagged'));
    
    // Find the matching row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowImo = row[imoIndex];
      const rowDepartureDate = row[departureDateIndex] ? dayjs(row[departureDateIndex]).format('YYYY-MM-DD') : '';
      
      if (rowImo === imo && rowDepartureDate === departureDate) {
        // Update the actual_arrival cell and optionally the flagged cell
        const rowNumber = i + 1;
        const actualArrivalColumn = String.fromCharCode(65 + actualArrivalIndex);
        
        // Update actual arrival
        await sheetsAPI.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheet}!${actualArrivalColumn}${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[actualArrival]]
          }
        });
        
        // Update flagged if needed
        if (shouldFlag && flaggedIndex >= 0) {
          const flaggedColumn = String.fromCharCode(65 + flaggedIndex);
          await sheetsAPI.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheet}!${flaggedColumn}${rowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[true]]
            }
          });
        }
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error updating shipment arrival:', error.message);
    return false;
  }
}

module.exports = {
  readShipmentsFromSheet,
  addShipmentsToSheet,
  initializeSheet,
  updateShipmentArrival
};
