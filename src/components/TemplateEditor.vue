<template>
  <ErrorField v-if="error" :error="error" :showResetButton="false" />
  <div v-else style="text-align: left; align-items: flex-start;">
    <h2>Generelt</h2>
    <p>Generell informasjon om malen</p>
    <VTFKTextField
      placeholder="Navn"
      :passedProps="{ onChange: (e) => { activeTemplate.name = e.target.value } }"
      :value="activeTemplate.name"
      style="margin-bottom: 0.5rem;"
    />
    <VTFKTextField
      placeholder="Beskrivelse"
      :passedProps="{ onChange: (e) => { activeTemplate.description = e.target.value } }"
      :value="activeTemplate.description"
      style="margin-bottom: 0.5rem;"
    />
    <div v-if="$props.showDocumentTemplateSelect">
      <h2 style="margin-top: 2rem;">Dokumentmal</h2>
      <p>Dette er dokumentmalen som omberammer denne innholdsmalen</p>
      <p>Her kan du definere verdiene i flettefeltene til hovedmalen</p>
      <VSelect
        v-if="$props.showDocumentTemplateSelect"
        v-model="activeTemplate.documentDefinitionId"
        :items="documentTemplates"
        label="Hovedmal"
        hint="Dette er hovedmalen som omfavner innholdet i denne innholdsmalen"
        persistent-hint
        item-text="label"
        @change="onDocumentTemplateChanged()"
        style="justify-content: flex-start!important;"
      />
      <!-- Dynamic template -->
      <div v-if="mainTemplateSchema">
        <SchemaFields v-model="activeTemplate.documentData" :schema="mainTemplateSchema" @error="(e) => error = e" />
      </div>
    </div>
    <h2 style="margin-top: 2rem;">Innholdsmal</h2>
    <p>Mal for innholdet i masseutsendelsene som skal sendes ut</p>
    <Editor
      :initialValue="activeTemplate.template"
      ref="editor"
      :height="$props.height"
      initialEditType="markdown"
      :options="activeOptions"
      @change="(e) => { onMarkdownChanged(e) }"
      style="margin-top: 1rem;"
    />
    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
      <VTFKButton size="small" :passedProps="{ onClick: () => { onSaveTemplate(); }}">Lagre</VTFKButton>
      <VTFKButton size="small" :passedProps="{ onClick: () => { onPreviewTemplate(); }}">Forhåndsvisning</VTFKButton>
      <VTFKButton v-if="$props.showCloseButton" size="small" type="secondary" :passedProps="{ onClick: () => { close() } }">Lukk</VTFKButton>
    </div>
    <!-- Modals -->
    <VDialog v-if="isShowInsertPlaceholderModal" v-model="isShowInsertPlaceholderModal" width="40%" max-width="750px" height="1000px">
      <insert-template-form v-model="isShowInsertPlaceholderModal" @insert="(e) => insertPlaceholder(e)"/>
    </VDialog>
  </div>
</template>

<script>
import { Editor } from '@toast-ui/vue-editor';
import { Button, TextField } from '@vtfk/components';
import Sjablong from '@vtfk/sjablong';
import SchemaFields from './SchemaFields.vue';
import InsertTemplateForm from './templating/InsertTemplateForm.vue';

export default {
  name: 'TemplateEditor',
  components: {
    Editor,
    'VTFKButton': Button,
    'VTFKTextField': TextField,
    SchemaFields,
    InsertTemplateForm
  },
  props: {
    template: {
      type: Object,
      default: () => { return {} }
    },
    options: {
      type: Object
    },
    hideModeSwitch: {
      type: Boolean,
      default: false
    },
    showCloseButton: {
      type: Boolean,
      default: true
    },
    height: {
      type: String,
      default: '500px'
    },
    showDocumentTemplateSelect: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      error: undefined,
      modalError: undefined,
      isShowInsertPlaceholderModal: false,
      pdfPreview: undefined,
      hasChanged: false,
      activeTemplate: {
        name: undefined,
        description: undefined,
        version: null,
        language: undefined,
        documentDefinitionId: undefined,
        documentData: undefined,
        template: undefined
      },
      activeOptions: undefined,
      defaultOptions: {
        hideModeSwitch: this.$props.hideModeSwitch,
        language: 'no-NB',
        usageStatistics: false,
        frontMatter: true,
        toolbarItems: [
          ['heading', 'bold', 'italic', 'strike'],
          ['hr'],
          ['ul', 'ol', 'indent', 'outdent']
        ]
      },
      documentTemplates: [
        {
          label: 'Brevmal',
          value: 'brevmal',
          schema: {
            type: 'object',
            properties: {
              info: {
                type: 'object',
                properties: {
                  'our-reference': {
                    label: 'Vår referanse',
                    type: 'string'
                  },
                  'your-reference': {
                    label: 'Deres referanse',
                    type: 'string'
                  },
                  paragraph: {
                    label: 'Paragraf',
                    type: 'string',
                    //default: 'Offl. § 13 jf. fvl. §13 (1)',
                  }
                }
              }
            } 
          }
        }
      ]
    }
  },
  computed: {
    mainTemplateSchema() {
      return this.getDocumentTemplateSchema() || undefined;
    },
    mode() {
      if(this.activeTemplate && this.activeTemplate._id) return 'edit';
      return 'new';
    }
  },
  methods: {
    onMarkdownChanged() {
      this.hasChanged = true;
      this.activeTemplate.template = this.$refs.editor.editor.getMarkdown();
      this.$set(this.activeTemplate, 'template', Buffer.from(this.$refs.editor.editor.getMarkdown()).toString('base64'));
      this.$emit('input', this.activeTemplate);
      this.$emit('onMarkdownChanged', this.activeTemplate);
    },
    getDocumentTemplateSchema() {
      // Input validation
      if(!this.documentTemplates) { return undefined; }
      if(!this.activeTemplate.documentDefinitionId) { return undefined; }
      
      // Get the schema
      let template = this.documentTemplates.find((i) => i.value === this.activeTemplate.documentDefinitionId);
      if(!template || !template.schema) { return undefined }

      // Return the schema
      return template.schema;
    },
    onDocumentTemplateChanged() {
      // Get the main template schema
      const schema = this.getDocumentTemplateSchema();
      if(!schema) { return; }

      // Create a default data object
      let defaultData = Sjablong.createObjectFromSchema(schema);
      if(defaultData) this.activeTemplate.data = defaultData;

      // Register the change
      this.onMarkdownChanged();
    },
    onPreviewTemplate() {
      try {
        // Get Markdown from the editor
        const markdown = this.$refs.editor.editor.getMarkdown();
        // Validate the template Markdown
        Sjablong.validateTemplate(markdown);
        // 
        let templateRequest = {
          ...this.activeTemplate,
          template: Buffer.from(this.$refs.editor.editor.getMarkdown()).toString('base64')
        }
        
        // Make the request
        this.$store.dispatch('getPDFPreview', { template: templateRequest, preview: true });
      } catch (err) {
        this.$store.commit('setModalError', err);
      }
    },
    async onSaveTemplate() {
      // Validation
      if(!confirm('Er du helt sikker på at du vil lagre malen?')) return;
      if(this.activeTemplate.template === '' && !confirm('Malen er uten innhold, vil du fortsatt lagre?')) return;
      
      // Validate that the template is valid
      try {
        Sjablong.validateTemplate(this.activeTemplate.template);
      } catch (err) {
        this.$store.commit('setModalError', err);
        return;
      }
      
      // Generate a schema
      const schema = Sjablong.generateSchema(this.activeTemplate.template);
      if(schema) {
        this.activeTemplate.schema = schema;
        this.$set(this.activeTemplate, 'schema', schema);
      }

      // Create a new object from the active template and base64 encode the template-markdown
      let templateRequest = {
        ...this.activeTemplate,
        template: Buffer.from(this.$refs.editor.editor.getMarkdown()).toString('base64')
      }

      try {
        if(this.mode === 'new') {
          await this.$store.dispatch('postTemplate', templateRequest);
        } else {
          await this.$store.dispatch('putTemplate', templateRequest);
        }
      } catch (err) {
        this.$store.commit('setModalError', err);
      }

      this.$emit('saved');
    },
    insertPlaceholder(placeholder) {
      if(!placeholder) { return; }

      let stringified = Sjablong.convertPlaceholderToString(placeholder);

      this.$refs.editor.editor.insertText(stringified);
    },
    close() {
      if(this.hasChanged) {
        if(confirm('Noe er endret, er du sikker på at du vil lukke før du har lagret?')) {
          this.$emit('close');
        }
      }
      this.$emit('close');
    },
  },
  created() {
    try {
      if(!this.$props.showDocumentTemplateSelect) {
        this.activeTemplate.documentDefinitionId = this.documentTemplates[0].value;
      }

      this.activeOptions = this.$props.options || this.defaultOptions;
      this.activeOptions.customHTMLRenderer = {
        text(node) {
          if(!node.literal) return [{ type: 'text', content: '' }]
          let markdown = node.literal;

          // Split markdown on Sjablong entries
          let splitted = markdown.split(Sjablong.regexPatterns.sjablong.brackets);

          let tags = [];
          splitted.forEach((part) => {
            // Check if the part matches the regex
            let match = part.match(Sjablong.regexPatterns.sjablong.brackets);

            if(match) {
              try {
                let parsedPlaceholder = Sjablong.parsePlaceholder(part);
                tags.push(...[
                  { type: 'openTag', tagName: 'span', classNames: ['placeholderChip']},
                  { type: 'text', content: '[' + parsedPlaceholder.label + ']' },
                  { type: 'closeTag', tagName: 'span' },
                ])
                return;
              } catch {
                tags.push(...[
                { type: 'openTag', tagName: 'span', classNames: ['incompletePlaceholderChip']},
                { type: 'text', content: '[Uferdig]' },
                { type: 'closeTag', tagName: 'span' },
              ])
              return;
              }
            }

            tags.push(...[
              { type: 'openTag', tagName: 'span'},
              { type: 'text', content: part },
              { type: 'closeTag', tagName: 'span' },
            ])
          })
          return tags
        }
      }
      if(this.$props.template && typeof this.$props.template === 'object' && Object.keys(this.$props.template).length > 0) {
        // Get the active template
        this.activeTemplate = JSON.parse(JSON.stringify(this.$props.template));

        // Decode the base64 Markdown to utf8
        if(this.activeTemplate.template && typeof this.activeTemplate.template === 'string') {
          this.activeTemplate.template = Buffer.from(this.activeTemplate.template, 'base64').toString('utf8');
        }
      }

      // Set other default values
      this.activeTemplate.documentDefinitionId = this.activeTemplate.documentDefinitionId || 'brevmal';
    } catch (err) {
      this.error = err;
    }
  },
  mounted() {
    this.$refs.editor.editor.addCommand('markdown', 'insertPlaceholder', () => {
      this.isShowInsertPlaceholderModal = true;
      // this.$refs.editor.editor.insertText('$$vtfk\nJadda');
    })
    this.$refs.editor.editor.addCommand('wysiwyg', 'insertPlaceholder', () => {
      this.$refs.editor.editor.insertText('$$vtfk\nJadda');
      const md = this.$refs.editor.editor.getMarkdown();
      this.$refs.editor.editor.setMarkdown(md);
    })
    this.$refs.editor.editor.insertToolbarItem({}, {
      name: 'myItem',
      tooltip: 'Lag utfyllingsfelter',
      command: 'insertPlaceholder',
      text: '📝',
      className: 'toastui-editor-toolbar-icons first',
      style: { backgroundImage: 'none' }
    });
    this.$refs.editor.editor.insertToolbarItem({}, {
      name: 'myItem',
      tooltip: 'Matrikkel flettefelter',
      command: 'bold',
      text: '🗺️',
      className: 'toastui-editor-toolbar-icons first',
      style: { backgroundImage: 'none' }
    });
  }
}
</script>

<style>
  .placeholderChip {
    cursor: pointer;
    border: 1px solid #5a9491;
    background-color: #B4DCDA;
    border-radius: 8px;
    font-weight: bold;
    margin-left: 0.05rem;
    margin-right: 0.05rem;
    padding: 0.08rem 0.5rem;
  }

  .incompletePlaceholderChip {
    cursor: pointer;
    border: 1px solid #F3B5B2;
    background-color: #E7827E;
    font-weight: bold;
    border-radius: 8px;
    margin-left: 0.05rem;
    margin-right: 0.05rem;
    padding: 0.08rem 0.5rem;
  }

</style>