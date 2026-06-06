#!/bin/bash
cd /home/naveen/NAVYA/frontend/src/components/charts/types

# Update each file to make data optional
for file in LineChart AreaChart ScatterChart HeatmapChart RadarChart TreemapChart SunburstChart FunnelChart GaugeChart; do
  sed -i 's/data: any\[\]/data?: any[]/g' "${file}.ts"
  sed -i '/name: string;/a\    value?: number;' "${file}.ts"
done

echo "Updated all chart type files"
