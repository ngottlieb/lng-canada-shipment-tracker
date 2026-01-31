const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const BUCKET_NAME = 'fossil-fuel-shipments-tracker';
const CSV_KEY = 'lng-shipments.csv';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// CSV column headers
const CSV_HEADERS = [
  'vessel_name',
  'imo_number',
  'mmsi',
  'capacity_cbm',
  'CER_reported_payload',
  'departure_date',
  'destination_port',
  'destination_country',
  'estimated_arrival',
  'notes'
];

/**
 * Read shipments from S3 CSV file
 */
async function readShipmentsFromS3() {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: CSV_KEY
    });

    const response = await s3Client.send(command);
    const csvContent = await streamToString(response.Body);

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    return records;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      console.log('CSV file does not exist yet, will create new one');
      return [];
    }
    throw error;
  }
}

/**
 * Write shipments to S3 CSV file
 */
async function writeShipmentsToS3(shipments) {
  try {
    // Convert to CSV
    const csvContent = stringify(shipments, {
      header: true,
      columns: CSV_HEADERS
    });

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: CSV_KEY,
      Body: csvContent,
      ContentType: 'text/csv'
    });

    await s3Client.send(command);
    console.log(`Successfully wrote ${shipments.length} shipments to S3`);
  } catch (error) {
    console.error('Error writing to S3:', error);
    throw error;
  }
}

/**
 * Add new shipments to S3 CSV (avoiding duplicates by IMO)
 */
async function addShipmentsToS3(newShipments) {
  try {
    // Read existing shipments
    const existingShipments = await readShipmentsFromS3();
    const existingIMOs = new Set(existingShipments.map(s => s.imo_number));

    // Filter out duplicates
    const shipmentsToAdd = newShipments.filter(ship => {
      if (!ship.imo_number) return true; // Add if no IMO (can be updated later)
      return !existingIMOs.has(ship.imo_number);
    });

    if (shipmentsToAdd.length === 0) {
      console.log('No new shipments to add (all already exist)');
      return { added: 0, total: existingShipments.length };
    }

    // Add departure_date as current UTC time for new shipments if not set
    const shipmentsWithDates = shipmentsToAdd.map(ship => ({
      vessel_name: ship.name || ship.vessel_name || '',
      imo_number: ship.imo || ship.imo_number || '',
      mmsi: ship.mmsi || '',
      capacity_cbm: ship.capacity || ship.capacity_cbm || '',
      CER_reported_payload: ship.CER_reported_payload || '',
      departure_date: ship.departure_date || new Date().toISOString(),
      destination_port: ship.destination || ship.destination_port || '',
      destination_country: ship.destination_country || '',
      estimated_arrival: ship.estimated_arrival || '',
      notes: ship.notes || ''
    }));

    // Combine and write
    const allShipments = [...existingShipments, ...shipmentsWithDates];
    await writeShipmentsToS3(allShipments);

    return {
      added: shipmentsToAdd.length,
      total: allShipments.length
    };
  } catch (error) {
    console.error('Error adding shipments to S3:', error);
    throw error;
  }
}

/**
 * Get public URL for the CSV file
 */
function getPublicCsvUrl() {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-west-2'}.amazonaws.com/${CSV_KEY}`;
}

/**
 * Helper to convert stream to string
 */
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

module.exports = {
  readShipmentsFromS3,
  writeShipmentsToS3,
  addShipmentsToS3,
  getPublicCsvUrl
};
