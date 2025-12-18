<template>
  <div>
    <v-select
      :value="$props.value"
      @input="(e) => { $emit('input', e.value ); }"
      :items="items"
      label="Sett status for prosjektet"
      :menu-props="{ bottom: true, offsetY: true }"
      :disabled="$props.disabled || $props.value === 'completed' || $props.value === 'inprogress'"
      hide-details
      hide-selected
      outlined
      rounded
      return-object
      single-line
      style="width: 350px; z-index: 1000;"
    > 
      <template item>
        <v-chip :color="selectedItem.color" style="width: 100%;">
          {{ selectedItem.text }}
        </v-chip>
      </template>
      <template #selection>
        <v-chip :color="selectedItem.color" style="width: 100%;">
          {{ selectedItem.text }}
        </v-chip>
      </template>
    </v-select>
    <div v-if="selectedItem && selectedItem.hint">
      <strong>{{selectedItem.hint}}</strong>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DispatchStatusSelect',
  props: {
    value: {
      type: String,
      require: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      items: [
        { text: 'Under Behandling', value: 'notapproved', color: '#E7827E', hint: 'Utsendelsen vil ikke gjennomføres før den er godkjent' },
        { text: 'Godkjent', value: 'approved', color: '#D0C788', hint: 'Utsendelsen låses 00:00 og sendes i morgen mellom 12:00 og 13:00' }
      ]
    }
  },
  computed: {
    selectedItem() {
      let match = this.items.find((i) => i.value === this.$props.value);
      if(match) { return match }

      return { text: 'Ukjent', value: 'unknown', color: '#555555' }
    }
  },
  created() {
    if(this.$props.value === 'completed') {
      this.items = [{ text: 'Fullført', value: 'completed', color: '#91B99F', hint: 'Utsendelsen er gjennomført' }]
    } else if(this.$props.value === 'inprogress') {
      this.items = [{ text: 'Utsendelse Pågår', value: 'inprogress', color: '#E0C38B', hint: 'Utsendelsen kjører nå' }]
    }
  }
}
</script>

<style scoped>
  .v-messages__message {
    font-weight: 900;
    color:firebrick;
  }
</style>