<template>
  <div class="map-wrapper">
    <Loading v-if="isParsing" title="Forbereder kart" />
    <l-map v-else ref="map" :style="mapStyle" :zoom="$props.zoom" :center="mapCenter" v-on:ready="onMapReady()" >
      <l-tile-layer :url="url" :attribution="attribution"></l-tile-layer>
      <!-- <l-marker v-for="(marker, i) in markers" :key="(i + 1) * (Math.random() * 100000)" :lat-lng="marker"></l-marker> -->
      
      <l-marker v-if="extremes.north" :lat-lng="extremes.north">
        <l-icon :icon-url="require('@/assets/icons/north-bound.svg')" />
      </l-marker>
      <l-marker v-if="extremes.west" :lat-lng="extremes.west">
        <l-icon :icon-url="require('@/assets/icons/west-bound.svg')" :icon-anchor="[30, 25]"/>
      </l-marker>
      <l-marker v-if="extremes.east" :lat-lng="extremes.east">
        <l-icon :icon-url="require('@/assets/icons/east-bound.svg')" :icon-anchor="[-5, 20]"/>
      </l-marker>
      <l-marker v-if="extremes.south" :lat-lng="extremes.south">
        <l-icon :icon-url="require('@/assets/icons/south-bound.svg')" :icon-anchor="[10, 0]" />
      </l-marker>
      <l-polygon v-for="(p, i) in polygonArray" :key="(Math.random() * 10000) * (i + 1)" :lat-lngs="p.vertices" :fillColor="polygon.fillColor" :color="polygon.color"></l-polygon>
    </l-map>
  </div>
</template>

<script>
import { LMap, LTileLayer, LMarker, LPolygon, LIcon } from 'vue2-leaflet';
import Loading from './Loading.vue';

// Fix a bug where map markers are not shown
import { Icon } from 'leaflet';
import polyparser from '../lib/polyparser/polyparser';
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default {
  name: 'Map',
  components: {
    LMap,
    LTileLayer,
    LMarker,
    LPolygon,
    LIcon,
    Loading
  },
  props: {
    polygons: {
      type: Object
    },
    height: {
      type: String,
      default: '400px'
    },
    center: {
      type: Array,
      default: () => [59.2654381, 10.4159352]
    },
    markers: {
      type: Array,
      default: () => [[59.2654381, 10.4159352]]
    },
    showCenterPin: {
      type: Boolean,
      default: true
    },
    outerBounds: {
      type: Object,
    },
    lineColor: {
      type: String,
      default: '#007ACC'
    },
    fillColor: {
      type: String,
      default: '#007ACC'
    },
    zoom: {
      type: Number,
      default: 14
    },
    
  },
  data() {
    return {
      isParsing: true,
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      mapZoom: this.$props.zoom,
      mapCenter: this.$props.center,
      mapMarker: this.$props.marker,
      polygon: {
        color: this.$props.lineColor,
        fillColor: this.$props.fillColor,
      },
      polygonArray: undefined,
      extremes: undefined,
    }
  },
  computed: {
    mapStyle() {
      return `height: 100%; min-height: ${this.$props.height}; width: 100%; z-index: 1;`
    }
  },
  methods: {
    invalidateMapSize() {
      if(this.extremes && this.extremes.north) {
        const bounds = [this.extremes.north, this.extremes.west, this.extremes.east, this.extremes.south];
        this.$refs.map.mapObject.fitBounds(bounds, { padding: [-20, -20] });
      }
      this.$refs.map.mapObject.invalidateSize(); 
    },
    parsePolygons(polygons) {
      // Input validation
      if(!polygons) return [];
      this.isParsing = true;

      // Transform vertices if applicable
      let pindex = -1;
      for(let polygon of polygons.polygons) {
        pindex++;
        let vindex = -1;
        for(let vertice of polygon.vertices) {
          vindex++;
          polygons.polygons[pindex].vertices[vindex] = polyparser.swapXY(polyparser.transformCoordinates(polygon.EPSG || undefined, undefined, vertice));
        }
      }

      // Transform center
      this.mapCenter = polyparser.swapXY(polyparser.transformCoordinates(this.polygon.EPSG, undefined, polygons.center));

      // Transform extremes
      this.extremes = {
        north: polyparser.swapXY(polyparser.transformCoordinates(this.polygon.EPSG, undefined, polygons.extremes.north)),
        west: polyparser.swapXY(polyparser.transformCoordinates(this.polygon.EPSG, undefined, polygons.extremes.west)),
        east: polyparser.swapXY(polyparser.transformCoordinates(this.polygon.EPSG, undefined, polygons.extremes.east)),
        south: polyparser.swapXY(polyparser.transformCoordinates(this.polygon.EPSG, undefined, polygons.extremes.south)),
      }
      
      this.$set(this, 'polygonArray', polygons.polygons);
      this.isParsing = false;
    },
    onMapReady() {
      // Parse polygon
      this.parsePolygons(JSON.parse(JSON.stringify(this.$props.polygons)));
      this.$set(this, 'polygonArray', this.polygonArray);
      // Zoom the map to fit the extremes
      this.invalidateMapSize();
    }
  },
  created() {
    this.parsePolygons(JSON.parse(JSON.stringify(this.$props.polygons)));
    this.$set(this, 'polygonArray', this.polygonArray);
  },
  beforeDestroy() {
  },
  mounted() {
    setTimeout(() => {
      this.invalidateMapSize();
    }, 100);
  },
  watch: {
  }
}
</script>

<style scoped>
  .map-wrapper {
    height: 100%;
    width: 100%;
    box-shadow: 0 1px 5px 1px #888888;
  }
</style>