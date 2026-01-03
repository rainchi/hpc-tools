/**
 * Gigabyte BMC Sensor & Fan Mapping Utility
 */

/**
 * Parses Gigabyte BMC XML to extract sensor and fan mappings
 * @param {string} xmlString 
 * @returns {Object} { sensors: {}, fans: {} }
 */
export function parseGigabyteXml(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const sensors = {};
  const fans = {};

  // Try different possible tags and attributes
  const sensorNodes = xmlDoc.querySelectorAll("SENSOR, sensor, Sensor");
  
  sensorNodes.forEach(node => {
    const noHex = node.getAttribute("no") || node.getAttribute("id") || node.getAttribute("ID");
    const name = node.getAttribute("name") || node.getAttribute("NAME") || node.getAttribute("Name");
    const sdr = node.getAttribute("sdr") || node.getAttribute("SDR");
    
    if (noHex && name) {
      // Handle both "0x18" and "18" (assuming hex if it's from Gigabyte XML)
      const cleanHex = noHex.startsWith('0x') ? noHex : '0x' + noHex;
      const noDec = parseInt(cleanHex, 16);
      
      if (isNaN(noDec)) return;

      const isFan = (sdr && sdr.toUpperCase().includes("FAN")) || 
                    name.toUpperCase().includes("FAN") ||
                    (noDec >= 0x90 && noDec <= 0xFF); // Typical fan range in Gigabyte

      if (isFan) {
        fans[noDec] = name;
      } else {
        sensors[noDec] = name;
      }
    }
  });

  return { sensors, fans };
}

export async function fetchModelList() {
  try {
    const response = await fetch('/gigabyte_models/models.json');
    return await response.json();
  } catch (e) {
    console.error('Failed to fetch model list', e);
    return [];
  }
}

export async function fetchModelXml(fileName) {
  try {
    const response = await fetch(`/gigabyte_models/${fileName}`);
    return await response.text();
  } catch (e) {
    console.error(`Failed to fetch XML: ${fileName}`, e);
    return null;
  }
}


