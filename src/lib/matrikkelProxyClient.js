/*
  Import dependencies
*/
import config from '../../config'
import AppError from './vtfk-errors/AppError'
import { removeKeys } from '@vtfk/utilities'
import store from '../store'

export default class MatrikkelProxyClient {
  constructor (APIBaseURL, ClientId) {
    this.apiBaseUrl = APIBaseURL || config.MASSEUTSENDELSEAPI_BASEURL
    this.clientId = ClientId || config.MATRIKKELPROXY_CLIENTID

    // Create a matrikkelContext that can be used if none is provided to the functions
    this.matrikkelContext = {
      klientIdentifikasjon: this.clientId
    }

    if (!this.apiBaseUrl) { throw new Error('APIBaseURL cannot be empty') }
    // if(!this.apiKey) { throw new Error('APIKey cannot be empty'); }
    if (!this.clientId) { throw new Error('Client ID cannot be empty') }
  }

  async makeRequest (request, options, matrikkelContext) {
    // Input validation
    if (!request) { throw new Error('request cannot be empty') }
    if (!request.url) { throw new Error('request.url cannot be empty') }

    // If MatrikkelProxyClient is specified use that as the base URL instead
    request.url = config.MASSEUTSENDELSEAPI_BASEURL
      ? `${config.MASSEUTSENDELSEAPI_BASEURL}matrikkel/${encodeURIComponent(request.url)}`
      : `${this.apiBaseUrl}${request.url}`;

    // Make sure that headers are set up on the request
    if (!request.headers) {
      request.headers = {}
    }
    request.headers['Content-Type'] = 'application/json'
    if (this.apiKey) {
      request.headers['X-API-KEY'] = this.apiKey
    }

    // Apply query options to the request if specified
    if (options && options.query) {
      let addingFirstQuery = false
      if (!request.url.includes('?')) {
        request.url += '?'
        addingFirstQuery = true
      }

      for (const query in options.query) {
        if (options.query[query] !== undefined) {
          let add = ''
          if (!addingFirstQuery) { add = '&' }
          if (addingFirstQuery) { addingFirstQuery = false }
          add += query + '=' + options.query[query]
          request.url += add
        }
      }
    }

    // Determine what MatrikkelContext to use
    request.data.matrikkelContext = matrikkelContext ? matrikkelContext : this.matrikkelContext

    // Return the full response
    return await store.dispatch('makeMatrikkelRequest', request)
  }

  async getMatrikkelEnheterFromPolygon (polygon, epsg, matrikkelContext) {
    if (!polygon) { throw new AppError('Polygon cannot be empty') }

    // Translate from EPST to MatrikkelKoordinatSystemKodeId
    if (!epsg) {
      throw new AppError('Koordinatsystem mangler', 'Kan ikke kontakte matrikkelen uten å vite epsg-koden til koordinatene')
    }

    let koordinatsystemKodeId
    switch (epsg) {
      case '4326':
        koordinatsystemKodeId = 24
        break
      case '5972':
      case '25832':
        koordinatsystemKodeId = 10
        break
    }
    if (!koordinatsystemKodeId) {
      throw new AppError('Feil koordinatsystem', 'Kunne ikke finne passende koordinatsystem for koordinatene')
    }

    // Construct the request
    const request = {
      method: 'POST',
      url: 'matrikkelenheter',
      data: {
        koordinatsystemKodeId,
        polygon
      }
    }

    // Make the request
    return await this.makeRequest(request, matrikkelContext)
  }

  async getStoreItems (items, koordinatsystemKodeId, options, matrikkelContext) {
    // Input validation
    if (!items) { throw new Error('items cannot be empty') }
    if (!koordinatsystemKodeId) { throw new Error('koordinatsystemKodeId cannot be empty') }

    // Construct the request
    const request = {
      method: 'POST',
      url: 'store',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      data: {
        koordinatsystemKodeId,
        items
      }
    }

    // Make the request
    return await this.makeRequest(request, options, matrikkelContext)
  }

  /**
    * Will attempt to get the type of provided object if it is not flattened
    * @param {Item} Item - An object returned from the MatrikkelAPI
  */
  static getItemType (Item) {
    if (!Item) { return undefined }

    if (Item._type || Item.type) {
      return Item._type || Item.type
    }

    return 'unknown'
  }

  /**
    * Will attempt to get the real value of a property
    * Example test: { value: 'actual value' } will return 'actual value'
    * @param {Item} Item - An object returned from the MatrikkelAPI
  */
  static getItemValue (Item) {
    if (!Item) { return }

    if (Item.value) {
      return Item.value
    } else if (Object.keys(Item).length === 1) {
      return Item[Object.keys(Item)[0]]
    } else if (Object.keys(Item).length === 3 && Item._type && Item._namespace) {
      const key = Object.keys(Item).find((k) => k !== '$')
      if (key) { return Item[key] }
    }

    return Item
  }

  /**
   *
   * @param {Object} matrikkelUnits Data object containing MatrikkelEnheter
   * @param {Object} matrikkelOwners Data object containing MatrikkelEiere
   */
  static getMatrikkelEnheterOwnerCentric (matrikkelUnits, matrikkelOwners) {
    if (!matrikkelUnits) throw new AppError('MatrikkelEnheter missing', 'No MatrikkelEnheter is provided')
    if (!matrikkelOwners) throw new AppError('matrikkelOwners missing', 'No matrikkelOwners is provided')

    // Object to store
    const returnedOwners = {}

    // Loop through units as they contain the owner information
    for (const unit of matrikkelUnits) {
      if (unit.eierforhold) {
        unit.eierforhold.forEach((ownership) => {
          // Retrieve the owner for the ownership
          const owner = matrikkelOwners.find((o) => o.id.value === ownership.eierId)
          if (!owner) throw new AppError('Kunne ikke finne eier til eierskap', `Eier med id ${ownership.eierforhold} kunne ikke finnes for ${unit.bruksnavn}`)

          // Add the owner to the returnedOwners object if not already exists
          if (!returnedOwners[ownership.eierId]) {
            returnedOwners[ownership.eierId] = { ...owner, ownerships: [] }
            if (owner.id.value) returnedOwners[ownership.eierId].id = owner.id.value
          }

          // Push the ownership to the owner
          returnedOwners[ownership.eierId].ownerships.push({
            ...ownership,
            unit: removeKeys(unit, ['eierforhold'])
          })
        })
      }
    }

    // Convert from object to array
    const ownerArray = []
    for (const key in returnedOwners) ownerArray.push(returnedOwners[key])

    // Return the array
    return ownerArray
  }
}
