<template>
  <div id="app" data-app>
    <v-app>
      <header v-if="this.$authenticatedUser()">
        <div class="container">
          <Header />
        </div>
      </header>
      <main style="height: 100%;">
        <router-view>
        </router-view>
      </main>
      <!-- Modals -->
      <ErrorModal v-if="$store.state.modalError" :error="$store.state.modalError" @close="$store.commit('resetModalError')" />
      <LoadingModal v-if="$store.state.loadingModal" :title="$store.state.loadingModal.title" :message="$store.state.loadingModal.message" :submessage="$store.state.loadingModal.submessage" :subsubmessage="$store.state.loadingModal.subsubmessage" @close="$store.commit('resetLoadingModal')" />
      <GuideModal v-if="$store.state.isShowGuideModal" />
      <VTFKPDFPreviewModal :open="$store.state.previewPDFBase64 !== undefined" :base64="$store.state.previewPDFBase64" title='Lukk modal' :passedProps="{ onDismiss: () => { $store.commit('setPreviewPDF', undefined) }}"/>
      <v-dialog
        v-if="$store.state.loading"
        :value="true"
        width="40%"
        persistent
      >
        <v-card style="padding-top: 2rem">
          <v-card-text>
            <loading :title="$store.state.loading.title" :message="$store.state.loading.message" />
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-app>
  </div>
</template>

<script>
// Project components
import Header from './components/Header.vue'
import GuideModal from './components/GuideModal.vue';
import LoadingModal from './components/modals/LoadingModal.vue';

// VTFK Component
import { PDFPreviewModal } from '@vtfk/components';
import Loading from './components/Loading.vue';

export default {
  name: 'App',
  components: {
    Header,
    GuideModal,
    'VTFKPDFPreviewModal': PDFPreviewModal,
    Loading,
    LoadingModal
  },
  computed: {
    authenticatedUser() {
      const users = this.$msal.getAllAccounts();
      if(users.length === 0) return undefined;
      else return users[0];
    },
  }
}

</script>

<style>
  :root {
    --side-padding: 4rem;
  } 

  #app {
    width: 100vw;
    height: 100vh;
    /* text-align: center; */
    background: rgba(190,218,202,.3);
    overflow: hidden;
    overflow-y: auto;
  }

  .container {
    padding-top: 4rem;
    padding-left: 1rem;
    padding-right: 1rem;
    max-width: 1200px!important;
    margin: 0 auto;
  }

  .center-content {
    width: 100%;
    text-align:center;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }

  .text-center {
    text-align: center;
  }

  .centered {
    margin: 0 auto;
  }

  .shadow {
    box-shadow: 0 1px 5px 1px #888888;
  }

  .mt-1 {
    margin-top: 1rem;
  }

  .centeredColumn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .required {
    color: red;
  }
</style>
