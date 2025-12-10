<template>
  <div class="fileContainer">
    <file-icon :filename="file.name" />
    <p class="filename">{{$props.file.name}}</p>
  </div>
</template>

<script>
import FileIcon from './FileIcon.vue';

export default {
  name: 'UploaderFile',
  components: {
    FileIcon
  },
  props: {
    file: {
      type: Object,
      require: true
    }
  }
}
</script>

<style>
  .fileContainer {
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .filename {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow:hidden
  }
</style>