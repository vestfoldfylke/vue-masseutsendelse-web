<template>
  <div style="margin-top: 1rem;">
    <!-- Feilmelding -->
    <ErrorField v-if="error" :error="error" v-on:resetClicked="reset(true)" :showResetButton="true" />
    <!-- Loaders -->
    <Loading v-else-if="isLoadingTemplates" title="Laster inn maler" />
    <!-- Fil opplasting -->
    <div v-else-if="mode === 'new' && (!dispatch.polygons || !dispatch.polygons.polygons || dispatch.polygons.polygons.length === 0)">
      <div style="display: flex; flex-direction: column; align-items: stretch;">
        <h2>Last opp polygonet (Tillatte filtyper: '.dxf' og '.kml')</h2>
        <button v-on:click="isHidden = !isHidden">Vis tillatte soner</button>
      </div>
      <h5 v-if="!isHidden">
        <div class="rec">
          <h3>For best resultat anbefales: EUREF89 UTM Sone 32</h3>
        </div>
        <div class="list">
          <ul>
            <li>NGO1948 Gauss-K. Akse 1</li>
            <li>NGO1948 Gauss-K. Akse 2</li>
            <li>NGO1948 Gauss-K. Akse 3</li>
            <li>NGO1948 Gauss-K. Akse 4</li>
            <li>NGO1948 Gauss-K. Akse 5</li>
            <li>NGO1948 Gauss-K. Akse 6</li>
            <li>NGO1948 Gauss-K. Akse 7</li>
            <li>NGO1948 Gauss-K. Akse 8</li>
            <li>NGO1948 Geografisk</li>
          </ul>
          <ul>
            <li>EDM UTM Sone 31</li>
            <li>EDM UTM Sone 32</li>
            <li>EDM UTM Sone 33</li>
            <li>EDM UTM Sone 34</li>
            <li>EDM UTM Sone 35</li>
            <li>EDM UTM Sone 36</li>
          </ul>
          <ul>
            <li>EUREF89 UTM Sone 31</li>
            <li style="background-color: lightgreen;">EUREF89 UTM Sone 32</li>
            <li>EUREF89 UTM Sone 33</li>
            <li>EUREF89 UTM Sone 34</li>
            <li>EUREF89 UTM Sone 35</li>
            <li>EUREF89 UTM Sone 36</li>
          </ul>
          <ul>
            <li>ED50 Geografisk</li>
            <li>Møre A</li>
            <li>Møre B</li>
            <li>EUREF89 Geografisk (Long, lat)</li>
            <li>NGO 56A (Møre)</li>
            <li>NGO 56B (Møre)</li>
          </ul>
        </div>
      </h5>
      <UploadField v-on:uploaded="(files) => parseFiles(files)" :convertDataToDataUrl="false" :allowedExtensions="['dxf', 'kml']"/>
    </div>
    <div v-else-if="isParsingFile" class="centeredColumn">
      <Loading title="Filen behandles" message="Dette kan ta noen sekunder" />
    </div>
    <!-- Kart og matrikkel -->
    <div v-else class="center-content">
      <Map
        style="max-width: 750px"
        :polygons="dispatch.polygons"
        />  
      <div v-if="!isAllRequiredMatrikkelInfoRetreived && !isContactingMatrikkel" class="centeredColumn" style="margin-top: 1rem;">
        <VTFKButton :passedProps="{ onClick: () => getDataFromMatrikkelAPI() }">Hent matrikkelinformasjon</VTFKButton>
        <VTFKButton v-if="!isMatrikkelApproved" :passedProps="{onClick: () => {reset()}}">Angre</VTFKButton>
      </div>
      <div v-else-if="isContactingMatrikkel" class="shadow" style="margin-top: 1rem; padding: 1rem 1rem; border-radius: 20px; background-color: #CFEBF2;">
        <Loading title="Kontakter matrikkelen" :message="matrikkelLoadingMessage" :submessage="matrikkelLoadingSubmessage" :subsubmessage="matrikkelLoadingSubSubMessage"/>
      </div>
      <div v-else class="centeredColumn" style="margin-top: 1rem; width: 100%; max-width: 1200px;">
        <!-- Cards som viser stats om informasjonen -->
        <StatCards v-if="statsCards" :items="statsCards"/>
        <!-- Matrikkel eiere -->
        <div v-if="dispatch.status === 'completed'" style="width: 100%; padding-top: 1rem;">
          <h2 style="margin: 0.5rem">Utsendelsen er ferdigstilt. Eiere og mottakere er fjernet av personvernhensyn. <br> For å se disse kan du trykke på "Åpne Arkiv" og navigere til "Kontakter"</h2>
        </div>
        <div v-else>
          <div v-if="dispatch.owners && Array.isArray(dispatch.owners) && dispatch.owners.length > 0" style="width: 100%;">
            <h2 style="margin: 0.5rem">Eiere / Mottakere</h2>
            <MatrikkelOwnerTable :items="dispatch.owners" :disableinputs="isReadOnly" item-key="id" @excludeOwner="(e) => excludeOwner(e)" />
          </div>
          <div v-if="dispatch.excludedOwners && Array.isArray(dispatch.excludedOwners) && dispatch.excludedOwners.length > 0" style="width: 100%;">
            <h2 style="margin: 0.5rem">Ekskluderte mottakere</h2>
            <MatrikkelOwnerTable type="excluded" :items="dispatch.excludedOwners" :disableinputs="isReadOnly" item-key="id" @includeOwner="(e) => includeOwner(e)" />
          </div>
          <div v-if="dispatch.matrikkelUnitsWithoutOwners && Array.isArray(dispatch.matrikkelUnitsWithoutOwners) && dispatch.matrikkelUnitsWithoutOwners.length > 0" style="width: 100%;">
            <h2 style="margin: 0.5rem">Matrikkelenheter uten eierforhold</h2>
            <v-data-table :headers="missingOwnersTableHeaders" :items="dispatch.matrikkelUnitsWithoutOwners" :items-per-page="5" item-key="id.value" class="shadow" />
          </div>
          <div v-if="dispatch.owners && Array.isArray(dispatch.owners) && dispatch.owners.length > 0" style="width: 100%; margin-top: 1rem;"  class="centeredColumn">
            <VTFKButton :passedProps="{ onClick: () => exportOwners(dispatch.owners, dispatch.excludedOwners, dispatch.matrikkelUnitsWithoutOwners) }">Eksporter eierforhold til CSV</VTFKButton>
          </div>
        </div>
        <div v-if="mode === 'new'" class="centeredColumn">
          <!-- Angreknapp -->
          <VTFKButton v-if="!isMatrikkelApproved" :passedProps="{onClick: () => {reset()}}">Angre</VTFKButton>
          <!-- Aksept for at matrikkel info ser ok ut -->
          <v-checkbox v-if="dispatch.stats.affectedCount" v-model="isMatrikkelApproved" :disabled="isMatrikkelApproved" label="Matrikkelinformasjonen ser korrekt ut"/>
        </div>
      </div>
      <!-- Prosjekt informasjon -->
      <div v-if="isMatrikkelApproved || mode === 'edit'" class="card shadow centeredColumn center-content" style="margin-top: 1rem; width: 100%; max-width: 1200px;">
        <div style="width: 60%" class="centeredColumn">
          <h1>Masseutsendelse</h1>
          <DispatchStatusSelect class="centeredColumn" v-if="mode === 'edit'" v-model="dispatch.status" :disabled="isLocked"/>
          <!-- En input for prosjekt navn, en for prosjekt nr -->
          <v-btn v-if="dispatch.archiveUrl" @click="openUrl(dispatch.archiveUrl)" style="justify-self: flex-start; align-self: start;">
            <v-icon right dark>
              mdi-file-cabinet
            </v-icon>
            Åpne arkiv
          </v-btn>
          <VTextField 
            v-model="dispatch.title"
            :disabled="isReadOnly"
            placeholder="Angi et prosjektnavn"
            hint="Angi et prosjektnavn"
            label="Prosjekt navn"
            :required="true"
            style="max-width: 750px; width: 100%;"
          >
            <template #label>
              <span class="required"><strong>* </strong></span>Prosjektnavn
            </template>
          </VTextField>
          <VTextField 
            v-model="dispatch.projectnumber"
            :disabled="isReadOnly"
            placeholder="Angi et nummer"
            hint="Angi et nummer"
            label="Prosjekt nummer"
            :required="true"
            style="max-width: 750px; width: 100%;"
          >
            <template #label>
              <span class="required"><strong>* </strong></span>Prosjektnummer
            </template>
          </VTextField>
          <VTextField 
            v-model="dispatch.archivenumber"
            :disabled="isReadOnly"
            placeholder="Angi et nummer"
            hint="Angi et saksnummer som allerede eksisterer i P360"
            label="P360 saksnummer"
            :required="true"
            style="max-width: 750px; width: 100%;"
          >
            <template #label>
              <span class="required"><strong>* </strong></span>P360 saksnummer
            </template>
          </VTextField>
          <!-- <VTextField
            :value="templateParagraph"
            label="Paragraf"
            placeholder="Hvis utsendelsen skal unntas offentligheten legg inn paragrafen"
            hint="Hvis utsendelsen skal unntas offentligheten legg inn paragrafen"
            :disabled="isReadOnly"
            @input="(e) => updateParagraph(e)"
            style="max-width: 750px; width: 100%;"
          > 
          </VTextField>-->
          <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; width: 100%; max-width: 750px;">
            <VSelect
              label="Velg mal"
              placeholder="Velg mal"
              :disabled="isReadOnly"
              :value="getMatchingTemplate()"
              :items="this.templates"
              item-text="name"
              item-value="_id"
              return-object
              @change="(e) => onTemplateChanged(e)" 
              style="max-width: 750px; width: 100%;"
            />
            <VTFKButton v-if="dispatch.template && dispatch.template._id" :disabled="isReadOnly" :passedProps="{onClick: () => {onRemoveTemplate()}}" size="small" style="min-width: 200px;">Fjern mal</VTFKButton>
          </div>
          <div v-if="selectedTemplateSchema && selectedTemplateSchema.properties && Object.keys(selectedTemplateSchema.properties).length > 0" style="max-width: 750px; width: 100%;">
            <h2>Flettefelter</h2>
            <SchemaFields
              v-model="dispatch.template.data"
              :schema="selectedTemplateSchema"
              :disabled="isReadOnly"
              @changed="onTemplateDataChanged()"
            />
          </div>
          <h3 style="margin-bottom: 0.2rem">Vedlegg</h3>
          <h5 style="margin-bottom: 0.2rem">NB! Filene kan ikke være større enn 16mb tilsammen.</h5>
          <upload-field
            v-model="dispatch.attachments"
            :disabled="isReadOnly" style="width: 100%"
            :downloadBaseUrl="`${$config.MASSEUTSENDELSEAPI_BASEURL}blobs/${dispatch._id}/`"
            :allowedExtensions="['pdf', 'xlsx', 'xls', 'rtf', 'msg', 'ppt', 'pptx', 'docx', 'doc', 'png', 'jpg', 'jpeg']"
            @changed="() => onAttachmentsChanged()"
          />
          <div class="centeredColumn" style="margin-top: 1rem">
            <VTFKButton
              class="mt-1"
              :disabled="!dispatch.template || dispatch.template.template === undefined || !isRequiredTemplateDataFilledIn"
              :passedProps="{onClick: () => { previewPDF() }}">Se forhåndsvisning
            </VTFKButton>
          </div>
          <div v-if="mode === 'new'" class="centeredColumn" style="margin-top: 2rem">
            <v-checkbox v-model="isDispatchApproved" :label="'Følgende informasjon skal sendes ut til ' + dispatch.owners.length + ' mottakere'" />
          </div>
          <div style="display: flex; justify-content: center; gap: 0.5rem; width: 100%;">
            <VTFKButton
              style="margin-top: 1rem;"
              :disabled="!isReadyToSave"
              type='secondary' size='small'
              :passedProps="{onClick: () => { saveOrEditDispatch(); }}"
            >
              <span v-if="mode === 'new'">Send til godkjenning</span>
              <span v-else>Lagre</span>
            </VTFKButton>
            <VTFKButton v-if="mode === 'new'"
              style="margin-top: 1rem;"
              type='secondary' size='small'
              :passedProps="{onClick: () => {reset()}}"
            >Start på nytt
            </VTFKButton>
            <VTFKButton v-else
              style="margin-top: 1rem;"
              type='secondary' size='small'
              :passedProps="{onClick: () => {$emit('close')}}"
            >Lukk
            </VTFKButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  /*
    Import dependencies
  */
  // VTFK komponenter
  import { Button } from '@vtfk/components'

  // Prosjektkomponenter
  import UploadField from './uploader/UploadField.vue'
  import Map from '../components/Map.vue'
  import StatCards from '../components/StatCards.vue'
  import Loading from './Loading.vue'
  import MatrikkelOwnerTable from '../components/MatrikkelOwnerTable.vue';
  import DispatchStatusSelect from '../components/DispatchStatusSelect.vue';
  import SchemaFields from '../components/SchemaFields.vue';

  // Dependencies
  import MatrikkelProxyClient from '../lib/matrikkelProxyClient'
  import Sjablong from '@vtfk/sjablong';
  import merge from 'lodash.merge'
  import pick from 'lodash.pick';
  import PolyParser from '../lib/polyparser/polyparser';
  import exportFromJSON from 'export-from-json'
 
  // Config
  import config from '../../config';

  // Custom error class
  import AppError from '../lib/vtfk-errors/AppError';

  export default {
    name: 'dispatchEditor',
    components: {
      'VTFKButton': Button,
      UploadField,
      Map,
      StatCards,
      MatrikkelOwnerTable,
      DispatchStatusSelect,
      SchemaFields,
      Loading,
    },
    props: {
      dispatchObject: {
        type: Object
      }
    },
    data() {
      return {
        /*
          State
        */
        // Error object - This has draw precedence over everything else in this component
        error: undefined,
        // The new or edited dispatch object
        dispatch: {
          title: '',
          projectnumber: '',
          archivenumber: '',
          template: {
            _id: undefined,
            version: null,
            name: undefined,
            description:undefined,
            documentData: {},
            data: undefined,
            template: undefined
          },
          attachments: [],
          owners: [],
          excludedOwners: [],
          matrikkelUnitsWithoutOwners: [],
          stats: {
            affectedCount: null,
            area: null,
            totalOwners: null,
            privateOwners: null,
            businessOwners: null,
            units: []
          },
          polygons: {
            ESPG: '',
            coordinatesystem: '',
            filename: '',
            area: null,
            extremes: {
              north: undefined,
              west: undefined,
              east: undefined,
              south: undefined,
              center: undefined
            },
            polygons: [],
          }
        },
        missingOwnersTableHeaders: [
          {
            text: 'Bruksnavn',
            value: 'bruksnavn'
          },
          {
            text: 'Type',
            value: '_type'
          },
          {
            text: 'Kommune',
            value: 'matrikkelnummer.kommuneId'
          },
          {
            text: 'Gnr',
            value: 'matrikkelnummer.gardsnummer'
          },
          {
            text: 'Bnr',
            value: 'matrikkelnummer.bruksnummer'
          },
          {
            text: 'Fnr',
            value: 'matrikkelnummer.festenummer'
          },
          {
            text: 'Etableringsdato',
            value: 'etableringsdato'
          }
        ],
        // MatrikkelUnits where no owners are specified
        matrikkelUnitsWithoutOwners: [],
        // Ownerships where owner id is empty
        ownershipsWithoutOwnerId: [],
        // The initial state of the dispatch (Used for not deactivating the save button when approving)
        initialDispatchStatus: undefined,
        // The file provided by the file uploader
        uploadedFile: undefined,
        // The templates received from the API
        templates: [],
        // The selected template in the template picker
        selectedTemplate: undefined,
        // The generated schema after picking a template
        selectedTemplateSchema: undefined,
        matrikkelLoadingMessage: '',
        matrikkelLoadingSubmessage: '',
        matrikkelLoadingSubSubMessage: '',
        /*
          Boolean state
        */
        // Are templates currently being loaded?
        isLoadingTemplates: true,
        // Is the file currently being parsed?
        isParsingFile: false,
        // Is the matrikkel information approved?
        isMatrikkelApproved: false,
        // Has all required template-data been filled in?
        isRequiredTemplateDataFilledIn: false,
        // Is the matrikkel API currently being contacted?
        isContactingMatrikkel: false,
        // Is the dispatch approved to be sent inn?
        isDispatchApproved: false,
        // Show valid zones
        isHidden : true
      }
    },
    computed: {
      isAllRequiredMatrikkelInfoRetreived() {
        const m = this.dispatch.stats;
        return m.affectedCount !== null && m.totalOwners !== null;
        
      },
      mode() {
        if(!this.dispatch || this.dispatch._id === undefined) { return 'new'; }
        return 'edit';
      },
      isLocked() {
        return this.dispatch && (this.dispatch.status === 'inprogress' || this.dispatch.status === 'completed');
        
      },
      isReadOnly() {
        if(this.isLocked) return true;
        if(this.initialDispatchStatus === 'notapproved') return false;
        return this.dispatch && this.dispatch.status === 'approved';
        
      },
      isReadyToSave() {
        if(this.isReadOnly) return false;
        if(!this.isRequiredTemplateDataFilledIn || !this.dispatch.title || !this.dispatch.projectnumber || !this.dispatch.archivenumber) return false;
        if((!this.dispatch.template || !this.dispatch.template._id) && (!this.dispatch.attachments || !Array.isArray(this.dispatch.attachments) || this.dispatch.attachments.length === 0)) return false;
        if(this.mode === 'new' && (!this.isDispatchApproved || !this.isMatrikkelApproved)) return false;
        return true;
      },
      statsCards() {
        if(!this.dispatch.stats) return undefined;
        
        let cards = [];
        if(this.dispatch.stats.affectedCount) cards.push({ text: 'Enheter', value: this.dispatch.stats.affectedCount });
        if(this.dispatch.stats.totalOwners ) cards.push({ text: 'Alle eiere', value: this.dispatch.stats.totalOwners });
        if(this.dispatch.stats.businessOwners) cards.push({ text: 'Juridiske eiere', value: this.dispatch.stats.businessOwners });
        if(this.dispatch.stats.privateOwners) cards.push({ text: 'Private eiere', value: this.dispatch.stats.privateOwners });

        return cards;
      },
      templateParagraph() {
        // Not the pretties solution, but just had to get it done
        return this.dispatch.template?.data?.info?.paragraph || undefined
      }
    },
    methods: {
      reInitialState() {
        return {
            dispatch: {
                title: '',
                projectnumber: '',
                archivenumber: '',
                template: {
                  _id: undefined,
                  version: null,
                  name: undefined,
                  description:undefined,
                  documentData: {},
                  data: undefined,
                  template: undefined
                },
                matrikkelEnheter: undefined,
                owners: [],
                excludeOwners: [],
                matrikkelUnitsWithoutOwners: [],
                stats: {
                  affectedCount: null,
                  area: null,
                  totalOwners: null,
                  privateOwners: null,
                  businessOwners: null,
                  units: []
                },
                polygons: {
                  EPSG: '',
                  polygons: [],
                  extremes: {
                    north: undefined,
                    west: undefined,
                    east: undefined,
                    south: undefined,
                    center: undefined
                  },
                }
              },
              // The file provided by the file uploader
              uploadedFile: undefined,
              // The templates received from the API
              // Templates will not reload if you press the "Angre" or "Start på nytt" button, 
              // therefore we will not reset the templates array.
              // templates: [], 
              // The selected template in the template picker
              selectedTemplate: undefined,
              // The generated schema after picking a template
              selectedTemplateSchema: undefined,
              /*
                Boolean state
              */
              // Are templates currently being loaded?
              // When we reInitialState the state, isLoadingTemplates = false. 
              isLoadingTemplates: false,
              // Is the file currently being parsed?
              isParsingFile: false,
              // Is the matrikkel information approved?
              isMatrikkelApproved: false,
              // Has all required template-data been filled in?
              isRequiredTemplateDataFilledIn: false,
              // Is the matrikkel API currently being contacted?
              isContactingMatrikkel: false,
              // Is the dispatch approved to be sent inn?
              isDispatchApproved: false,
        }
      },
      updateParagraph(text) {
        if(!this.dispatch.template.data) this.dispatch.template.data = {};
        if(!this.dispatch.template.data.info) this.dispatch.template.data.info = {};
        this.dispatch.template.data.info.paragraph = text;
      },
      reset(force = false) {
        // Validation
        if(force === false && !confirm('Er du helt sikker på at du vil starte på nytt?')) return;

        // Set the data back to the baseline
        Object.assign(this.$data, this.reInitialState());

        // Action states
        this.state = 'initial';
        this.isParsingFile = false;
        this.isContactingMatrikkel = false;

        // Data
        this.uploadedFile = undefined;
        this.error = undefined;
      },
      openUrl(url) {
        if(!url) return;
        window.open(url, '_blank');
      },
      async getDataFromMatrikkelAPI() {
        try {
          /*
            Initialiser
          */
          this.isContactingMatrikkel = true;
          let matrikkelClient = new MatrikkelProxyClient();
          let totalVerticesCount = 0;
          this.dispatch.polygons.polygons.forEach((p) => totalVerticesCount += p.vertices.length)
          /*
            Hent MatrikkelEnhetIDer som finnes innenfor polygonet
          */
          this.matrikkelLoadingMessage = 'Innhenter alle enhets-ider innenfor polygonene'
          this.matrikkelLoadingSubmessage = `Spør om ${this.dispatch.polygons.polygons.length} polygoner med ${totalVerticesCount} vertiser`
          let matrikkelEnhetIds = [];
          let ids
          for (const polygon of this.dispatch.polygons.polygons) {
            ids = await matrikkelClient.getMatrikkelEnheterFromPolygon(polygon.vertices, polygon.EPSG, { query: { flatten: true, metadata: false } });
            // Add any ids that don't already exists
            for(const id of ids.units) {
              if(!matrikkelEnhetIds.includes(id)) matrikkelEnhetIds.push(id);
            }
          }
          if(!matrikkelEnhetIds || matrikkelEnhetIds.length === 0) {
            throw new AppError('Ingen MatrikkelIDer funnet', 'Vi klarte ikke å finne noen matrikkelinformasjon innenfor dette polygonet');
          }

          /*
            Create batches of the id's and retreive data for each batch
          */
          const batchSize = 100;
          const batches = matrikkelEnhetIds.reduce((resultArray, item, index) => { 
            const chunkIndex = Math.floor(index/batchSize)
            if(!resultArray[chunkIndex]) {
              resultArray[chunkIndex] = [] // start a new chunk
            }
            resultArray[chunkIndex].push(item)
            return resultArray
          }, [])
          if(!batches || batches.length === 0) throw new AppError('Problemer med å lage jobber', 'Vi klarte ikke å dele matrikkelIDene inn i mindre jobber');

          let batchIndex = 0;                 // Keeps track of what bach is currently being worked on
          let retreivedOwnerIds = [];         // Array of all the ownerIds that has already been retreived, used for optimizing not retrieving the same owners multiple times
          let retreivedOwners = [];           // Array that stores all the retreived owners3
          let retreivedMatrikkelUnits = [];   // Matrikkel
          for(const batch of batches) {
            this.matrikkelLoadingMessage = `Utfører jobb ${batchIndex + 1} av ${batches.length}`

            // Lag ett request for å kontakte store-service for informasjon om IDene
            let matrikkelEnhetRequestItems = [];
            batch.forEach((item) => {
              matrikkelEnhetRequestItems.push({
                type: 'MatrikkelenhetId',
                namespace: 'http://matrikkel.statkart.no/matrikkelapi/wsapi/v1/domain/matrikkelenhet',
                value: item
              })
            })

            console.log(matrikkelEnhetRequestItems)

            // Hent ut data for alle matrikkel enhetene
            this.matrikkelLoadingSubmessage = `Innhenter informasjon om ${batch.length} Matrikkelenheter`;
            let matrikkelEnheter = await matrikkelClient.getStoreItems(matrikkelEnhetRequestItems, ids.koordinatsystemKodeId);
            // matrikkelEnheter = matrikkelEnheter.store[0].return
            if(matrikkelEnheter.store?.[0]['soap:Body']?.return !== undefined) {
              matrikkelEnheter = matrikkelEnheter.store[0]['soap:Body']?.return
            } else{
              matrikkelEnheter = matrikkelEnheter.store[0].return
            }
            // Håndter feil
            if(!matrikkelEnheter || batch.length === 0) {
              throw new AppError('Ingen MatrikkelEnheter funnet', 'Vi klarte ikke å finne noen matrikkelinformasjon for de ' + matrikkelEnhetIds.length + ' idene');
            } else if (batch.length > matrikkelEnheter.length) {
              let deviation = batch.length - matrikkelEnheter.length;
              let notFoundIDs = [];
              matrikkelEnhetIds.forEach((id) => {
                let match = matrikkelEnheter.find((m) => m.id === id);
                if(!match) { notFoundIDs.push(id); }
              })
              throw new AppError('Færre matrikkel enheter er returnert', 'MatrikkelAPIet returnerte ' + deviation + ' færre enheter enn det vi etterspurte \n' + notFoundIDs);
            }
            else if(matrikkelEnheter.length > batch.length) {
              throw new AppError('For mange matrikkelenheter er returnert', 'Vi fant ' + matrikkelEnheter.length + ' IDer, men skulle kun hatt ' + batch.length + '.');
            }

            /*
              Hent ut alle eierforhold innad for MatrikkelEnhetene
            */
            let matrikkelEierforhold = []
            matrikkelEnheter.forEach(enhet => {
              // If the eierforhold is empty
              if(!enhet.eierforhold) {
                this.dispatch.matrikkelUnitsWithoutOwners.push(enhet);
                return;
              }

              // Convert the eierforhold to array if it is just an object
              if(!Array.isArray(enhet.eierforhold)) enhet.eierforhold = [enhet.eierforhold];

              // Remove any owners that does not have an eierId
              let ownershipIdsToRemove = [];
              enhet.eierforhold.forEach((ownership) => {
                if(!ownership.eierId) {
                  this.ownershipsWithoutOwnerId.push(ownership);
                  ownershipIdsToRemove.push(ownership.id);
                }
              })
              enhet.eierforhold = enhet.eierforhold.filter((o) => !ownershipIdsToRemove.includes(o.id))

              // If the ownerships
              if(enhet.eierforhold.length > 0) {
                enhet.eierforhold.forEach((eierforhold) => {
                  matrikkelEierforhold.push(eierforhold)
                })
              } else {
                this.dispatch.matrikkelUnitsWithoutOwners.push(enhet);
              }
              retreivedMatrikkelUnits.push(enhet);
            })

            /*
              Hent ut alle eier-informasjon for hver av eierforholdene
            */
            // Finn all unike eier IDer i alle eierforholdene
            let unikeEierIDer = [];

            matrikkelEierforhold.forEach((eierforhold) => {
              if(!retreivedOwnerIds.find((id) => id === eierforhold.eierId)) {
                unikeEierIDer.push(eierforhold.eierId);
                retreivedOwnerIds.push(eierforhold.eierId);
              }
            })

            // Lag en API request for de forskjellige eierne
            let matrikkelEierRequestItems = [];
            unikeEierIDer.forEach((id) => {
              matrikkelEierRequestItems.push({
                type: 'PersonId',
                namespace: 'http://matrikkel.statkart.no/matrikkelapi/wsapi/v1/domain/person',
                value: id
              })
            })
          
            // Hent ut alle eiere fra Matrikkel API
            this.matrikkelLoadingSubmessage = `Innhenter informasjon om ${unikeEierIDer.length} eiere av ${batch.length} matrikkelenheter`;
            this.matrikkelLoadingSubSubMessage = 'Dette steget tar tid. Matrikkelen, Brønnøysund og Folkeregisteret kontaktes for hver eier'
            let matrikkelEiere = await matrikkelClient.getStoreItems(matrikkelEierRequestItems, ids.koordinatsystemKodeId);
            // console.log(matrikkelEiere)
            if(matrikkelEiere.store[0]['soap:Body']?.return !== undefined) {
              matrikkelEiere = matrikkelEiere.store[0]['soap:Body']?.return
            } else{
              matrikkelEiere = matrikkelEiere.store[0].return
            }
            if(!matrikkelEiere || matrikkelEiere.length === 0) {
              throw new AppError('Ingen eiere er funnet', 'Vi spurte matrikkelen om ' + matrikkelEierRequestItems.length + ' eiere, men fikk ingen tilbake');
            } else if(matrikkelEierRequestItems.length > matrikkelEiere.length) {
              throw new AppError('Ingen eiere er funnet', 'Vi spurte matrikkelen om ' + matrikkelEierRequestItems.length + ' eiere, men fikk kun ' + matrikkelEiere.length + ' tilbake');
            }
            retreivedOwners.push(...matrikkelEiere);
            batchIndex++;
          }

          /*
            Generer ett datasett hvor eiere er først med alle eierforhold under
          */
          let ownerCentric = MatrikkelProxyClient.getMatrikkelEnheterOwnerCentric(retreivedMatrikkelUnits, retreivedOwners);

          /*
            Exclude owner that should not be contacted
          */
          let excludedOwners = [];
          
          // Handle unit without any ownerships, but needs to be contacted.
          let preExcludedUnits = []
          for (const id of config.EXCLUDED_OWNER_IDS) {
            let brreg = await this.$store.dispatch('getBrreg', id)
            let orgObj = {
              brreg: {...brreg},
              _type: 'JuridiskPerson',
              id: (Math.floor(Math.random() * 10000000)).toString(),
              nummer: brreg.organisasjonsnummer,
              forretningsadresse: brreg.forretningsadresse,
              postadresse: brreg?.postadresse,
              navn: brreg.navn,
              exclusionReason: 'Etat uten eierforhold',
              ownerships: []
            }
            preExcludedUnits.push(orgObj)
          }

            // Exclude owners
          for(let owner of ownerCentric) {
            let excludedReason = undefined;
            /*
              AnnenPerson; Andre personer/enheter enn de som kommer fra folkeregisteret/Enhetsregisteret. 
              Identen består av dato + løpe nr., et løpenummer kan også bli tildelt av den kommunen der identen er registrert.
              En "AnnenPerson" kan være av typen: IkkeOppgitt, Aksjeselskap, BoligbyggelagBorettslag, AnsvarligSelskap, Enkeltperson, Fylkeskommunen, AnnenEiendom, Kommunen, LegatStiftelseOL, Bruksrettshaver, Staten, Utenlandsk, AnnenEiertype
            */
            if(owner._type?.toLowerCase().includes('annenperson')) {
              excludedReason = 'Må håndteres manuelt';
              owner.isHardExcluded = true;
            }
            // Manually handle (Adresse sperre) and inaktive persons. 
            if(owner.freg?.kanKontaktes === true) {
                if(owner.freg.status !== 'inaktiv') {
                const illegalGrading = ['fortrolig', 'strengtFortrolig', 'klientadresse']
                if(illegalGrading.includes(owner.freg.bostedsadresse?.adressegradering)) {
                  excludedReason = 'Må håndteres manuelt';
                  owner.isHardExcluded = true;
                }
              } else if(owner.freg.status === 'inaktiv') {
                excludedReason = 'Må håndteres manuelt';
                owner.isHardExcluded = true;
              }
            }
  
            // kanKontaktes from freg is false
            if(owner.freg?.kanKontaktes === false) {
                excludedReason = 'Utvandret/Forsvunnet/Død';
                owner.isHardExcluded = true;
              }

            // Handle manually
            if(owner.manuallyHandle === true || owner.handleManually === true) {
              excludedReason = 'Må håndteres manuelt';
              owner.isHardExcluded = true;
            }

            // // Utvandret
            // if(owner.utvandret) {
            //   excludedReason = 'Utvandret';
            //   owner.isHardExcluded = true;
            // }

            // // Forsvunnet
            // if(owner.forsvunnet) {
            //   excludedReason = 'Forsvunnet';
            //   owner.isHardExcluded = true;
            // }

            // Dead owners
            if((owner.freg?.status === 'doed') || (owner && owner.name && owner.name.includes('DØDSBO'))) {
              excludedReason = 'Død';
              owner.isHardExcluded = true;
            }

            if(config.EXCLUDED_OWNER_IDS && Array.isArray(config.EXCLUDED_OWNER_IDS)) {
              // Pre-excluded person or orgs if they already exist inside the polygon
              if(config.EXCLUDED_OWNER_IDS.includes(owner.nummer)) {
                excludedReason = 'Forhåndsekskludert';
              }

              // Remove orgs that exist inside the polygon from the preExcludedUnits list.
              preExcludedUnits.forEach(function(ex, i) {
                if(ex.nummer === owner.nummer) {
                  if (i > -1) { 
                    preExcludedUnits.splice(i, 1); 
                  }
                }
              })
            }

            if(owner.avviklet) {
              excludedReason = 'Firma er avviklet'
              owner.isHardExcluded = true;
            }

            // Organisasjonen er slettet fra Brønnøysund
            if(owner._type?.toLowerCase().includes('juridisk') && owner.slettetDato) {
              excludedReason = 'Slettet fra Brønnøysund'
              owner.isHardExcluded = true;
            }

            if(owner._type?.toLowerCase().includes('juridisk') && !owner.brreg) {
              excludedReason = 'Finnes ikke i Brønnøysund'
              owner.isHardExcluded = true;
            }

            if(excludedReason) {
              owner.exclusionReason = excludedReason;
              excludedOwners.push(owner);
            }

            if(excludedOwners.length !== 0) {
              let excludedIds = excludedOwners.map((o) => o.nummer);
              ownerCentric = ownerCentric.filter((o) => !excludedIds.includes(o.nummer));
            }
          }

          // preExcludedUnits.forEach(unit => {
          //   excludedOwners.push(unit)
          // })
          
          excludedOwners = excludedOwners.concat(preExcludedUnits)

          // Hent ut juridiske eiere
          let juridiskeEiere = retreivedOwners.filter((e) => e._type.toLowerCase().includes('juridisk'));

          /*
            Handle statistics
          */
          // Assign values to the dispatch object
          this.dispatch.stats.affectedCount = retreivedMatrikkelUnits.length;
          this.dispatch.stats.privateOwners = retreivedOwners.length - juridiskeEiere.length;
          this.dispatch.stats.businessOwners = juridiskeEiere.length;
          this.dispatch.stats.totalOwners = retreivedOwners.length;
          // this.dispatch.stats.area = this.dispatch.polygons.area;

          if(!this.dispatch.matrikkelEnheter) this.dispatch.matrikkelEnheter = [];
          if(!this.dispatch.excludedOwners) this.dispatch.excludedOwners = [];
          this.dispatch.owners.push(...ownerCentric);
          this.dispatch.excludedOwners.push(...excludedOwners);

          this.isContactingMatrikkel = false;
        } catch(err) {
          console.error(err);
          this.error = err;
        }
      },
      excludeOwner(owner) {
        // Add the owner to the excludedOwners array
        if(!this.dispatch.excludedOwners) this.dispatch.excludedOwners = [];
        this.dispatch.excludedOwners.push(owner);
        this.dispatch.excludedOwners = [...this.dispatch.excludedOwners];
        this.$set(this.dispatch, 'excludedOwners', this.dispatch.excludedOwners);
        // Filter away the excluded owner from the owners array
        this.dispatch.owners = this.dispatch.owners.filter((o) => o.id !== owner.id);
        this.dispatch.owners = [...this.dispatch.owners]
        this.$set(this.dispatch, 'owners', this.dispatch.owners);
        // Flip the checkboxes so they will have to be checked again
        this.isDispatchApproved = false;
      },
      includeOwner(owner) {
        // Add the excluded owner
        this.dispatch.owners.push(owner);
        this.dispatch.owners = [...this.dispatch.owners];
        this.$set(this.dispatch, 'owners', this.dispatch.owners);
        // Remove the owner from the excluded array
        this.dispatch.excludedOwners = this.dispatch.excludedOwners.filter((o) => o.id !== owner.id);
        this.dispatch.excludedOwners = [...this.dispatch.excludedOwners];
        this.$set(this.dispatch, 'excludedOwners', this.dispatch.excludedOwners);
        // Flip the checkboxes so they will have to be checked again
        this.isDispatchApproved = false;
      },
      async readFile(file) {
        // Always return a Promise
        return new Promise((resolve, reject) => {
          let content = '';
          const reader = new FileReader();
          // Wait till complete
          reader.onloadend = function(e) {
            content = e.target.result;
            resolve(content);
          };
          // Make sure to handle error states
          reader.onerror = function(e) {
            reject(e);
          };
          reader.readAsText(file);
        });
      },
      async parseFiles(files) {
        try {
          if(!files || !Array.isArray(files) || files.length === 0) return;
          this.uploadedFile = files;
          this.isParsingFile = true;
          let polygons = await PolyParser.parse(files[0], { inverseXY: true });

          // File polygons
          this.$set(this.dispatch, 'polygons', polygons);

          // Set that the file has been parsed
          this.isParsingFile = false;
        } catch (err) {
          console.log('Error');
          console.error(err);
          let error = err;
          if(typeof error === 'string') error = new AppError('Error', error);
          this.error = error;
        }
      },
      async saveOrEditDispatch() {
        // Input validation
        if(!this.isReadyToSave) {
          this.$store.commit('setModalError', new AppError('Kan ikke lagre', 'Det mangler en eller flere felter før du kan lagre'));
          return;
        }
        // User confirmation
        // TODO Sette en timestamp på når utsendelsen vil gå til p360
        if(this.dispatch.status === 'approved'){
          // let totalOwners = 0;
          // if(this.dispatch?.owners && Array.isArray(this.dispatch.owners)) totalOwners = this.dispatch.owners.length;
          // if(this.dispatch.excludedOwners && Array.isArray(this.dispatch.excludedOwners)) totalOwners -= this.dispatch.excludedOwners.length;
          if(!confirm(`Er du helt sikker på at du vil lagre?\n\nStatus vil nå settes til "Godkjent"\nDette betyr at du vil sende ut brev til totalt: ${this.dispatch.owners.length} eiere.\n\nDu vil ha muligheten til å trekke tilbake godkjennelsen frem til 00:00 i dag.\nEtter dette vil masseutsendelsen låses og sendes ut.\nUtsendelsen vil skje påfølgende dag mellom kl 12.00 og kl 13.00.`)) return;
        }
        else{
          if(!confirm('Er du helt sikker på at du vil sende inn?')) return;
        }

        // Make a copy of the dispatch object before sending in
        const postObject = Object.assign(this.dispatch)

        // Remove template if not specified
        if(!this.dispatch.template || !this.dispatch.template._id) delete postObject.template;

        this.$emit('beforeSave');
        this.isLoading = true
        try {
          if(this.mode === 'new') {
            await this.$store.dispatch('postDispatches', postObject);
          } else if (this.mode === 'edit') {
            await this.$store.dispatch('editDispatches', postObject);
          } else {
            throw new AppError('Kunne ikke lagre', 'Klarte ikke å avgjøre hvordan utsendelsen skulle lagres');
          }
          if(this.$route.path && this.$route.path.toLowerCase() !== '/utsendelser') this.$router.push('Utsendelser');
        } catch(err) {
          console.log('Error while saving dispatch');
          console.log(err);
        }
        this.isLoading = false
        this.$emit('saved');
      },
      onTemplateChanged(e) {
        // Generate schema for the selectedTemplate
        const tmp = Buffer.from(e.template, 'base64').toString('utf8');
        this.selectedTemplateSchema = Sjablong.generateSchema(tmp, { requireAll: true })

        // Generate a data object with each of the properties from the schema
        let templateData = Sjablong.createObjectFromSchema(this.selectedTemplateSchema, false);

        // If the template already have data, attempt to overwrite the templateData with them
        if(this.dispatch.template?.data) {
          // Get all the properties that exists in the schema
          const matchingKeys = pick(this.dispatch.template.data, [...Object.keys(templateData), 'info']);
          // Overwrite template data with the matching information in the matching keys
          templateData = merge(templateData, matchingKeys);
        }
        
        // Update the template information
        this.dispatch.template = e
        this.dispatch.template.data = templateData;
        this.selectedTemplate = e;

        // Signal that template data has changed
        this.onTemplateDataChanged();
        this.updateAttachmentTags();
      },
      determineIfTemplateIsOk() {
        if(!this.selectedTemplateSchema || (this.selectedTemplateSchema && this.selectedTemplateSchema.properties && Object.keys(this.selectedTemplateSchema.properties).length === 0)) {
          this.isRequiredTemplateDataFilledIn = true;
        } else {
          try {
            Sjablong.validateData(this.selectedTemplateSchema, this.dispatch.template.data, { requireAll: true });
            this.isRequiredTemplateDataFilledIn = true;
          }
          catch (err) {
            this.isRequiredTemplateDataFilledIn = false;
          }
        }
      },
      onTemplateDataChanged() {
        this.determineIfTemplateIsOk();
      },
      getMatchingTemplate() {
        if(!this.dispatch.template || !this.dispatch.template._id) return undefined;
        if(!this.templates) return undefined;
        
        let match = this.templates.find((t) => t._id === this.dispatch.template._id);

        if(match) return match;
        return undefined;
      },
      onRemoveTemplate() {
        if(!confirm('Er du helt sikker på at du vil fjerne malen?')) return;
        
        this.selectedTemplate = undefined;
        this.selectedTemplateSchema = undefined;
        this.dispatch.template = {};
        this.$set(this.dispatch, 'template', {});
        this.updateAttachmentTags();
      },
      async loadTemplates() {
        this.isLoadingTemplates = true;

        try {
          this.templates = await this.$store.dispatch('getTemplates');
        } catch (err) {
          this.error = err;
          return;
        }

        // Attempt to match template with the dispatch, if applicable
        if(this.dispatch.template?.template) {
          let sameTemplate = this.$store.state.templates.find((t) => t._id === this.dispatch.template._id)
          if(sameTemplate) this.onTemplateChanged(sameTemplate);
          else this.onTemplateChanged(this.dispatch.template);
        }
        
        this.isLoadingTemplates = false;
      },
      updateAttachmentTags() {
        if(!this.dispatch.template?._id && this.dispatch?.attachments?.length) this.dispatch.attachments[0].tags = ['Hoveddokument'];
        else if(this.dispatch.template?._id && this.dispatch?.attachments?.length) this.dispatch.attachments[0].tags = [];
        if(this.dispatch.attachments) this.dispatch.attachments = [...this.dispatch.attachments];
        this.$set(this.dispatch, 'attachments', this.dispatch.attachments);
      },
      onAttachmentsChanged() {
        this.updateAttachmentTags();
      },
      previewPDF() {
        // Input validation
        if(!this.selectedTemplate) {
          alert('Forhåndsvisning kan ikke gjøres når mal ikke er valgt');
          return;
        }

        // Combine data from both the template and the documentTemplate
        let data = merge(this.dispatch.template.data, this.dispatch.template.documentData);

        // Validate that all required data is present
        if(data && Object.keys(data).length > 0) {
          try { Sjablong.validateData(this.selectedTemplateSchema, data, { requireAll: true })}
          catch (err) { console.log(err); return; }
        }

        // Request the PDF preview
        this.$store.dispatch('getPDFPreview', { ...this.dispatch, preview: true })
      },
      getPostAddress(person) {
        let address = '';

        if(person.dsf !== undefined) {
          address += `${person.dsf.ADR} ${person.dsf.POSTN} ${person.dsf.POSTS}`
        } else if(person.brreg && person.brreg.postadresse) {
          address += `${person.brreg.postadresse.adresse} ${person.brreg.postadresse.postnummer} ${person.brreg.postadresse.poststed}`
        } else {
          if(person.postadresse?.adresselinje) address += person.postadresse.adresselinje + ' ';
          if(person.postadresse?.adresselinje1) address += person.postadresse.adresselinje1 + ' ';
          if(person.postadresse?.adresselinje2) address += person.postadresse.adresselinje2 + ' ';
          if(person.postadresse?.adresselinje3) address += person.postadresse.adresselinje3 + ' ';
          address += '(Matrikkel)'
        }

        return address.trim();
      },
      async exportOwners(owners, excluded, without) {
        let arr = []
        // Properties with owners
        owners.forEach(owner => {
          if(owner.ownerships.length === 0) {
            // Handle the manually added orgs
            let owners = {
              tableType: 'Eier/Mottakere - Etat uten eierforhold',
              navn: '',
              type: '',
              antallEierSkap: '', 
              adresse: '',
              bruksnavn: '',
              fraDato: '', 
              kommune: '',
              Gnr: '',
              Bnr: '',
              Fnr: '',
              type_eierforhold: '',
              andel: ''
            }

            owners.navn = owner.navn
            owners.type = owner._type
            owners.antallEierSkap = owner.ownerships.length
            owners.adresse = this.getPostAddress(owner)

            arr.push(owners)
          } else {
            owner.ownerships.forEach(unit => {
              let owners = {
                tableType: 'Eier/Mottakere',
                navn: '',
                type: '',
                antallEierSkap: '', 
                adresse: '',
                bruksnavn: '',
                fraDato: '', 
                kommune: '',
                Gnr: '',
                Bnr: '',
                Fnr: '',
                type_eierforhold: '',
                andel: ''
              }

              owners.navn = owner.navn
              owners.type = owner._type
              owners.antallEierSkap = owner.ownerships.length
              owners.adresse = this.getPostAddress(owner)
            
              owners.bruksnavn = unit.unit.bruksnavn
              owners.fraDato = unit.datoFra
              owners.kommune = unit.kommuneId
              owners.Gnr = unit.unit.matrikkelnummer.gardsnummer
              owners.Bnr = unit.unit.matrikkelnummer.bruksnummer
              owners.Fnr = unit.unit.matrikkelnummer.festenummer
              owners.type_eierforhold = unit._type
              owners.andel = `${unit.andel?.teller}/${unit.andel?.nevner}`

              arr.push(owners)
            })
          }
        })

        // Properties with owners, but they are excluded
        excluded.forEach(owner => {
          if(owner.ownerships.length === 0) {
            // Handle the manually added orgs
            let excluded = {
              tableType: 'Ekskluderte mottakere - Etat uten eierforhold',
              navn: '',
              type: '',
              antallEierSkap: '', 
              adresse: '',
              bruksnavn: '',
              fraDato: '', 
              kommune: '',
              Gnr: '',
              Bnr: '',
              Fnr: '',
              type_eierforhold: '',
              andel: ''
            }

            excluded.navn = owner.navn
            excluded.type = owner._type
            excluded.antallEierSkap = owner.ownerships.length
            excluded.adresse = this.getPostAddress(owner)

            arr.push(excluded)
          } else {
            owner.ownerships.forEach(unit => {
              let excluded = {
                tableType: 'Ekskluderte mottakere',
                navn: '',
                type: '',
                antallEierSkap: '', 
                adresse: '',
                bruksnavn: '',
                fraDato: '',
                kommune: '', 
                Gnr: '',
                Bnr: '',
                Fnr: '',
                type_eierforhold: '',
                andel: ''
              }
            
              excluded.navn = owner.navn
              excluded.type = owner._type
              excluded.antallEierSkap = owner.ownerships.length
              excluded.adresse = this.getPostAddress(owner)
            
              excluded.bruksnavn = unit.unit.bruksnavn
              excluded.fraDato = unit.datoFra
              excluded.kommune = unit.kommuneId
              excluded.Gnr = unit.unit.matrikkelnummer.gardsnummer
              excluded.Bnr = unit.unit.matrikkelnummer.bruksnummer
              excluded.Fnr = unit.unit.matrikkelnummer.festenummer
              excluded.type_eierforhold = unit._type
              excluded.andel = `${unit.andel?.teller}/${unit.andel?.nevner}`

              arr.push(excluded)
            })
          }
        })

        // Properties without owners
        without.forEach(owner => {
          let without = {
            tableType: 'Matrikkelenheter uten eierforhold',
            bruksnavn: '',
            type: '',
            kommune: '',
            Gnr: '',
            Bnr: '',
            Fnr: '',
            etableringsdato: ''
          }

          without.bruksnavn = owner.bruksnavn
          without.type = owner._type
          without.kommune = owner.matrikkelnummer.kommuneId
          without.Gnr = owner.matrikkelnummer.gardsnummer
          without.Bnr = owner.matrikkelnummer.bruksnummer
          without.Fnr = owner.matrikkelnummer.festenummer
          without.etableringsdato = owner.etableringsdato

          arr.push(without)
        })

        const data = arr
        const fileName= `${this.dispatch.title}_Eiere`
        const exportType = exportFromJSON.types.csv
        exportFromJSON({ data, fileName:fileName, exportType: exportType })
      },
    },
    created() {
      if(this.$props.dispatchObject) {
        this.$set(this, 'dispatch', this.$props.dispatchObject)
        this.initialDispatchStatus = this.$props.dispatchObject.status;
      }

      this.onTemplateDataChanged();
      this.loadTemplates();
      this.updateAttachmentTags();
    }
  }
</script>

<style scoped>
  .card {
    width: 100%;
    border-radius: 20px;
    background-color: white;
    min-height: 250px;
    padding: 1rem 1rem;
  }

  .mt-1 {
    margin-top: 1rem;
  }

  .list {
    background-color: #F8F6F0;
    display: flex;
    justify-content: space-around;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom-right-radius: 1rem;
    border-bottom-left-radius: 1rem;
  }

  .rec {
    background-color: #F8F6F0;
    display: flex;
    justify-content: center;
    margin-top: -1rem;
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

  button {
    background-color: #F8F6F0;
    padding: 0.2rem;
    margin-bottom: 0.4rem;
    margin-top: 0.2rem;
    border-radius: 0.3rem;
  }
</style>