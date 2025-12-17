<template>
  <div class="header">
    <router-link to="/" style="color: inherit; text-decoration: inherit;">
    <div style="display: flex; gap: 0.5rem; align-items: center;">
      <div class="header-part">
        <img :src="require('@/assets/header_logo.svg')" style="height: 3rem" alt="fylkesvåpen" />
      </div>
      <!-- <div class="header-part typography heading-two">
        Masseutsendelse
      </div> -->
    </div>
    </router-link>
    <div style="display: flex; gap: 0.75rem; align-items: center;">
      <div class="header-part typography paragraph">{{$authenticatedUser().name}}</div>
      <div class="header-part swansDown user-image"><VTFKInitialsBadge :firstName="firstName" :lastName="lastName"/></div>
      <div class="header-part">
        <VTFKIconDropdownNav>
          <VTFKIconDropdownNavItem title='Hjelp' :onClick=" () => { this.$store.commit('setGuideModal'); }"/>
          <VTFKIconDropdownNavItem title='Utsendelser' :onClick="() => { route('/utsendelser') }" />
          <VTFKIconDropdownNavItem title='Maler' :onClick="() => { route('/maler') }" />
          <VTFKIconDropdownNavItem title="Logg ut" :onClick="() => { route('/logout') }" />
        </VTFKIconDropdownNav>
      </div>
      </div>
  </div>
</template>

<script>
// VTFK komponenter
import { InitialsBadge, IconDropdownNav, IconDropdownNavItem } from '@vtfk/components'

export default {
  name: 'Header',
  components: {
    'VTFKInitialsBadge': InitialsBadge,
    'VTFKIconDropdownNav': IconDropdownNav,
    'VTFKIconDropdownNavItem': IconDropdownNavItem,
      
  },
  data() {
    return {
    }
  },
  computed: {
    firstName() {
      if(!this.$authenticatedUser() || !this.$authenticatedUser().name.includes(' ')) return undefined;
      return this.$authenticatedUser().name.split(' ')[0];
    },
    lastName() {
      if(!this.firstName) return undefined;
      const parts = this.$authenticatedUser().name.split(' ');
      return parts[parts.length - 1];
    }
  },
  methods: {
    route(route) {
      if(!route) { return }

      this.$router.push(route);
    },
  }
}
</script>

<style scoped>
  .header {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  .header-part {
    display: flex;
    align-items: center;
  }

  @media only screen and (max-width: 500px) {
    .header {
      flex-wrap: wrap;
      justify-content: center;
    }
  }

</style>