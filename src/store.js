/*
  Import and setup dependencies
*/
import Vue from 'vue'
import Vuex from 'vuex'
import AppError from './lib/vtfk-errors/AppError'
import config from '../config'
import merge from 'lodash.merge'
import { removeKeys }  from '@vtfk/utilities'

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
          templateName: req.template.name,
          documentDefinitionId: req.template.documentDefinitionId,
          data
        }
        context.commit('setLoadingModal', {
          title: 'Laster PDF forhåndsvisning',
          message: 'Dette kan ta noen sekunder'
        })

        // Define the request
        const request = {
          method: 'POST',
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          },
          body: JSON.stringify(requestData)
        }

        // Make the request
        const response = await fetch(`${config.MASSEUTSENDELSEAPI_BASEURL}generatePDF`, request)
        if (!response.ok) {
          const errorData = await response.json();
          console.error('generatePDF:', errorData)
          throw new AppError('Kunne ikke opprette forhåndsvisning', 'Kunne ikke opprette forhåndsvisning');
        }

        const responseData = await response.json()
        context.commit('setPreviewPDF', responseData.base64)
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
          method: 'GET',
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }

        // Reset the data
        context.commit('setDispatches', undefined)

        // Make the request
        const response = await fetch(`${config.MASSEUTSENDELSEAPI_BASEURL}dispatches`, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('getDispatches:', errorData)
          throw new AppError('Kunne ikke laste utsendelser', 'Kunne ikke laste utsendelser');
        }

        const responseData = await response.json()

        if (!responseData) {
          throw new AppError('Kunne ikke laste utsendelser', 'Serveren svarte, men finner ikke data i svaret')
        }

        // Commit and return the data
        context.commit('setDispatches', responseData)
        return responseData
      } catch (err) {
        return Promise.reject(err)
      }
    },
    async getBrreg (context, id) {
      try {
        if (!id) {
          throw new AppError('ID cannot be empty, must provide an ID to make the request.')
        }

        const request = {
          method: 'GET',
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }

        // Make the request
        const response = await fetch(`${config.MASSEUTSENDELSEAPI_BASEURL}brreg/${id}`, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('getBrreg:', errorData)
          throw new AppError('Kunne ikke laste data fra Brønnøysundregisteret', 'Kunne ikke laste data fra Brønnøysundregisteret');
        }

        return await response.json()
      } catch (err) {
        return Promise.reject(err)
      }
    },
    async getDispatchesById (context, id) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Define the request
        const request = {
          method: 'GET',
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }

        // Make the request
        const response = await fetch(`${config.MASSEUTSENDELSEAPI_BASEURL}dispatches/${id}`, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('getDispatchesById:', errorData)
          throw new AppError('Kunne ikke laste utsendelse', 'Kunne ikke laste utsendelse');
        }
        
        const responseData = await response.json()

        if (!responseData) {
          throw new AppError('Kunne ikke laste utsendelse', 'Serveren svarte med finner ikke utsendelsen i svaret')
        }

        // Return the data
        return responseData
      } catch (err) {
        console.log('Error opening dispatchById:', id)
        return Promise.reject(err)
      }
    },
    async getTemplates (context) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Define the request
        const request = {
          method: 'GET',
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }

        // Reset the data
        context.commit('setTemplates', undefined)

        // Make the request
        const response = await fetch(`${config.MASSEUTSENDELSEAPI_BASEURL}templates`, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('getTemplates:', errorData)
          throw new AppError('Kunne ikke laste maler', 'Kunne ikke laste maler');
        }

        const responseData = await response.json()

        if (!responseData) {
          throw new AppError('Kunne ikke laste maler', 'Serveren svarte, men finner ingen maler i svaret')
        }

        // Commit and return the data
        context.commit('setTemplates', responseData)
        return responseData
      } catch (err) {
        return Promise.reject(err)
      }
    },
    async postTemplate (context, template) {
      try {
        // Handle authentication
        await handleAuthentication()

        // Strip away some fields that should not be set by this request
        template = removeKeys(template, [
          "createdTimestamp",
          "createdBy",
          "createdById",
          "createdByDepartment",
          "modifiedTimestamp",
          "modifiedBy",
          "modifiedById",
          "modifiedByDepartment"
        ])

        // Define the request
        const request = {
          method: 'POST',
          body: JSON.stringify(template),
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
        const response = await fetch(`${config.MASSEUTSENDELSEAPI_BASEURL}templates`, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('postTemplate:', errorData)
          throw new AppError('Kunne ikke lagre mal', 'Kunne ikke lagre mal');
        }

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

        // Strip away some fields that should not be set by this request.
        template = removeKeys(template, ["createdTimestamp", "createdBy", "createdById", "modifiedTimestamp", "modifiedBy", "modifiedById"])

        // Define the request
        const request = {
          method: 'PUT',
          body: JSON.stringify(template),
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
        const response = await fetch(`${config.MASSEUTSENDELSEAPI_BASEURL}templates/${template._id}`, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('putTemplate:', errorData)
          throw new AppError('Kunne ikke oppdatere mal', 'Kunne ikke oppdatere mal');
        }

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

        // Strip away some fields that should not be set by this request
        data = removeKeys(data, ["validatedArchivenumber", "createdTimestamp", "createdBy", "createdById", "modifiedTimestamp", "modifiedBy", "modifiedById"])

        // Define the request
        const request = {
          method: 'POST',
          body: JSON.stringify(data),
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
        const response = await fetch(`${config.MASSEUTSENDELSEAPI_BASEURL}dispatches`, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('postDispatches:', errorData)
          throw new AppError('Kunne ikke opprette utsendelse', 'Kunne ikke opprette utsendelse');
        }

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

        // Strip away some fields that should not be set by this request
        data = removeKeys(data, [
          "validatedArchivenumber",
          "createdTimestamp",
          "createdBy",
          "createdById",
          "createdByDepartment",
          "modifiedTimestamp",
          "modifiedBy",
          "modifiedById",
          "modifiedByDepartment"
        ])

        // Define the request
        const request = {
          method: 'PUT',
          body: JSON.stringify(data),
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
        const response = await fetch(`${config.MASSEUTSENDELSEAPI_BASEURL}dispatches/${data._id}`, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('editDispatches:', errorData)
          throw new AppError('Kunne ikke oppdatere utsendelse', 'Kunne ikke oppdatere utsendelse');
        }

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
        if (!options) {
          throw new AppError('Options ikke satt', 'Du kan ikke laste ned en fil uten å sende med innstillinger')
        }
        if (!options.dispatchId) {
          throw new AppError('options.dispatchId', 'Du kan ikke laste ned en fil uten å sende med dispatchId')
        }
        if (!options.blobId) {
          throw new AppError('options.dispatchId', 'Du kan ikke laste ned en fil uten å sende med blobId')
        }

        // Define the URL to download
        const url = options.url || `${config.MASSEUTSENDELSEAPI_BASEURL}blobs/${options.dispatchId}/${options.blobId}/`

        // Handle authentication
        await handleAuthentication()

        const request = {
          method: 'GET',
          headers: {
            authorization: `Bearer ${Vue.prototype.$accessToken.accessToken}`
          }
        }

        const response = await fetch(url, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('downloadBlob:', errorData)
          throw new AppError('Kunne ikke laste ned fil', 'Kunne ikke laste ned fil');
        }

        return await response.json()
      } catch (err) {
        context.commit('setModalError', err)
        return Promise.reject(err)
      }
    },
    async makeMatrikkelRequest (context, request) {
      try {
        // Input validation
        if (!request) {
          throw new AppError('Request is empty', 'Cannot make an empty matrikkelRequest')
        }

        // Handle authentication
        await handleAuthentication()

        const url = request.url
        delete request.url

        request.body = JSON.stringify(request.data)
        delete request.data

        // Set the authorization header
        request.headers.authorization = `Bearer ${Vue.prototype.$accessToken.accessToken}`

        // Return the response
        const response = await fetch(url, request)
        if (!response.ok) {
          const errorData = await response.json()
          console.error('makeMatrikkelRequest:', errorData)
          throw new AppError('Kunne ikke hente data fra matrikkelen', 'Kunne ikke hente data fra matrikkelen');
        }

        return await response.json()
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
})

// Export the store
export default store
