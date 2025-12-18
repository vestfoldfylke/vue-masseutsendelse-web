<template>
  <div>
    <div :class="dropboxClasses" :disabled="$props.disabled" @click="(e) => onAddFileFromButton(e)" @drop.prevent="onAddFileFromDaD" @dragover.prevent="isDropAreaDraggedOver = true" @dragleave.prevent="isDropAreaDraggedOver = false">
      <input type="file" id="fileInput" ref="filesfrombutton" style="display: none" multiple @change="onFilesChanged">
      <div v-if="error !== undefined" class="typography paragraph error" role="alert" aria-live="assertive">
        En feil har skjedd<br>
        {{error}}
      </div>
      <div style="display: flex; align-items: center; flex-direction: column; margin-top: 1rem; margin-bottom: 0.5rem; gap: 1rem">
        <img :src="uploadIcon" style="width: 100px;" alt="upload-icon" />
        Dra og slipp eller trykk i feltet for å laste opp fil
        <VTFKButton v-if="availableFiles.length > 0 && $props.showReset" style="flex: 0 1 auto;" id="resetBtn" :passedProps="{onClick: (e) => {reset(e)}}">Reset</VTFKButton>
      </div>
    </div>
    <!-- File list -->
    <file-list v-if="availableFiles.length > 0 && $props.showList"
      :files="availableFiles"
      :downloadBaseUrl="$props.downloadBaseUrl"
      :disabled="$props.disabled"
      style="margin-top: -1rem; padding-top: 1.5rem"
      @removeFiles="(e) => removeFiles(e)"
      @downloadBlob="(e) => $emit('downloadBlob', e)"
    />
  </div>
</template>

<script>
// VTFK komponenter
import { Button } from '@vtfk/components'
import FileList from './FileList.vue';

// Icons
const uploadIcon = require('@/assets/icons/upload.svg')
const uploadDisabledIcon = require('@/assets/icons/upload-disabled.svg');

/*
  Function
*/
async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();                  // Create the reader
    reader.onloadend = () => resolve(reader.result);  // onLoaded event for the reader
    reader.onerror = (e) => reject(e);                // onError event for the reader
    reader.readAsDataURL(file);                       // Start the reader
  });
}

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();                  // Create the reader
    reader.onloadend = () => resolve(reader.result);  // onLoaded event for the reader
    reader.onerror = (e) => reject(e);                // onError event for the reader
    reader.readAsText(file);                          // Start the reader
  });
}

export default {
  name: 'UploadField',
  components: {
    'VTFKButton': Button,
    FileList
  },
  props: {
    value: {
      type: Array,
    },
    files: {
      type: Array,
    },
    disabled: {
      type: Boolean,
      default: false
    },
    multiple: {
      type: Boolean,
      default: false
    },
    showReset: {
      type: Boolean,
      default: false
    },
    showList: {
      type: Boolean,
      default: true
    },
    downloadBaseUrl: {
      type: String
    },
    convertDataToDataUrl: {
      type: Boolean,
      default: true
    },
    allowedExtensions: {
      type: Array
    },
    maxFilenameLength: {
      type: Number,
      default: 50
    }
  },
  data() {
    return {
      currentStatus: null,
      uploadFieldName: 'file',
      isUploading: true,
      error: undefined,
      isDropAreaDraggedOver: false
    }
  },
  computed: {
    uploadIcon() {
      if(this.$props.disabled) return uploadDisabledIcon;
      return uploadIcon;
    },
    availableFiles() {
      return this.$props.value || this.$props.files || [];
    },
    dropboxClasses() {
      const classes = {}
      if(this.isDropAreaDraggedOver) {
        classes['dropbox'] = true;
        classes['dropbox-dragged-over'] = true;
      } else {
        classes['dropbox'] = true;
        classes['dropbox-dragged-over'] = false;
      }

      classes['disabled'] = this.$props.disabled;

      return classes;
    },
  },
  methods: {
    reset() {
      this.$emit('input', [])
      this.error = undefined;
    },
    async AddFiles(files) {
      if(!files) return;
      if(this.$props.disabled) return;
      // If the files is an FileList, convert it to an array so it can be iterated
      if(files.constructor && files.constructor.name === 'FileList') files = [...files];
      // If files is not an array
      if(!Array.isArray(files)) files = [files];

      let tmpFiles = [];
      // Make a copy of the existing files if any
      if(this.$props.value) tmpFiles = JSON.parse(JSON.stringify(this.$props.value));
      else if(this.$props.files) tmpFiles = JSON.parse(JSON.stringify(this.$props.files));

      let uploadedCounter = 0;
      for(const file of files) {
        // Check if the file already exists, if so should it be overwritten?
        const existingIndex = tmpFiles.findIndex((i) => i.name === file.name);
        if(existingIndex > -1 && !confirm(`The file ${file.name} already exist, do you want to overwrite?`)) continue;

        if(file.name.length > this.$props.maxFilenameLength) {
          alert(`Filename cannot be longer than ${this.$props.maxFilenameLength} characters`);
          continue;
        }

        // Check if the filetype is an allowed file extension
        if(this.$props.allowedExtensions && Array.isArray(this.$props.allowedExtensions)) {
          const lowerCaseAllowedExtensions = this.$props.allowedExtensions.map((ext) => ext.toLowerCase())
          if(!file.name.includes('.') || !lowerCaseAllowedExtensions.includes(file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase())) {
            alert(`${file.name} is not an allowed filetype`);
            continue;
          }
        }

        // Read the file
        let data = '';
        if(this.$props.convertDataToDataUrl) data = await readFileAsDataURL(file);
        else data = await readFileAsText(file);

        const fileObject = {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          lastModifiedDate: file.lastModifiedDate,
          data: data,
        }

        //16 000 000 = 16mb 
        const allowedSize = 16000000
        let totalFileSize = 0
        //Check if one single file is bigger than the allowed filesize.
        if(fileObject.size > allowedSize) {
          alert(`Navn: ${fileObject.name}\nStørrelse: ${Math.round(fileObject.size/1000000)}mb\n\nFilen er for stor, filen kan ikke være større enn ${Math.round(allowedSize/1000000)}`)
        } else {
          //Check if the total filesize of the files added is bigger than the allowed filesize
          tmpFiles.forEach(file => {
            totalFileSize = file.size + totalFileSize
          })
          if(totalFileSize + fileObject.size > allowedSize) {
            alert(`Størrelsen på filene du har lastet opp er for stor.\n\nDu har lastet opp: ${Math.round(totalFileSize/1000000)} mb av ${Math.round(allowedSize/1000000)} mb \n\nFilen du prøver å laste opp er ${Math.round(file.size/1000000)} mb \n\nOm du ønsker å laste opp flere filer bør du komprimere filene du alt har lastet opp.`)
          } else {
            if(existingIndex > -1) tmpFiles[existingIndex] = fileObject;
            else tmpFiles.push(fileObject);
            uploadedCounter++;
          }
        }
      }
      // Reset dragged over
      this.isDropAreaDraggedOver = false;
      // If no files was uploaded, don't emit that it was
      if(uploadedCounter === 0) return;
      // Emit the uploaded filedata to the parent
      this.$emit('uploaded', tmpFiles);
      // Update the v-model
      this.$emit('input', tmpFiles);
      this.$emit('changed', tmpFiles);
    },
    onAddFileFromButton(e) {
      if(!e) { return; }
      if(!e.target) { return;}
      if(e.target.id === 'resetBtn' || e.target.id === 'fileInput') { return; }
      if(this.$props.disabled) return;
      // Find input and click it to start the file upload
      let input = document.getElementById('fileInput');
      if(input) {
        input.click();
      }
    },
    onAddFileFromDaD(e) {
    // this.isDropAreaDraggedOver = false;
      if(!e) { return; }
      if(!e.dataTransfer) { return;}
      if(!e.dataTransfer.files) { return;}
      if(this.$props.disabled) return;

      this.AddFiles(e.dataTransfer.files);
    },
    onFilesChanged(e) {
      if(!e) { return; }
      if(!e.target) { return;}
      if(!e.target.files) { return;}
      if(this.$props.disabled) return;

      this.AddFiles(e.target.files);
    },
    removeFiles(files) {
      if(!files) return;
      if(this.$props.disabled) return;
      if(!Array.isArray(files)) { files = [files]; }

      let idsToRemove = files.map((f) => f.name);

      let currentFiles = this.$props.value || this.files;

      let newFiles = currentFiles.filter((f) => !idsToRemove.includes(f.name));

      this.$emit('removeFiles', files);
      this.$emit('input', newFiles);
      this.$emit('changed', newFiles);
    }
  }
}

</script>

<style scoped>
  .dropbox {
    outline: 2px dashed grey; /* dash box */
    outline-offset: -10px;
    background: #D1EAE9;
    color: dimgray;
    padding: 10px 10px;
    min-height: 200px; 
    position: relative;
    cursor: pointer;
    border-radius: 20px;
    display: flex;
    justify-content: center;
    box-shadow: 0 1px 5px -1px #888888;
  }

  .dropbox.disabled {
    background-color: rgb(245, 245, 245);
  }

  .dropbox-dragged-over {
    background: lightblue;
    outline-color: aliceblue;
  }

  .dropbox p {
    font-size: 1.2em;
    text-align: center;
    padding: 50px 0;
  }

  .filesList {
    display: flex;
    gap: 1rem;
  }

  .disabled {
    cursor: not-allowed!important;
  }
</style>