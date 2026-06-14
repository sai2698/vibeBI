import type { EChartsOption } from 'echarts';
import { createChartConfigSchema, type ChartConfigSchema, getConfigValue } from './config-schema';

export interface GeoMapChartProps {
  categories?: string[]; // Location names (e.g., countries, states)
  series: Array<{
    name: string;
    data?: any[]; // Values corresponding to locations
  }>;
  visualConfig?: any;
}

const mapRegionOptions = [
  { label: 'World', value: 'world' },
  { label: 'India', value: 'india' },
  { label: 'Andaman and Nicobar Islands', value: 'andamanandnicobarislands' },
  { label: 'Andhra Pradesh', value: 'andhrapradesh' },
  { label: 'Arunachal Pradesh', value: 'arunachalpradesh' },
  { label: 'Assam', value: 'assam' },
  { label: 'Bihar', value: 'bihar' },
  { label: 'Chandigarh', value: 'chandigarh' },
  { label: 'Chhattisgarh', value: 'chhattisgarh' },
  { label: 'Dadra and Nagar Haveli', value: 'dadranagarhaveli' },
  { label: 'Daman and Diu', value: 'damananddiu' },
  { label: 'Delhi', value: 'delhi' },
  { label: 'Goa', value: 'goa' },
  { label: 'Gujarat', value: 'gujarat' },
  { label: 'Haryana', value: 'haryana' },
  { label: 'Himachal Pradesh', value: 'himachalpradesh' },
  { label: 'Jammu and Kashmir', value: 'jammuandkashmir' },
  { label: 'Jharkhand', value: 'jharkhand' },
  { label: 'Karnataka', value: 'karnataka' },
  { label: 'Kerala', value: 'kerala' },
  { label: 'Lakshadweep', value: 'lakshadweep' },
  { label: 'Madhya Pradesh', value: 'madhyapradesh' },
  { label: 'Maharashtra', value: 'maharashtra' },
  { label: 'Manipur', value: 'manipur' },
  { label: 'Meghalaya', value: 'meghalaya' },
  { label: 'Mizoram', value: 'mizoram' },
  { label: 'Nagaland', value: 'nagaland' },
  { label: 'Odisha', value: 'odisha' },
  { label: 'Puducherry', value: 'puducherry' },
  { label: 'Punjab', value: 'punjab' },
  { label: 'Rajasthan', value: 'rajasthan' },
  { label: 'Sikkim', value: 'sikkim' },
  { label: 'Tamil Nadu', value: 'tamilnadu' },
  { label: 'Telangana', value: 'telangana' },
  { label: 'Tripura', value: 'tripura' },
  { label: 'Uttarakhand', value: 'uttarakhand' },
  { label: 'Uttar Pradesh', value: 'uttarpradesh' },
  { label: 'West Bengal', value: 'westbengal' },
];

export const geoMapChartConfigSchema: ChartConfigSchema = createChartConfigSchema({
  chartType: 'geomap',
  sections: [
    {
      id: 'map',
      title: 'Map Settings',
      icon: 'Map',
      defaultExpanded: true,
      fields: [
        {
          key: 'map.region',
          label: 'Map Region',
          type: 'select',
          options: mapRegionOptions,
          defaultValue: 'world',
          description: 'Focus map on a specific region or state',
        },
        {
          key: 'map.roam',
          label: 'Enable Zoom & Pan',
          type: 'boolean',
          defaultValue: true,
          description: 'Allow users to zoom and pan the map',
        },
        {
          key: 'map.showLabels',
          label: 'Show Region Labels',
          type: 'boolean',
          defaultValue: false,
          description: 'Display names of the regions on the map',
        },
        {
          key: 'map.itemBorderColor',
          label: 'Region Border Color',
          type: 'color',
          defaultValue: '#ffffff',
        },
        {
          key: 'map.itemBorderWidth',
          label: 'Region Border Width',
          type: 'range',
          min: 0,
          max: 5,
          step: 0.5,
          defaultValue: 0.5,
        },
      ],
    },
    {
      id: 'visualMap',
      title: 'Color Scale (Visual Map)',
      icon: 'Palette',
      defaultExpanded: true,
      fields: [
        {
          key: 'visualMap.show',
          label: 'Show Legend',
          type: 'boolean',
          defaultValue: true,
        },
        {
          key: 'visualMap.minColor',
          label: 'Min Value Color',
          type: 'color',
          defaultValue: '#e0f3f8',
        },
        {
          key: 'visualMap.maxColor',
          label: 'Max Value Color',
          type: 'color',
          defaultValue: '#313695',
        },
      ],
    },
    {
      id: 'tooltip',
      title: 'Tooltip Settings',
      icon: 'MessageSquare',
      defaultExpanded: false,
      fields: [
        {
          key: 'tooltipShow',
          label: 'Show Tooltips',
          type: 'boolean',
          defaultValue: true,
        },
      ],
    },
  ],
  defaultConfig: {
    map: { region: 'world', roam: true, showLabels: false, itemBorderColor: '#ffffff', itemBorderWidth: 0.5 },
    visualMap: { show: true, minColor: '#e0f3f8', maxColor: '#313695' },
    tooltipShow: true,
  },
});

export function buildGeoMapChartOptions({
  categories = [],
  series = [],
  visualConfig = {},
}: GeoMapChartProps): EChartsOption {
  const cfg = visualConfig;
  
  // Extract configuration values
  const roam = getConfigValue(cfg, 'map.roam') ?? true;
  const showLabels = getConfigValue(cfg, 'map.showLabels') ?? false;
  const borderColor = getConfigValue(cfg, 'map.itemBorderColor') ?? '#ffffff';
  const borderWidth = getConfigValue(cfg, 'map.itemBorderWidth') ?? 0.5;
  const showVisualMap = getConfigValue(cfg, 'visualMap.show') ?? true;
  const minColor = getConfigValue(cfg, 'visualMap.minColor') ?? '#e0f3f8';
  const maxColor = getConfigValue(cfg, 'visualMap.maxColor') ?? '#313695';
  const tooltipShow = getConfigValue(cfg, 'tooltipShow') ?? true;
  const mapRegion = getConfigValue(cfg, 'map.region') ?? 'world';
  const nameProperty = mapRegion === 'world' ? 'name' : (mapRegion === 'india' ? 'st_nm' : 'district');

  // Prepare map data
  const mapData = series[0]?.data?.map((val: any, idx: number) => ({
    name: categories[idx] || `Region ${idx}`,
    value: val,
  })) || [];

  // Calculate min and max for visual map
  let min = 0;
  let max = 100;
  if (mapData.length > 0) {
    const values = mapData.map((d: any) => Number(d.value)).filter((v: number) => !isNaN(v));
    if (values.length > 0) {
      min = Math.min(...values);
      max = Math.max(...values);
      
      // If min === max, adjust slightly to avoid echarts error
      if (min === max) {
        min = min > 0 ? 0 : min - 10;
        max = max + 10;
      }
    }
  }

  return {
    tooltip: {
      show: tooltipShow,
      trigger: 'item',
      formatter: '{b}<br/>{c}',
    },
    visualMap: {
      show: showVisualMap,
      left: 'right',
      min: min,
      max: max,
      inRange: {
        color: [minColor, maxColor],
      },
      text: ['High', 'Low'],
      calculable: true,
    },
    series: [
      {
        name: series[0]?.name || 'Metric',
        type: 'map',
        map: mapRegion,
        selectedMode: 'multiple',
        nameProperty: nameProperty,
        roam: roam,
        label: {
          show: showLabels,
        },
        emphasis: {
          label: {
            show: true,
          },
          itemStyle: {
            areaColor: '#f46d43',
          }
        },
        itemStyle: {
          borderColor: borderColor,
          borderWidth: borderWidth,
        },
        data: mapData,
      },
    ],
  };
}
