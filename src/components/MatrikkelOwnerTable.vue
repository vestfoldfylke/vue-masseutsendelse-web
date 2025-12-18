<template>
  <VDataTable class="shadow" width="100%" style="width: 100%;" :headers="ownerTableHeaders" :items="$props.items" item-key="id" :items-per-page="10" :show-expand="true">
    <template v-slot:[`item._type`]="{ item }">
      <div v-if="item._type">
        <div v-if="item._type.toLowerCase().includes('juridisk')">
          🏢 Juridisk 
        </div>
        <div v-else>
          🏠 Privat 
        </div>
      </div>
    </template>
    <template v-slot:[`item.ownershipCount`]="{ item }">
      {{item.ownerships.length}}
    </template>
    <template v-slot:[`item.postadresse`]="{ item }">
      {{getPostAddress(item)}}
    </template>
    <template v-slot:[`item.exclusionReason`]="{ item }">
      <v-text-field v-if="!item.isHardExcluded" v-model="item.exclusionReason" />
      <div v-else>{{item.exclusionReason}}</div>
    </template>
    <template v-slot:[`item.actions`]="{ item }">
      <v-btn 
        v-if="$props.type === 'included'"
        icon
        :disabled="$props.disableinputs"
        @click="excludeOwner(item)"
      >
        <v-icon>mdi-minus-circle-outline</v-icon>
      </v-btn>
      <v-btn 
        v-if="$props.type === 'excluded'"
        :disabled="$props.disableinputs || item.isHardExcluded"
        icon
        @click="includeOwner(item);"
      >
        <v-icon>mdi-plus-circle-outline</v-icon>
      </v-btn>
    </template>
    <template v-slot:expanded-item="{ headers, item }">
      <td :colspan="headers.length" style="padding: 1rem 1rem;">
        <div style="text-align: left; justify-self: start;">
          <span v-if="item._type.toLowerCase().includes('juridisk')">Organisasjonsnummer: {{item.nummer}}</span>
          <span v-else>Personnummer: {{item.nummer}}</span>
        </div>
        <h2>Eierforhold</h2>
        <VDataTable :headers="ownershipHeaders" :items="item.ownerships" item-key="id" :hide-default-footer="true">
          <template v-slot:[`item.adresse`]="{ item }">
            <div v-if="item.eier && item.eier.postadresse">
              <div v-if="item.eier.postadresse.adresselinje1">{{item.eier.postadresse.adresselinje1}}</div>
              <div v-if="item.eier.postadresse.adresselinje2">{{item.eier.postadresse.adresselinje2}}</div>
              <div v-if="item.eier.postadresse.adresselinje3">{{item.eier.postadresse.adresselinje3}}</div>
              <div v-if="item.eier.postadresse.adresselinje4">{{item.eier.postadresse.adresselinje4}}</div>
              <div v-if="item.eier.postadresse.adresselinje5">{{item.eier.postadresse.adresselinje5}}</div>
            </div>
          </template>
          <template v-slot:[`item.andel`]="{ item }">
            <div v-if="item.andel && item.andel.teller && item.andel.nevner">
              {{item.andel.teller}} / {{item.andel.nevner}} ({{(item.andel.teller / item.andel.nevner) * 100}}%)
            </div>
          </template>
        </VDataTable>
      </td>
    </template>
  </VDataTable>
</template>

<script>
  export default {
    name: 'MatrikkelOwnerTable',
    props: {
      type: {
        type: String,
        default: 'included'
      },
      items: {
        type: Array
      },
      disableinputs: {
        type: Boolean,
        default: false
      },
      'item-key': {
        type: [String, Number],
        default: 'id'
      }
    },
    data() {
      return {
        tableHeader: [
          {
            text: 'Navn',
            value: 'navn'
          },
          {
            text: 'Type',
            value: '_type'
          },
          {
            text: 'Antall eierskap',
            value: 'ownershipCount'
          },
          {
            text: 'Postadresse',
            value: 'postadresse'
          },
          {
            text: 'Handlinger',
            value: 'actions'
          }
        ],
        ownershipHeaders: [
          {
            text: 'Bruksnavn',
            value: 'unit.bruksnavn'
          },
          {
            text: 'Fra dato',
            value: 'datoFra'
          },
          {
            text: 'Kommune',
            value: 'unit.matrikkelnummer.kommuneId'
          },
          {
            text: 'Gnr',
            value: 'unit.matrikkelnummer.gardsnummer'
          },
          {
            text: 'Bnr',
            value: 'unit.matrikkelnummer.bruksnummer'
          },
          {
            text: 'Fnr',
            value: 'unit.matrikkelnummer.festenummer'
          },
          {
            text: 'Type',
            value: '_type'
          },
          {
            text: 'Andel',
            value: 'andel'
          }
        ]
      }
    },
    computed: {
      ownerTableHeaders() {
        if(this.$props.type === 'included') {
          return [
            {
              text: 'Navn',
              value: 'navn'
            },
            {
              text: 'Type',
              value: '_type'
            },
            {
              text: 'Antall eierskap',
              value: 'ownershipCount'
            },
            {
              text: 'Postadresse',
              value: 'postadresse'
            },
            {
              text: 'Handlinger',
              value: 'actions'
            }
          ]
        } else {
          return [
            {
              text: 'Navn',
              value: 'navn'
            },
            {
              text: 'Type',
              value: '_type'
            },
            {
              text: 'Antall eierskap',
              value: 'ownershipCount'
            },
            {
              text: 'Ekskluderingsgrunn',
              value: 'exclusionReason'
            },
            {
              text: 'Handlinger',
              value: 'actions'
            }
          ]
        }
      }
    },
    methods: {
      getPostAddress(person) {
        let address = '';

        if(person.dsf !== undefined) {
          address += `${person.dsf.ADR} ${person.dsf.POSTN} ${person.dsf.POSTS}`
        } else if(person.brreg && person.brreg.postadresse) {
          address += `${person.brreg.postadresse.adresse} ${person.brreg.postadresse.postnummer} ${person.brreg.postadresse.poststed}`
        } else {
          if(person.postadresse.adresselinje) address += person.postadresse.adresselinje + ' ';
          if(person.postadresse.adresselinje1) address += person.postadresse.adresselinje1 + ' ';
          if(person.postadresse.adresselinje2) address += person.postadresse.adresselinje2 + ' ';
          if(person.postadresse.adresselinje3) address += person.postadresse.adresselinje3 + ' ';
          address += '(Matrikkel)'
        }

        return address.trim();
      },
      excludeOwner(owner) {
        if(!owner) return;
        if(!confirm('Er du helt sikker på at eieren skal ekskluderes?')) return;
        this.$emit('excludeOwner', owner)
      },
      includeOwner(owner) {
        if(!owner) return;
        if(!confirm('Er du helt sikker på at eieren skal inkluderes?')) return;
        this.$emit('includeOwner', owner)
      },
    }
  }
</script>

<style>

</style>