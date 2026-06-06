import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ChartConfigSchema, ConfigSection, ConfigField } from './config-schema';

interface DynamicConfigControlsProps {
  schema: ChartConfigSchema;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  initialExpandedSections?: Set<string>;
}

export const DynamicConfigControls: React.FC<DynamicConfigControlsProps> = ({
  schema,
  config,
  onChange,
  initialExpandedSections = new Set(schema.sections.filter(s => s.defaultExpanded).map(s => s.id)),
}) => {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(initialExpandedSections));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const updateConfig = (fieldKey: string, value: any) => {
    const newConfig = { ...config };
    const keys = fieldKey.split('.');
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    onChange(newConfig);
  };

  const renderField = (field: ConfigField) => {
    const value = getFieldPath(config, field.key);
    const defaultValue = field.defaultValue;

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateConfig(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value ?? defaultValue ?? ''}
            onChange={(e) => updateConfig(field.key, parseFloat(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
          />
        );

      case 'range':
        return (
          <div className="space-y-1">
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value ?? defaultValue ?? 0}
              onChange={(e) => updateConfig(field.key, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{field.min}</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                {value ?? defaultValue}
              </span>
              <span>{field.max}</span>
            </div>
          </div>
        );

      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={value ?? defaultValue ?? false}
                onChange={(e) => updateConfig(field.key, e.target.checked)}
                className="sr-only"
              />
              <div className={`block w-10 h-6 rounded-full transition-colors ${
                value ?? defaultValue ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                value ?? defaultValue ? 'transform translate-x-4' : ''
              }`}></div>
            </div>
          </label>
        );

      case 'select':
        return (
          <select
            value={value ?? defaultValue ?? ''}
            onChange={(e) => updateConfig(field.key, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="flex flex-wrap gap-3">
            {field.options?.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name={field.key}
                  value={opt.value}
                  checked={(value ?? defaultValue) === opt.value}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  className="sr-only"
                />
                <span className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  (value ?? defaultValue) === opt.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                }`}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        );

      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value ?? defaultValue ?? '#6366F1'}
              onChange={(e) => updateConfig(field.key, e.target.value)}
              className="w-10 h-10 rounded-md cursor-pointer border-0"
            />
            <input
              type="text"
              value={value ?? defaultValue ?? '#6366F1'}
              onChange={(e) => updateConfig(field.key, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getFieldPath = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  return (
    <div className="space-y-4">
      {schema.sections.map((section) => (
        <div
          key={section.id}
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center gap-3">
              {section.icon && (
                <span className="text-gray-500 dark:text-gray-400">
                  {renderIcon(section.icon)}
                </span>
              )}
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {section.title}
              </h3>
            </div>
            {expandedSections.has(section.id) ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {expandedSections.has(section.id) && (
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label}
                      </label>
                      {field.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {field.description}
                        </p>
                      )}
                      {renderField(field)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Simple icon renderer - can be replaced with Lucide icons
const renderIcon = (iconName: string) => {
  switch (iconName) {
    case 'MoveHorizontal':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    case 'MoveVertical':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    case 'LayoutList':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      );
    case 'Type':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      );
    case 'BarChart3':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'LineChart':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      );
    case 'PieChart':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
  }
};

export default DynamicConfigControls;
