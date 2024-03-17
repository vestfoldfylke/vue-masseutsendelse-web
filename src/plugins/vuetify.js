import Vue from 'vue'
import Vuetify, { VDataTable, VDataTableHeader, VDialog } from 'vuetify/lib'

Vue.use(Vuetify, {
  components: {
    VDataTable,
    VDataTableHeader,
    VDialog
  }
})

export default new Vuetify({
})
