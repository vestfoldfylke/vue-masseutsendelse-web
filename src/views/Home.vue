<template>
  <div class="container">
    <!-- Informasjonstekst -->
    <div style="display: flex; align-items: center; flex-direction: column;">
      <div class="typography heading-two header-title">Masseutsendelse</div>
      <p class="typography paragraph header-description text-center" style="margin-top: 1rem;">
        Ett verktøy utviklet for Samferdsel og mobilitet sektoren.<br/>
        Verktøyet lar deg laste opp en polygon-fil, gjøre oppslag i Matrikkelen og varsle alle eiere som befinner seg innenfor polygonet.
      </p>
      <div style="display: flex; flex-direction: row; padding-top: 1rem; gap: 1rem;">
        <div>
          <VTFKButton :passedProps="{ onClick: () => { this.$store.commit('setGuideModal'); }}">Se mer</VTFKButton>
        </div>
        <router-link to="/utsendelser" style="text-decoration: none; color: inherit;">
          <VTFKButton>Alle utsendelser</VTFKButton>
        </router-link>
      </div>
    </div>
    <!-- Innhold -->
    <div style="margin-top: 1rem;">
      <DispatchEditor />
    </div>
  </div>
</template>

<script>
  // VTFK komponenter
  import { Button } from '@vtfk/components'

  // Prosjektkomponenter
  import DispatchEditor from '../components/DispatchEditor.vue';

  export default {
    name: 'HomeView',
    components: {
    'VTFKButton': Button,
    DispatchEditor
  },
  data() {
    return {
      dispatch: undefined,
      uploadedFile: undefined,
      isParsingFile: false,
      isMatrikkelApproved: false,
      isFirstLevelDispatchApproved: false,
      hasLoadedFile: false,
      isContactingMatrikkel: false,
      statItems: [],
      parsedItems: [],
      isTemplateSelectorOpen: true,
      selectedTemplate: undefined,
      templateItems: [
        {
          label: 'Omregulering',
          value: 'omregulering'
        },
        {
          label: 'Bygge vei',
          value: 'vei'
        }
      ],
      error: undefined
    }
  },
  methods: {
  },
  created() {
  }
}
</script>

<style scoped>
  .mt-1 {
    margin-top: 1rem;
  }
</style>