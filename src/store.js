/*
  Import and setup dependencies
*/
import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import AppError from './lib/vtfk-errors/AppError'
import config from '../config'
import merge from 'lodash.merge'

// Configure vue to use Vuex
Vue.use(Vuex)

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  console.log('== Environment ==')
  console.log(process.env)
  console.log('== Configuration ==')
  console.log(config)
}

/*
  Functions
*/
async function handleAuthentication () {
  // Just return if re-authentication is not necessary
  if (!Vue.prototype.$isAuthenticationRequired()) return

  await Vue.prototype.$acquireTokenPopup()
}

/*
  Vuex store implementation
*/
const store = new Vuex.Store({
  state: {
    modalError: undefined,
    previewPDFBase64: undefined,
    isShowGuideModal: false,
    dispatches: undefined,
    brreg: undefined,
    templates: undefined,
    loadingModal: undefined
  },
  mutations: {
    setModalError (state, error) {
      state.modalError = error
    },
    setLoadingModal (state, loadingModal) {
      if (!loadingModal) return
      if (!loadingModal.title) loadingModal.title = 'Laster'
      if (!loadingModal.message) loadingModal.message = 'Dette kan ta noen sekunder'

      Vue.set(state, 'loadingModal', loadingModal)
    },
    resetLoadingModal (state) {
      state.loadingModal = false
    },
    setPreviewPDF (state, pdfBase64) {
      state.previewPDFBase64 = pdfBase64
    },
    resetModalError (state) {
      state.modalError = undefined
    },
    setGuideModal (state) {
      state.isShowGuideModal = true
    },
    resetGuideModal (state) {
      state.isShowGuideModal = false
    },
    setDispatches (state, dispatches) {
      state.dispatches = dispatches
    },
    setTemplates (state, templates) {
      state.templates = templates
    },
    setBrreg (state, brreg) {
      state.breg = brreg
    }
  },
  actions: {
    async getPDFPreview (context, req) {
      try {
        // Merge data
        let data = merge({ attachments: req.attachments }, req.template.data)
        data = merge(data, req.template.documentData)

        data = merge(data, {
          info: {
            sector: req.createdByDepartment || Vue.prototype.$accessToken?.idTokenClaims?.department,
            'our-reference': req.archivenumber,
            'our-caseworker': req.createdBy || Vue.prototype.$accessToken?.account?.name
          }
        })

        // Define the data to send
        const requestData = {
          preview: true,
          template: req.template.template,
          documentDefinitionId: req.template.documentDefinitionId,
          data
        }
        context.commit('setLoadingModal', {
          title: 'Laster PDF forhåndsvisning',
          message: 'Dette kan ta noen sekunder'
        })

        // Define the requiest
        const request = {
          url: config.MASSEUTSENDELSEAPI_BASEURL + 'generatePDF',
          method: 'post',
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          },
          data: requestData
        }
        // Make the request
        const response = await axios.request(request)
        context.commit('setPreviewPDF', response.data.base64)
        context.commit('resetLoadingModal')
      } catch (err) {
        context.commit('resetLoadingModal')
        context.commit('setModalError', err)
      }
    },
    async getDispatches (context) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Define the request
        const request = {
          url: config.MASSEUTSENDELSEAPI_BASEURL + 'dispatches',
          method: 'GET',
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }
        // Reset the data
        context.commit('setDispatches', undefined)
        // Make the request
        const response = await axios.request(request)

        if (!response || !response.data) throw new AppError('Kunne ikke laste utsendelser', 'Serveren svarte, men finner ikke data i svaret')

        // Commit and return the data
        context.commit('setDispatches', response.data)
        return response.data
      } catch (err) {
        return Promise.reject(err)
      }
    },
    async getBrreg (context, id) {
      try {
        if (!id) throw new AppError('ID cannot be empty, must provide an ID to make the reqeust.')

        const request = {
          method: 'GET',
          url: config.MASSEUTSENDELSEAPI_BASEURL + 'brreg/' + id,
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }
        // Make the request
        const response = await axios.request(request)

        // Return the respose
        return response.data
      } catch (err) {
        console.log('Error getting orgbyId for pre included orgs')
        console.log(err)
        return Promise.reject(err)
      }
    },
    async getDispatchesById (context, id) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Define the request
        const request = {
          url: config.MASSEUTSENDELSEAPI_BASEURL + 'dispatches/' + id + '?code=1pcYSPPawrq0FGkzGTwsaLkgmmy3fvRej9ujdDfwXZ17/9bDvFZspQ==',
          method: 'GET',
          data: id,
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }
        // Make the request
        const response = await axios.request(request)
        if (!response || !response.data) throw new AppError('Kunne ikke laste utsendelse', 'Serveren svarte med finner ikke utsendelsen i svaret')
        // Return the data
        return response.data
      } catch (err) {
        console.log('Error opening dispatchById')
        console.log(err)
        return Promise.reject(err)
      }
    },
    async getTemplates (context) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Define the request
        const request = {
          url: config.MASSEUTSENDELSEAPI_BASEURL + 'templates',
          method: 'get',
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }
        // Reset the data
        context.commit('setTemplates', undefined)
        // Make the request
        const response = await axios.request(request)
        if (!response || !response.data) throw new AppError('Kunne ikke laste maler', 'Serveren svarte, men finner ingen maler i svaret')
        // Commit and return the data
        context.commit('setTemplates', response.data)
        return response.data
      } catch (err) {
        return Promise.reject(err)
      }
    },
    async postTemplate (context, template) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Define the request
        const request = {
          url: config.MASSEUTSENDELSEAPI_BASEURL + 'templates',
          method: 'post',
          data: template,
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }

        // Set the loading modal
        context.commit('setLoadingModal', {
          title: 'Lagrer',
          message: 'Dette kan ta noen sekunder'
        })
        // Make the request
        await axios.request(request)
        // Get the updated templates
        await context.dispatch('getTemplates')
        // Clear the loading modal
        context.commit('resetLoadingModal')
      } catch (err) {
        context.commit('resetLoadingModal')
        return Promise.reject(err)
      }
    },
    async putTemplate (context, template) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Define the request
        const request = {
          url: config.MASSEUTSENDELSEAPI_BASEURL + 'templates/' + template._id,
          method: 'put',
          data: template,
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }
        // Set the loading modal
        context.commit('setLoadingModal', {
          title: 'Lagrer',
          message: 'Dette kan ta noen sekunder'
        })
        // Make the request
        await axios.request(request)
        // Get the updated templates
        await context.dispatch('getTemplates')
        // Clear the loading modal
        context.commit('resetLoadingModal')
      } catch (err) {
        context.commit('resetLoadingModal')
        return Promise.reject(err)
      }
    },
    async postDispatches (context, data) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Define the request
        const request = {
          url: config.MASSEUTSENDELSEAPI_BASEURL + 'dispatches?code=zxjm63HhIg6ZqUOE8xdHN8NnJmYh9ocBeFMXVxeBjYVFHEjI9amBFw==',
          method: 'post',
          data,
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }
        // Set the loading modal
        context.commit('setLoadingModal', {
          title: 'Lagrer',
          message: 'Dette kan ta noen sekunder'
        })
        // Make the request
        await axios.request(request)
        // Clear the loading modal
        context.commit('resetLoadingModal')
        context.dispatch('getDispatches')
        return Promise.resolve()
      } catch (err) {
        context.commit('resetLoadingModal')
        context.commit('setModalError', err)
        return Promise.reject(err)
      }
    },
    async editDispatches (context, data) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Define the request
        const request = {
          url: config.MASSEUTSENDELSEAPI_BASEURL + 'dispatches/' + data._id + '?code=SejmUBQQsdqaduLS0mIBR3MFluZTGdyvxCVkZJibQ6J/bMPaAE4ZqA==',
          method: 'put',
          data,
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }
        // Set the loading modal
        context.commit('setLoadingModal', {
          title: 'Lagrer',
          message: 'Dette kan ta noen sekunder'
        })
        // Make the request
        await axios.request(request)
        await context.dispatch('getDispatches')
        // Clear the loading modal
        context.commit('resetLoadingModal')
      } catch (err) {
        context.commit('setModalError', err)
        return Promise.reject(err)
      }
    },
    async downloadBlob (context, options) {
      try {
        // Input validation
        if (!options) throw new AppError('Options ikke satt', 'Du kan ikke laste ned en fil uten å sende med innstillinger')
        if (!options.dispatchId) throw new AppError('options.dispatchId', 'Du kan ikke laste ned en fil uten å sende med dispatchId')
        if (!options.blobId) throw new AppError('options.dispatchId', 'Du kan ikke laste ned en fil uten å sende med blodId')

        // Define the URL to download
        const url = options.url || `${config.MASSEUTSENDELSEAPI_BASEURL}blobs/${options.dispatchId}/${options.blobId}/`

        // Handle authentication
        await handleAuthentication()

        const request = {
          method: 'get',
          url,
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }

        const response = await axios.request(request)
        return response.data
      } catch (err) {
        context.commit('setModalError', err)
        return Promise.reject(err)
      }
    },
    async makeMatrikkelRequest (context, request) {
      try {
        // Input validation
        if (!request) throw new AppError('Request is empty', 'Cannot make an empty matrikkelRequest')

        // Handle authentication
        await handleAuthentication()

        // Set the authorization header
        request.headers.authorization = `Bearer ${Vue.prototype.$accessToken.accessToken}`

        // Make request
        const response = await axios.request(request)

        // Return the response
        return response
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
})

// Export the store
export default store
