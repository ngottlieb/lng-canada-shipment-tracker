require('dotenv').config();
const { getDepartedVessels, checkVesselArrival } = require('../services/vesselFinderService');
const { addShipmentsToSheet, initializeSheet, readShipmentsFromSheet, updateShipmentArrival } = require('../services/sheetsService');
const dayjs = require('dayjs');

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
      departure_date: vessel.departure_date,
      notes: "Scraped from VesselFinder"
    }));

    // Initialize sheet if needed
    await initializeSheet();

    // Add to Google Sheet
    const result = await addShipmentsToSheet(shipments);
    
    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${result.added}`);
    console.log(`   Skipped (duplicates): ${vessels.length - result.added}`);
    console.log(`   Total shipments in sheet: ${result.total}`);
    
    // Check for arrivals
    console.log('\n🔍 Checking for shipment arrivals...\n');
    await checkShipments();
    
  } catch (error) {
    console.error('Error during scrape and import:', error);
    process.exit(1);
  }
}

async function checkShipments() {
  try {
    const allShipments = await readShipmentsFromSheet();
    
    // Filter for shipments without actual_arrival (not "unknown")
    const shipmentsToCheck = allShipments.filter(s => {
      const actualArrival = s.actual_arrival || '';
      return actualArrival === '' && s.imo_number;
    });
    
    console.log(`Found ${shipmentsToCheck.length} shipments to check for arrivals`);
    
    let updatedCount = 0;
    
    for (const shipment of shipmentsToCheck) {
      const imo = shipment.imo_number;
      const vesselName = shipment.vessel_name || shipment.name;
      
      console.log(`  Checking ${vesselName} (IMO: ${imo})...`);
      
      const arrivalStatus = await checkVesselArrival(imo);
      
      if (arrivalStatus && arrivalStatus.hasArrived) {
        console.log(`    ✓ Vessel has arrived! Updating sheet...`);
        
        const departureDate = shipment.departure_date ? dayjs(shipment.departure_date).format('YYYY-MM-DD') : '';
        const success = await updateShipmentArrival(imo, departureDate, arrivalStatus.actualArrival, arrivalStatus.shouldFlag);
        
        if (success) {
          updatedCount++;
          console.log(`    ✓ Updated actual arrival date`);
        } else {
          console.log(`    ✗ Failed to update`);
        }
      } else {
        console.log(`    → Still en route`);
      }
      
      // Be respectful with delays
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n✅ Arrival check complete. Updated ${updatedCount} shipments.`);
    
  } catch (error) {
    console.error('Error checking arrivals:', error);
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
