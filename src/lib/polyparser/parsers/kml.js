/*
  Import dependencies
*/
import AppError from '../../vtfk-errors/AppError'
// For parsing XML and outputting GeoJSON
const toGeoJSON = require('@mapbox/togeojson')
// const { DOMParser } = require('@xmldom/xmldom')

export async function parse (text) {
  // Input validation
  if (!text) throw new AppError('Filen er tom', 'Vi har mottatt en fil uten innhold')

  // Parse the KML data as XML
  const kmlXML = new DOMParser().parseFromString(text, 'text/xml')
  if (!kmlXML) throw new AppError('Konvertering feilet', 'Klarte ikke å konvertere KML til XML')

  // Convert the KML to geoJSON
  const kml = toGeoJSON.kml(kmlXML)
  if (!kml) throw new AppError('Konvertering feilet', 'Klarte ikke å konvertere XML til GeoJSON')

  if (!kml.features) throw new AppError('Mangler geometri', 'Filen inneholder ingen geometri')

  // Array of polygons to return
  const polygonArray = []

  // Get all polygons from the features
  for (const feature of kml.features) {
    // Verify that the geometry has a specified type
    if (!feature.geometry || !feature.geometry.type) throw new AppError('Geometri uten type', 'Filen inneholder geometri uten spesifisert type')
    // If the type is polygon
    if (feature.geometry.type.toLowerCase() === 'polygon') {
      // Verify that the polygon has coordinates
      if (!feature.geometry.coordinates || !feature.geometry.coordinates[0][0] || !Array.isArray(feature.geometry.coordinates[0][0] || feature.geometry.coordinates[0][0].length < 3)) throw new AppError('Færre enn 3 punkter', 'Filen polygoner som har færre enn tre punkter')
      // Push the polygon to the array
      polygonArray.push(({
        metadata: feature.properties,
        vertices: feature.geometry.coordinates[0]
      }))
    }
  }

  // Return the polygon array
  return polygonArray
}
