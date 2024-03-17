import { rest } from 'msw'
import config from '../../config'

const mockEndpoints = []

if (config.MOCK_MASSEUTSENDELSE_API === 'true') {
  mockEndpoints.push(rest.get('*/api/dispatches', (req, res, ctx) => {
    return res(ctx.json(require('./data/Dispatches.json')))
  }))
  mockEndpoints.push(rest.get('*/api/templates', (req, res, ctx) => {
    return res(ctx.json(require('./data/Templates.json')))
  }))
}

if (config.MOCK_MATRIKKEL_API === 'true') {
  mockEndpoints.push(rest.post('*/api/v1/matrikkelenheter*', (req, res, ctx) => {
    return res(ctx.json(require('./data/MatrikkelEnhetIDs.json')))
  }))
  mockEndpoints.push(rest.post('*/api/v1/store', (req, res, ctx) => {
    if (!req.body) { res(ctx.json({ message: 'No body specified' })) }
    if (!Array.isArray(req.body)) { req.body = [req.body] }

    if (req.body[0].type === 'MatrikkelenhetId') {
      return res(ctx.json(require('./data/MatrikkelEnheter.json')))
    } else if (req.body[0].type === 'PersonId') {
      return res(ctx.json(require('./data/PersonerIBø.json')))
    }
  }))
}

console.log('== Mock endpoints ==')
console.log(mockEndpoints)

export default mockEndpoints
