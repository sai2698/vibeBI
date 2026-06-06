import React, { useState } from 'react';
import { Palette, Type, AlignLeft, Eye, X } from 'lucide-react';

interface StyleConfig {
  font_size?: number;
  font_color?: string;
  font_family?: string;
  text_alignment?: 'left' | 'center' | 'right' | 'justify';
  background_color?: string;
  is_transparent?: boolean;
  font_weight?: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
  font_style?: 'normal' | 'italic' | 'oblique';
  padding?: string;
  margin?: string;
  border_radius?: string;
  opacity?: number;
}

interface WidgetStyleEditorProps {
  styleConfig?: StyleConfig;
  onChange: (styleConfig: StyleConfig) => void;
  onClose: () => void;
}

const commonFontFamilies = [
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'Segoe UI',
  'Roboto',
  'Helvetica',
  'Arial',
];

const alignmentOptions: { value: StyleConfig['text_alignment']; label: string; icon: string }[] = [
  { value: 'left', label: 'Left', icon: '←' },
  { value: 'center', label: 'Center', icon: '↔' },
  { value: 'right', label: 'Right', icon: '→' },
  { value: 'justify', label: 'Justify', icon: '≡' },
];

const WidgetStyleEditor: React.FC<WidgetStyleEditorProps> = ({
  styleConfig,
  onChange,
  onClose,
}) => {
  const [localConfig, setLocalConfig] = useState<StyleConfig>(styleConfig || {});

  const updateConfig = (key: keyof StyleConfig, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const resetStyles = () => {
    setLocalConfig({});
    onChange({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Widget Styling</h4>
        <button
          onClick={resetStyles}
          className="text-xs text-slate-400 hover:text-slate-600 font-bold"
        >
          Reset to Default
        </button>
      </div>

      {/* Typography Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Type size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase">Typography</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Font Size (px)</label>
          <input
            type="number"
            value={localConfig.font_size || ''}
            onChange={(e) => updateConfig('font_size', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="14"
            min="8"
            max="72"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Font Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={localConfig.font_color || '#000000'}
              onChange={(e) => updateConfig('font_color', e.target.value)}
              className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={localConfig.font_color || ''}
              onChange={(e) => updateConfig('font_color', e.target.value)}
              placeholder="#000000"
              className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Font Family</label>
          <select
            value={localConfig.font_family || ''}
            onChange={(e) => updateConfig('font_family', e.target.value || undefined)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
          >
            <option value="">Default</option>
            {commonFontFamilies.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Font Weight</label>
            <select
              value={localConfig.font_weight || ''}
              onChange={(e) => updateConfig('font_weight', e.target.value || undefined)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            >
              <option value="">Default</option>
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="lighter">Lighter</option>
              <option value="bolder">Bolder</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Font Style</label>
            <select
              value={localConfig.font_style || ''}
              onChange={(e) => updateConfig('font_style', e.target.value || undefined)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            >
              <option value="">Default</option>
              <option value="normal">Normal</option>
              <option value="italic">Italic</option>
              <option value="oblique">Oblique</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alignment Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <AlignLeft size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase">Alignment</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Text Alignment</label>
          <div className="grid grid-cols-4 gap-2">
            {alignmentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateConfig('text_alignment', opt.value)}
                className={`px-3 py-2 text-sm font-bold rounded-lg border transition-all ${
                  localConfig.text_alignment === opt.value
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Background & Appearance Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Palette size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase">Background & Appearance</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Background Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={localConfig.background_color || '#ffffff'}
              onChange={(e) => updateConfig('background_color', e.target.value)}
              disabled={localConfig.is_transparent}
              className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer disabled:opacity-50"
            />
            <input
              type="text"
              value={localConfig.background_color || ''}
              onChange={(e) => updateConfig('background_color', e.target.value)}
              placeholder="#ffffff"
              disabled={localConfig.is_transparent}
              className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            localConfig.is_transparent ? 'bg-brand border-brand' : 'bg-white border-slate-300 group-hover:border-brand'
          }`}>
            {localConfig.is_transparent && <X size={12} className="text-white" strokeWidth={3} />}
          </div>
          <input
            type="checkbox"
            checked={localConfig.is_transparent || false}
            onChange={(e) => updateConfig('is_transparent', e.target.checked)}
            className="hidden"
          />
          <span className="text-sm font-medium text-slate-700">Transparent (no background)</span>
        </label>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Opacity (%)</label>
          <input
            type="range"
            value={localConfig.opacity !== undefined ? localConfig.opacity * 100 : 100}
            onChange={(e) => updateConfig('opacity', parseInt(e.target.value) / 100)}
            min="0"
            max="100"
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0%</span>
            <span>{Math.round((localConfig.opacity || 1) * 100)}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Spacing Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Eye size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase">Spacing & Border</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Padding</label>
            <input
              type="text"
              value={localConfig.padding || ''}
              onChange={(e) => updateConfig('padding', e.target.value || undefined)}
              placeholder="16px"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Border Radius</label>
            <input
              type="text"
              value={localConfig.border_radius || ''}
              onChange={(e) => updateConfig('border_radius', e.target.value || undefined)}
              placeholder="8px"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetStyleEditor;
