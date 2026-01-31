require('dotenv').config();
const { getDepartedVessels } = require('../services/vesselFinderService');
const { addShipmentsToSheet, initializeSheet } = require('../services/sheetsService');

async function scrapeAndImport() {
  console.log('Scraping VesselFinder for departed vessels...\n');
  
  try {
    const vessels = await getDepartedVessels();
    
    console.log(`Found ${vessels.length} departed vessels\n`);
    
    if (vessels.length === 0) {
      console.log('No departed vessels found');
      return;
    }

    // Map vessels to shipment format
    const shipments = vessels.map(vessel => ({
      name: vessel.name,
      imo: vessel.imo,
      mmsi: vessel.mmsi,
      capacity: vessel.capacity,
      destination: vessel.destination,
      destination_country: vessel.destination_country,
      estimated_arrival: vessel.estimated_arrival,
      departure_date: vessel.departure_date
    }));

    // Initialize sheet if needed
    await initializeSheet();

    // Add to Google Sheet
    const result = await addShipmentsToSheet(shipments);
    
    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${result.added}`);
    console.log(`   Skipped (duplicates): ${vessels.length - result.added}`);
    console.log(`   Total shipments in S3: ${result.total}`);
    
  } catch (error) {
    console.error('Error during scrape and import:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  scrapeAndImport()
    .then(() => {
      console.log('\n✅ Scrape and import completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Scrape and import failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeAndImport };
