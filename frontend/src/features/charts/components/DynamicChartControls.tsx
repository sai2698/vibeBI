import React, { useMemo } from 'react';
import { Settings2 } from 'lucide-react';
import { DynamicConfigControls, getChartConfigSchema } from '../../../components/charts/types';

interface DynamicChartControlsProps {
  chartType: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const DynamicChartControls: React.FC<DynamicChartControlsProps> = ({
  chartType,
  config,
  onChange,
}) => {
  const schema = useMemo(() => getChartConfigSchema(chartType), [chartType]);

  if (!schema) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <p>No configuration available for this chart type.</p>
        <p className="text-sm mt-2">Chart type: {chartType}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
        <Settings2 className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {schema.chartType.charAt(0).toUpperCase() + schema.chartType.slice(1)} Chart Settings
        </h2>
      </div>

      <DynamicConfigControls
        schema={schema}
        config={config}
        onChange={onChange}
        initialExpandedSections={new Set(schema.sections.filter(s => s.defaultExpanded).map(s => s.id))}
      />
    </div>
  );
};

export default DynamicChartControls;
