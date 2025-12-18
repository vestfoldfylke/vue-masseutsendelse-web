<template>
  <div style="width: 100%;">
    <Error v-if="error" :error="error" :showResetButton="false" />
    <!-- Inputs -->
    <div v-else v-for="(property, i) in schemaProperties" :key="i">
      <VTextField 
        v-if="property.type === 'string' && property.lines === undefined"
        :value="getInitialData(property.path)"
        :placeholder="property.description || undefined"
        :hint="property.description || undefined"
        :label="determinePropertyLabel(property)"
        @input="(e) => updateData(property.path, e)"
        :required="property.required"
        :disabled="$props.disabled || property.disabled"
      >
        <template #label>
          <span v-if="property.required" class="required"><strong>* </strong></span>{{property.label}}
        </template>
      </VTextField>
      <VTextarea
        v-if="property.type === 'string' && property.lines"
        :value="getInitialData(property.path)"
        :hint="property.description || undefined"
        :label="determinePropertyLabel(property)"
        :rows="property.lines"
        @input="(e) => updateData(property.path, e)"
        :required="property.required"
        :disabled="$props.disabled || property.disabled"
      >
        <template #label>
            <span v-if="property.required" class="required"><strong>* </strong></span>{{property.label}}
          </template>
      </VTextarea>
    </div>
  </div>
</template>

<script>
// Importer dependencies
import AppError from '../lib/vtfk-errors/AppError';
import Sjablong from '@vtfk/sjablong';
import get from 'lodash.get';
import set from 'lodash.set';
import merge from 'lodash.merge';
import unset from 'lodash.unset';

// Import components;

export default {
  name: 'SchemaFields',
  components: {
  },
  props: {
    value: {
      type: Object,
      default: () => {return {}}
    },
    schema: {
      type: [Object, Array],
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      error: undefined,
      schemaProperties: undefined,
      data: {}
    }
  },
  created() {
    this.setSchema();
  },
  methods: {
    setError(err) {
      // Set error
      this.error = err;
      // Emit that an error has occured
      this.$emit('error', this.error);
    },
    setSchema() {
      try {
        this.error = undefined;
        // Input validation
        if(!this.$props.schema) throw new AppError('Skjema mangler', 'Skjemakomponenten har ikke mottatt noe skjema');
        if(Array.isArray(this.$props.schema)) throw new AppError('Feil skjema type', 'Skjemaet er av typen array, det må være ett vanlig objekt');
        let schemaType = typeof this.$props.schema;
        if(schemaType !== 'object') throw new AppError('Feil skjema type', 'Skjemaet skal være av type object eller array, men er av type ' + schemaType);

        // Get the default data from the schema
        let defaultData = Sjablong.createObjectFromSchema(this.$props.schema);

        // Merge the provided data with the default data
        this.data = merge(this.$props.value, defaultData) || {}

        // Emit to the parent that the data might have changed
        this.onUpdate();

        // Determine how to assign the flattened schema
        let flattenedSchema = Sjablong.flattenSchema(this.$props.schema);
        if(!flattenedSchema || !Array.isArray(flattenedSchema) || flattenedSchema.length <= 0) throw new AppError('Skjemaet er tomt', 'Skjema er mottatt, men vi finner ingen felter');
        
        // Set skjemaet
        this.schemaProperties = flattenedSchema;
      } catch (err) {
        this.setError(err);
      }
    },
    updateData(path, value) {
      // Input validation
      if(!path) return;
      // If the value is empty
      if(value === '') {
        unset(this.data, path, value)
      } else {
        // Set the value to the data object
        set(this.data, path, value);
      }
      // Vue reactivity hack for objects
      this.$set(this, 'data', this.data);
      this.onUpdate();
    },
    onUpdate() {
      // Emit the updated data
      this.$emit('input', this.data);   // For v-model binding
      this.$emit('changed', this.data); // For other listening
    },
    getInitialData(path) {
      return get(this.data, path) || '';
    },
    determinePropertyLabel(property) {
      if(property.label) return property.label;
      if(property.path) return property.path;

      return 'Ukjent...'
    }
  },
  watch: {
    schema: function () {
      this.setSchema();
    }
  }
}
</script>

<style scope>
  .required {
    color: red;
  }
</style>