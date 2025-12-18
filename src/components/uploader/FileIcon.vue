<template>
  <img :src="icon" style="width: 100%" @click="$emit('click')" alt="" />
</template>

<script>
export default {
  name: 'UploadIcon',
  props: {
    filename: {
      type: String,
      default: 'none'
    }
  },
  computed: {
    icon() {
      if(!this.$props.filename) return require('./fileicons/default.svg');
      if(typeof this.$props.filename !== 'string' || !this.$props.filename.includes('.') || this.$props.filename.endsWith('.')) return require('./fileicons/default.svg');

      let fileExtension = this.$props.filename.substring(this.$props.filename.lastIndexOf('.') + 1);

      try {
        return require(`./fileicons/${fileExtension}.svg`);
      } catch {
        return require('./fileicons/default.svg');
      }
    }
  }
}
</script>

<style>

</style>