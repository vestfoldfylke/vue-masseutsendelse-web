/*
  Import dependencies
*/
import AppError from '../../vtfk-errors/AppError'
import DxfParser from 'dxf-parser'

export function parse (text) {
  try {
    // The array of polygons to return
    const polygonArray = []
    // Create the parser
    const parser = new DxfParser()

    // Parse the file
    const parsed = parser.parseSync(text)

    // Validate that the file contains entities
    if (!parsed.entities) { throw new AppError('The file contains no shapes', 'We were unable to find any shapes in the file') }

    // Retrieve polygons from the file
    const polygons = parsed.entities.filter(i => i.type === 'LWPOLYLINE')
    if (polygons.length === 0) { throw new AppError('No polygons in file', `We were able to find ${parsed.entities.length} shapes in the file, but none are polygons`) }

    // Verify that all polygons have segments
    polygons.forEach(polygon => {
      // Make sure that the polygon has vertices
      if (!polygon.vertices || !Array.isArray(polygon.vertices) || polygon.vertices.length <= 0) throw new AppError('Polygon is missing vertices', 'One or more polygons in the file contains no vertices')
      // Get all vertices
      const vertices = []
      polygon.vertices.forEach((v) => {
        vertices.push([v.x, v.y])
      })
      // Get the metadata from
      const metadata = { ...polygon }
      delete metadata.vertices

      // Push the vertices to polygonArray
      polygonArray.push({
        metadata,
        vertices
      })
    })

    return polygonArray
  } catch (err) {
    throw new AppError(err.title || 'Error', err.message)
  }
}
