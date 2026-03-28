const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const KITIMAT_TZ = 'America/Vancouver';

// Reusable headers for all VesselFinder requests
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Referer': 'https://www.vesselfinder.com/',
  'Cache-Control': 'max-age=0'
};

// Scrape vessel details from VesselFinder vessel page
const scrapeVesselDetails = async (vesselUrl) => {
  try {
    console.log(`  Accessing: ${vesselUrl}`);
    
    const response = await axios.get(vesselUrl, {
      headers: REQUEST_HEADERS,
      timeout: 10000,
      decompress: true
    });

    const $ = cheerio.load(response.data);
    
    // Extract vessel details from the page
    const details = {
      name: null,
      imo: null,
      mmsi: null,
      type: null,
      capacity: null,
      destination: null,
      destination_country: null,
      estimated_arrival: null
    };

    // Try to extract IMO number
    $('td').each((i, elem) => {
      const text = $(elem).text().trim();
      
      // Look for "IMO / MMSI" in the label column
      if (text === 'IMO / MMSI') {
        const valueText = $(elem).next().text().trim();
        const parts = valueText.split('/').map(p => p.trim());
        if (parts.length === 2) {
          details.imo = parts[0];
          details.mmsi = parts[1];
        }
      } else if (text.includes('IMO') && !details.imo) {
        const imoMatch = text.match(/(\d{7})/);
        if (imoMatch) details.imo = imoMatch[1];
      } else if (text.includes('MMSI') && !details.mmsi) {
        const mmsiMatch = text.match(/(\d{9})/);
        if (mmsiMatch) details.mmsi = mmsiMatch[1];
      }
      
      if (text === 'Callsign' || text.includes('Type')) {
        details.type = $(elem).next().text().trim();
      }
      // Look for LNG capacity specifically (in m³)
      if (text.includes('LNG Capacity') || text.includes('Capacity (LNG)')) {
        const capacityMatch = $(elem).next().text().match(/(\d[\d,]+)/);
        if (capacityMatch) {
          details.capacity = parseInt(capacityMatch[1].replace(/,/g, ''));
        }
      }
    });
    
    // Extract destination from the page
    $('.vilabel').each((i, elem) => {
      const labelText = $(elem).text().trim();
      if (labelText === 'Destination') {
        // Look for the link in the next element or sibling
        const destLink = $(elem).next('a._npNa').text().trim() || 
                        $(elem).parent().find('a._npNa').text().trim();
        if (destLink) {
          // Split destination into port and country
          const parts = destLink.split(',').map(p => p.trim());
          if (parts.length > 1) {
            details.destination = parts[0]; // Port only
            details.destination_country = parts[parts.length - 1]; // Country
          } else {
            details.destination = destLink; // If no comma, use full destination
          }
        }
      }
    });
    
    // Extract ETA — format: "Apr 12, 12:00 (in 15 days)", displayed in UTC (same as ATD)
    const etaSpan = $('span._mcol12ext').text();
    if (etaSpan && etaSpan.includes('ETA:')) {
      const etaText = etaSpan.replace('ETA:', '').trim();
      const etaMatch = etaText.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{1,2}):(\d{2})/);
      if (etaMatch) {
        const parsed = dayjs.utc(`${etaMatch[1]} ${etaMatch[2]} ${dayjs().year()} ${etaMatch[3]}:${etaMatch[4]}`, 'MMM D YYYY HH:mm');
        if (parsed.isValid()) {
          details.estimated_arrival = parsed.toISOString();
        }
      }
    }
    
    // Also check the title and h2 for IMO
    const h2Text = $('h2.vst').text();
    if (h2Text && !details.imo) {
      const imoMatch = h2Text.match(/IMO\s+(\d{7})/);
      if (imoMatch) details.imo = imoMatch[1];
    }

    // Get vessel name from title or h1
    details.name = $('h1').first().text().trim() || $('title').text().split('-')[0].trim();

    console.log(`  Found IMO: ${details.imo}, MMSI: ${details.mmsi}`);
    
    return details;
  } catch (error) {
    console.error(`  Error scraping vessel details: ${error.message}`);
    return null;
  }
};

// Scrape VesselFinder for vessels at Kitimat port
const scrapeVesselFinder = async () => {
  try {
    // Scrape the port page
    const portUrl = 'https://www.vesselfinder.com/ports/CAKTM001';
    
    console.log('Scraping VesselFinder port page...');
    
    const response = await axios.get(portUrl, {
      headers: REQUEST_HEADERS,
      timeout: 15000,
      decompress: true // Automatically decompress gzip responses
    });

    const $ = cheerio.load(response.data);
    const inPort = [];
    const arrivals = [];
    const departures = [];
    
    // Track which section we're in
    let currentSection = null;
    
    // Parse the page looking for section headers and vessels
    $('h3, h2, h4, table, a[href*="/vessels/"], td, tr').each((i, elem) => {
      const tagName = elem.tagName.toLowerCase();
      const text = $(elem).text().trim().toLowerCase();
      
      // Detect section headers
      if (tagName === 'h3' || tagName === 'h2' || tagName === 'h4') {
        if (text.includes('in port') || text.includes('at port') || text.includes('vessels in')) {
          currentSection = 'in_port';
          console.log('Found "In Port" section');
        } else if (text.includes('arrival') || text.includes('expected')) {
          currentSection = 'arrivals';
          console.log('Found "Arrivals" section');
        } else if (text.includes('departure') || text.includes('sailed')) {
          currentSection = 'departures';
          console.log('Found "Departures" section');
        }
      }
      
      // Extract vessel links and departure dates from table rows in departures section
      if (currentSection === 'departures' && tagName === 'tr') {
        const vesselLink = $(elem).find('a[href*="/vessels/"]').first();
        if (vesselLink.length > 0) {
          let vesselName = vesselLink.text().trim();
          const href = vesselLink.attr('href');
          
          // Clean up vessel name - remove type suffixes
          vesselName = vesselName.replace(/\s+(LNG Tanker|Bulk Carrier|Passenger ship|Pleasure craft|Tug|SAR|General Cargo Ship|Passenger\/Ro-Ro Cargo Ship).*$/i, '').trim();
          
          // Check if it's an LNG tanker
          const fullText = $(elem).text();
          const isLNG = fullText.toLowerCase().includes('lng tanker');
          
          if (isLNG && vesselName && vesselName.length > 5 && 
              !vesselName.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/) &&
              !vesselName.match(/^\d/)) {
            
            // Try to extract departure date from the row
            // Column header is "Departure (LT)" — format: "Mar 28, 08:56" in America/Vancouver local time
            let departureDate = null;
            $(elem).find('td').each((tdIndex, td) => {
              const tdText = $(td).text().trim();
              const dateMatch = tdText.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s*(\d{1,2}):(\d{2})$/i);
              if (dateMatch && !departureDate) {
                const monthStr = dateMatch[1];
                const day = dateMatch[2];
                const hour = dateMatch[3];
                const minute = dateMatch[4];
                const year = dayjs().year();

                const parsed = dayjs.tz(`${monthStr} ${day} ${year} ${hour}:${minute}`, 'MMM D YYYY HH:mm', KITIMAT_TZ);
                if (parsed.isValid()) {
                  departureDate = parsed.toISOString();
                  console.log(`  Found departure date for ${vesselName}: ${parsed.format('YYYY-MM-DD HH:mm z')}`);
                }
              }
            });
            
            const vesselData = {
              name: vesselName,
              type: 'LNG Tanker',
              url: href.startsWith('http') ? href : `https://www.vesselfinder.com${href}`,
              section: currentSection,
              departure_date: departureDate
            };
            
            if (!departures.find(v => v.name === vesselName)) {
              departures.push(vesselData);
            }
          }
        }
      }
      
      // Extract vessel links (legacy support for non-table format)
      if (tagName === 'a' && $(elem).attr('href')?.includes('/vessels/')) {
        let vesselName = $(elem).text().trim();
        const href = $(elem).attr('href');
        
        // Clean up vessel name - remove type suffixes
        vesselName = vesselName.replace(/\s+(LNG Tanker|Bulk Carrier|Passenger ship|Pleasure craft|Tug|SAR|General Cargo Ship|Passenger\/Ro-Ro Cargo Ship).*$/i, '').trim();
        
        // Filter out dates and short names
        if (vesselName && vesselName.length > 5 && 
            !vesselName.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/) &&
            !vesselName.match(/^\d/)) {
          
          // Check if it's an LNG tanker based on context
          const fullText = $(elem).parent().text();
          const isLNG = fullText.toLowerCase().includes('lng tanker');
          
          if (isLNG) {
            const vesselData = {
              name: vesselName,
              type: 'LNG Tanker',
              url: href.startsWith('http') ? href : `https://www.vesselfinder.com${href}`,
              section: currentSection || 'unknown',
              departure_date: null
            };
            
            // Add to appropriate array (avoid duplicates)
            if (currentSection === 'in_port' && !inPort.find(v => v.name === vesselName)) {
              inPort.push(vesselData);
            } else if (currentSection === 'arrivals' && !arrivals.find(v => v.name === vesselName)) {
              arrivals.push(vesselData);
            } else if (currentSection === 'departures' && !departures.find(v => v.name === vesselName)) {
              departures.push(vesselData);
            }
          }
        }
      }
    });

    console.log(`Found vessels - In Port: ${inPort.length}, Arrivals: ${arrivals.length}, Departures: ${departures.length}`);
    
    // Only return vessels that have departed (these are the shipments we want to track)
    const vessels = departures;
    
    if (vessels.length > 0) {
      console.log('Departed vessels:', vessels.map(v => v.name).join(', '));
    }

    // For departed vessels, try to fetch details, but if it fails, return basic info
    const detailedVessels = [];
    for (const vessel of vessels) {
      if (vessel.url) {
        console.log(`Fetching details for ${vessel.name}...`);
        const details = await scrapeVesselDetails(vessel.url);
        
        if (details && details.imo) {
          detailedVessels.push({
            name: details.name || vessel.name,
            imo: details.imo,
            mmsi: details.mmsi,
            type: vessel.type,
            capacity: details.capacity,
            destination: details.destination,
            destination_country: details.destination_country,
            estimated_arrival: details.estimated_arrival,
            departure_date: vessel.departure_date
          });
        } else {
          // If detail fetch fails, return basic vessel info for manual completion
          console.log(`⚠️  Could not fetch details for ${vessel.name}, returning basic info`);
          detailedVessels.push({
            name: vessel.name,
            imo: null, // Will need manual entry
            mmsi: null,
            type: vessel.type,
            capacity: null,
            destination: null,
            destination_country: null,
            estimated_arrival: null,
            departure_date: vessel.departure_date
          });
        }
        
        // Be respectful with delays
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Extracted details for ${detailedVessels.length} vessels`);
    return detailedVessels;
    
  } catch (error) {
    console.error('VesselFinder scraping error:', error.message);
    
    // If scraping fails, return empty array (manual entry can be used)
    console.log('Unable to scrape VesselFinder. Please use manual entry or add vessels via CSV.');
    return [];
  }
};

// Main function to get departed vessels
const getDepartedVessels = async () => {
  return await scrapeVesselFinder();
};

/**
 * Check if a vessel has arrived at its destination
 * @param {string} imo - IMO number of the vessel
 * @returns {Promise<Object|null>} Object with hasArrived and actualArrival date, or null if error
 */
const checkVesselArrival = async (imo) => {
  try {
    const vesselUrl = `https://www.vesselfinder.com/vessels/details/${imo}`;
    const response = await axios.get(vesselUrl, {
      headers: REQUEST_HEADERS,
      timeout: 10000,
      decompress: true
    });

    const $ = cheerio.load(response.data);
    
    const pageText = $('body').text();

    // Extract Last Port from "Recent Port Calls" section: <strong>Last Port</strong><a>Kitimat, Canada</a>
    let lastPort = null;
    $('strong').each((_i, elem) => {
      if ($(elem).text().trim() === 'Last Port') {
        const portLink = $(elem).next('a');
        if (portLink.length) {
          lastPort = portLink.text().trim();
        }
      }
    });

    // Extract ATD — labeled as UTC on the page: "ATD: Mar 26, 07:09 UTC"
    let atd = null;
    const atdMatch = pageText.match(/ATD:\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{1,2}):(\d{2})/i);
    if (atdMatch) {
      const parsed = dayjs.utc(`${atdMatch[1]} ${atdMatch[2]} ${dayjs().year()} ${atdMatch[3]}:${atdMatch[4]}`, 'MMM D YYYY HH:mm');
      if (parsed.isValid()) {
        atd = parsed.toISOString();
      }
    }

    // Check arrival status
    let hasArrived = false;
    let actualArrival = null;
    let shouldFlag = false;

    if (pageText.includes('ARRIVED')) {
      hasArrived = true;

      // ATA is also UTC: "ATA: Mar 26, 07:09 UTC"
      const ataMatch = pageText.match(/ATA:\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{1,2}):(\d{2})/i);
      if (ataMatch) {
        const parsed = dayjs.utc(`${ataMatch[1]} ${ataMatch[2]} ${dayjs().year()} ${ataMatch[3]}:${ataMatch[4]}`, 'MMM D YYYY HH:mm');
        if (parsed.isValid()) {
          actualArrival = parsed.toISOString();
        }
      }

      // Flag if arrived but last port is not Kitimat
      if (lastPort && !lastPort.toLowerCase().includes('kitimat')) {
        shouldFlag = true;
        console.log(`  ⚠️  Vessel arrived but last port is "${lastPort}", not Kitimat - flagging`);
      }
    }

    return {
      hasArrived,
      actualArrival,
      shouldFlag,
      atd,
      lastPort
    };
  } catch (error) {
    console.error(`  Error checking vessel arrival: ${error.message}`);
    return null;
  }
};

module.exports = {
  getDepartedVessels,
  scrapeVesselFinder,
  checkVesselArrival
};