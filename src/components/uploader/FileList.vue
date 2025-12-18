<template>
  <div class="wrapper">
    <table v-if="$props.files" style="width: 100%; border-collapse: collapse;">
      <tbody>
        <tr v-for="(file, i) in $props.files" :key="i" class="tableRow">
          <td style="display: flex; align-items: center; padding: 0.3rem 0.8rem;">
            <file-icon :filename="file.name" style="width: 3rem; cursor: pointer" @click="downloadBlob(file)" />
            <div>
              {{file.name}}
            </div>
            <div style="margin-left: auto; display: flex;">
              <div v-if="file.tags && Array.isArray(file.tags)">
                <v-chip v-for="(tag, i) in file.tags" :key="i" style="margin-right: 0.3rem;">
                  {{tag}}
                </v-chip>
              </div>
              <button :class="btnClasses" icon @click="removeFile(file)" :disabled="$props.disabled"><v-icon>mdi-delete</v-icon></button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import AppError from '../../lib/vtfk-errors/AppError'
import FileIcon from './FileIcon.vue'

export default {
  components: { FileIcon },
  name: 'FileList',
  props: {
    value: {
      type: Array,
    },
    files: {
      type: Array,
      default: () => []
    },
    downloadBaseUrl: {
      type: String
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    btnClasses() {
      let classes = {}
      classes['iconBtn'] = true;
      if(this.$props.disabled) classes['disabled'] = true;
      return classes;
    }
  },
  methods: {
    removeFile(file) {
      if(!file) return;
      if(!confirm(`Er du helt sikker på at du ønsker å fjerne filen ${file.name}?`)) return;

      // Filter out the file
      let tmpFiles = this.$props.value || this.$props.files;
      tmpFiles = tmpFiles.filter((f) => f.name !== file.name);

      // Emit what file that should be removed
      this.$emit('removeFiles', file);
      // Update v-model
      this.$emit('input', tmpFiles);
    },
    async downloadBlob(blob) {
      try {
        if (!blob) return;

        // If the blob don't have data url, and it has been provided a download base url
        if (!blob.dataUrl && this.$props.downloadBaseUrl) {
          const request = {
            method: 'GET'
          }

          if (this.$accessToken?.accessToken) {
            request.headers = {
              authorization: `Bearer ${this.$accessToken.accessToken}`
            }
          }

          const response = await fetch(`${this.$props.downloadBaseUrl}${blob.name}`, request)
          if (!response.ok) {
            const errorData = await response.json();
            console.error('fileList.downloadBlob:', errorData)
            throw new AppError('Kunne ikke laste ned fil', 'Kunne ikke laste ned fil');
          }

          const responseData = await response.json();
          if (responseData?.data) {
            blob.dataUrl = responseData.data;
          }
        }

        // If no blob.dataUrl is provided, emit downloadBlob
        if (!blob.dataUrl) {
          this.$emit('downloadBlob', blob);
          return;
        }

        // Download the blob
        const link = document.createElement('a');
        link.href = blob.dataUrl;
        link.setAttribute('download', blob.name);
        document.body.appendChild(link);
        link.click();
      } catch (err) {
        this.$store.commit('setModalError', err);
      }
    }
  }
}
</script>

<style>
  .wrapper {
    background-color: #BACDD4;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
  }

  .tableRow:nth-child(even) {
    background-color: #D5E1E5;
  }

  .iconBtn {
    width: 1.9rem;
    max-width: 1.9rem!important;
    height: 1.9rem;
    font-size: 0.8rem;
    border-radius: 50%;
    background-color: #FAFAFA;
    box-shadow: 0 3px 1px -2px rgba(0,0,0,.2),0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12)!important;
    transition: background-color 0.1s;
  }

  .iconBtn:hover {
    background-color: #EFEFEF;
  }

  table {
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
  }

  table tr:last-child td:first-child {
    border-bottom-left-radius: 10px;
  }

  table tr:last-child td:last-child {
    border-bottom-right-radius: 10px;
  }

  :disabled {
    cursor: not-allowed;
  }
</style>