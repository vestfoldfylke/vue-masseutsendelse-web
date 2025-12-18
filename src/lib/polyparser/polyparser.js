/*
  Import dependencies
*/
// Standardized errors
import AppError from '../vtfk-errors/AppError'
// For transforming coordinates between systems
import proj4 from 'proj4'
// For calculating the area of polygons
import {polygon as turfPolygon} from '@turf/helpers'
import turfArea from '@turf/area'
// Parsers
const dxf = require('./parsers/dxf')
const kml = require('./parsers/kml')

/*
  Variables and constants
*/
// Add definitions to proj4
proj4.defs([
  [
    '4326',
    '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
  ],
  [
    '5972',
    '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs'
  ],
  [
    '25832',
    '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs'
  ]
])
/*
  Support functions
*/
function copy (obj) {
  return JSON.parse(JSON.stringify(obj))
}

/*
  Class
*/
class PolyParser {
  /**
   *
   * @param {HTMLFile} file A file uploaded to an input-field
   * @param {object} options
   * @param {array} EPSG.code Proj4 projection string to transform from
   * @param {string} options.toProj4Projection Proj4 projection string to transform to
   *
   */
  async parse (
    file,
    options
  ) {
    // Default options
    const defaultOptions = {
      inverseXY: false,
      fromProj4Projection: '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs',
      toProj4Projection: '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
    }

    // Set options
    if (options) {
      const tmpOptions = JSON.parse(JSON.stringify(options))
      options = defaultOptions
      for (const key in tmpOptions) {
        options[key] = tmpOptions[key]
      }
    } else {
      options = defaultOptions
    }

    // Input validation
    if (!file) throw new AppError('No file provided', 'No file was provided for parsing')
    if (file.size === 0) throw new AppError('File error', 'The provided file is empty')
    if (!file.name) throw new AppError('File error', 'No \'name\' property was provided in the file')
    if (!file.name.includes('.')) throw new AppError('File error', 'The file name does not contain any file extension')

    // Define the return object
    const returnObj = {
      extremes: {},
      area: null,
      polygons: []
    }

    // Get the file extension of the file
    const extension = file.name.substring(file.name.lastIndexOf('.') + 1)

    // Attempt to read the file
    const fileData = file.data
    if (!fileData || fileData.length === 0) { throw new AppError('The file is empty', 'We were able to read the file, but it was empty') }

    // Attempt to parse the file
    let parsedData
    switch (extension) {
      case 'dxf':
        parsedData = dxf.parse(fileData)
        break
      case 'kml':
        parsedData = await kml.parse(fileData)
        break
      default:
        throw new AppError('Could not parse', `We were unable to find a parser for filetype '${extension}'`)
    }
    // Make sure that we got valid data back
    if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) throw new AppError('Unable to parse file', 'We attempted to parse the file but could not find any data')

    // Make an initial check for the first vertice in the first polygon so it can be used to determine the EPSG code
    if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) throw new AppError('Polygon is empty', 'One or more polygons in the file is empty')
    if (!parsedData[0].vertices || !Array.isArray(parsedData[0].vertices) || parsedData[0].vertices.length === 0) throw new AppError('Polygon is empty', 'One or more polygons in the file is empty')

    // Attempt to determine the EPSG code and data direction
    const EPSG = this.guessEPSGCodeAndOrder(parsedData[0].vertices[0])
    if (!EPSG || !EPSG.code) throw new AppError('Unsupported coordinate system', 'Could not determine the coordinate system based on the coordinates', [`First coordinate [${parsedData[0].vertices[0]}]`])
    returnObj.EPSG = EPSG.code

    parsedData.forEach((polygon) => {
      // Make sure that the polygon contains vertices
      if (!polygon.vertices || !Array.isArray(polygon.vertices) || polygon.vertices.length === 0) throw new AppError('Polygon is empty', 'One or more polygons in the file is empty')

      polygon.EPSGCode = EPSG.code
      // Reverse all coordinates if they are evaluated to be in reverse order
      if (EPSG.reversed) {
        for (let vertice of polygon.vertices) {
          vertice = [vertice[1], vertice[0]]
        }
      }

      // Make sure that the vertices are self-closing
      // eslint-disable-next-line
      if (polygon.vertices[0] !== polygon.vertices[polygon.vertices.length]) {
        polygon.vertices.push(copy(polygon.vertices[0]))
      }

      // Validate all vertices in the polygon
      polygon.vertices.forEach((vertice, i) => {
        // Make sure that all the vertices in the polygon is in [x, y] format
        if (!vertice || vertice.length < 2) throw new AppError('Vertice is incomplete', `The vertice in position ${i} contains only ${vertice.length} coordinates`, [vertice])
        if (typeof vertice[0] !== 'number' || typeof vertice[1] !== 'number') throw new AppError('Vertice is invalid', `The vertice in position ${i} contains coordinates that are not numbers`, [vertice])
      })

      // Check that the polygon has at least 4 points
      if (polygon.vertices.length < 4) throw new AppError('Polygon has to few vertices', `One of the polygons has only ${polygon.vertices.length} it needs at least 4`)

      // Calculate the extremes
      const extremes = this.getExtremes(polygon.vertices)

      // Calculate the centerpoints
      const center = this.getCenterFromExtremes(extremes)

      // Calculate the area of the polygon
      const tp = turfPolygon([copy(polygon.vertices)])
      const area = turfArea(tp)

      // Update the return object
      returnObj.polygons.push({
        EPSG: EPSG.code,
        metadata: polygon.metadata,
        extremes,
        center,
        area,
        vertices: polygon.vertices
      })
    })

    /*
      Find the global extremes
    */
    // Merge all the extremes into a single array
    const combinedExtremes = []
    returnObj.polygons.forEach((p) => {
      combinedExtremes.push(...Object.values(p.extremes))
    })

    // Calculate the global extremes
    returnObj.extremes = this.getExtremes(combinedExtremes)

    // Calculate the global center
    returnObj.center = this.getCenterFromExtremes(returnObj.extremes)

    // Calculate the total area
    let globalArea = 0
    // eslint-disable-next-line
    returnObj.polygons.forEach((i) => globalArea += i.area)
    returnObj.area = globalArea

    return returnObj
  }

  /**
   *
   * @param {Array[x, y]} coordinateSample A single coordinate in [x = EASTING, y = NORTHING] format
   * @returns
   */
  guessEPSGCodeAndOrder (coordinateSample) {
    let reversed = false
    let code

    // Make a check if the coordinates are long or lat
    if ((coordinateSample[0] > -90 && coordinateSample[0] < 90 && coordinateSample[1] > -180 && coordinateSample[1] < 180) ||
    (coordinateSample[1] > -90 && coordinateSample[1] < 90 && coordinateSample[0] > -180 && coordinateSample[0] < 180)
    ) {
      // The EPSG code for WGS84 (lat, long)
      code = '4326'

      // Attempt to check if the coordinate is in Northing / Easting format, is so, set reversed to true.
      // This will work well around norway but will yield wrong results other places in the world
      if (coordinateSample[0] > 31) reversed = true
    } else {
      // The coordinates are in some other CRS, attempt to figure out what
      // Make two passes to attempt to determine what EPSG code the coordinate falls under
      // The second pass is with X and Y reversed to check if the data is passed in with northing, easting formating
      for (let i = 0; i <= 1; i++) {
        // eslint-disable-next-line
        if (i == 1) {
          reversed = true
          coordinateSample = [coordinateSample[1], coordinateSample[0]]
        }
        if (coordinateSample[0] > 322361.85 && coordinateSample[0] < 637396.44 && coordinateSample[1] > 6424859.18 && coordinateSample[1] < 7296440.28) code = '5972'
        if (coordinateSample[0] > -1877994.66 && coordinateSample[0] < 3932281.56 && coordinateSample[1] > 836715.13 && coordinateSample < 9440581.95) code = '25832'
      }
    }

    if (!code) return undefined

    return {
      code,
      reversed
    }
  }

  /**
   *
   * @param {string} sourceEPSGCode Example EPSG:25832
   * @param {string} destinationEPSG Default EPSG:4326
   * @param {number[x, y]} coordinates Coordinates in [Easting, Northing] format
   * @returns
   */
  transformCoordinates (sourceEPSGCode, destinationEPSG = '4326', coordinates) {
    // Input validation
    if (!coordinates) throw new AppError('No coordinates', 'No coordinates were provided for parsing')
    if (sourceEPSGCode === destinationEPSG) return coordinates
    // If no sourceEPSG is provided, try to determine it
    let EPSGCode = sourceEPSGCode
    const reverseOrder = false
    if (!EPSGCode) {
      const EPSG = this.guessEPSGCodeAndOrder(coordinates)
      if (!EPSG) throw new AppError('No EPSG code found', 'Could not determine any supported EPSG codes from the coordinates')
      EPSGCode = EPSG.code
      // If the coordinate seems to be in reversed order, reverse it
      if (reverseOrder) coordinates = [coordinates[1], coordinates[0]]
    }
    // Transform the coordinates
    return proj4(EPSGCode, destinationEPSG, coordinates)
  }

  /**
   * Retrieves the extreme coordinates
   * @param {Array[Array[x, y]]} coordinates
   * @returns {object}
   */
  getExtremes (coordinates) {
    // Set all extremes to the first vertice
    let extremeNorth = copy(coordinates[0])
    let extremeWest = copy(coordinates[0])
    let extremeEast = copy(coordinates[0])
    let extremeSouth = copy(coordinates[0])

    for (const vertice of coordinates) {
      // Make a copy of the vertice to make sure to not pass a reference
      const copy = JSON.parse(JSON.stringify(vertice))
      // Check if the vertice is extremer than the current extreme
      if (vertice[0] < extremeWest[0]) extremeWest = copy
      if (vertice[0] > extremeEast[0]) extremeEast = copy
      if (vertice[1] > extremeNorth[1]) extremeNorth = copy
      if (vertice[1] < extremeSouth[1]) extremeSouth = copy
    }

    return {
      north: extremeNorth,
      west: extremeWest,
      east: extremeEast,
      south: extremeSouth
    }
  }

  /**
   *
   * @param {object} extremes
   * @param {array} extremes.north The northmost coordinate
   * @param {array} extremes.west The westmost coordinate
   * @param {array} extremes.east The eastmost coordinate
   * @param {array} extremes.south The southmost coordinate
   */
  getCenterFromExtremes (extremes) {
    return [
      (extremes.west[0] + extremes.east[0]) / 2,
      (extremes.south[1] + extremes.north[1]) / 2
    ]
  }

  /**
   * Swaps the X and Y coordinates
   * @param {Number[x, y]} coordinates
   */
  swapXY (coordinates) {
    return [coordinates[1], coordinates[0]]
  }
}

export default new PolyParser()
