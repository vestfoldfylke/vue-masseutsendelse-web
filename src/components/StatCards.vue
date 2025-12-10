<template>
  <div class="card-container">
    <div v-for="item in $props.items" :key="item.text" class="card">
      <div class="card-header">
        <div class="typography heading-two">{{item.text}}</div>
      </div>
      <div class="card-body">
        <div class="typography heading-three">
          {{item.value}}
          <span v-if="item.postvalue">
            {{item.postvalue}}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatCards',
  props: {
    items: {
      type: Array,
      default: () => [{text: 'Private', value: '100'}, { text: 'Bedrifter', value: '79' }, { text: 'Borettslag', value: '3' },]
    }
  },
  data() {
    return {
      
    }
  }
}
</script>

<style scoped>
  .card-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content:  center;
    gap: 2rem;
    width: 100%;
  }

  .card {
    display: flex;
    flex-direction: column;
    height: 200px;
    width: 200px;
    background-color: #CFEBF2;
    padding: 1rem 1rem;
    border-radius: 10px;
    box-shadow: 0 1px 5px 1px #888888;
  }

  .card-header {
    flex: 0;
  }

  .card-body {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 0 1 auto;
    height: 100%;
    width: 100%;
  }

</style>