const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

// Scrape vessel details from VesselFinder vessel page
const scrapeVesselDetails = async (vesselUrl) => {
  try {
    console.log(`  Accessing: ${vesselUrl}`);
    
    const response = await axios.get(vesselUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://www.vesselfinder.com/',
        'Cache-Control': 'max-age=0'
      },
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
          details.destination = destLink;
          // Try to extract country from destination (usually after comma)
          const parts = destLink.split(',').map(p => p.trim());
          if (parts.length > 1) {
            details.destination_country = parts[parts.length - 1];
          }
        }
      }
    });
    
    // Extract ETA
    const etaSpan = $('span._mcol12ext').text();
    if (etaSpan && etaSpan.includes('ETA:')) {
      const etaText = etaSpan.replace('ETA:', '').trim();
      if (etaText) {
        details.estimated_arrival = etaText;
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
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
            let departureDate = null;
            $(elem).find('td').each((tdIndex, td) => {
              const tdText = $(td).text().trim();
              // Look for date patterns like "Jan 28, 2026" or "28 Jan"
              const dateMatch = tdText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s*(\d{4})?/i);
              if (dateMatch && !departureDate) {
                const monthStr = dateMatch[1];
                const day = dateMatch[2];
                const year = dateMatch[3] || dayjs().year();
                
                // Parse date using dayjs
                const dateString = `${monthStr} ${day} ${year}`;
                const parsed = dayjs(dateString, 'MMM D YYYY');
                
                if (parsed.isValid()) {
                  departureDate = parsed.toISOString();
                  console.log(`  Found departure date for ${vesselName}: ${parsed.format('YYYY-MM-DD')}`);
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

module.exports = {
  getDepartedVessels,
  scrapeVesselFinder
};
