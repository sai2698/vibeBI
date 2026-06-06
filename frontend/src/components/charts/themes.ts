import * as echarts from 'echarts';

export const ECHARTS_THEMES = [
  { id: 'default', name: 'Default BI (Indigo)', colors: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6'] },
  { id: 'vintage', name: 'Vintage (Warm Retro)', colors: ['#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8', '#efa18f', '#78a355', '#905a3d', '#f2d643', '#cd5c5c'] },
  { id: 'macarons', name: 'Macarons (Sweet Pastel)', colors: ['#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80', '#8d98b3', '#e5cf0d', '#97b552', '#95706d', '#dc69aa'] },
  { id: 'infographic', name: 'Infographic (Corporate Bold)', colors: ['#c1232b', '#27727b', '#fcce10', '#e87c25', '#b5c334', '#fe8463', '#9bca63', '#fad860', '#f3a43b', '#60c0dd'] },
  { id: 'shine', name: 'Shine (Vibrant Gradients)', colors: ['#c12e34', '#e6b600', '#0098d9', '#2b821d', '#005eaa', '#339ca8', '#cda007', '#afd6dd'] },
  { id: 'roma', name: 'Roma (Terracotta & Gold)', colors: ['#e01f54', '#001852', '#f5e8c8', '#b8d2c7', '#c6b38e', '#a4d8c2', '#f3d999', '#d3758f', '#dcc392', '#2e4783'] },
  { id: 'mint', name: 'Mint (Fresh Greens)', colors: ['#26a69a', '#2bbbad', '#4db6ac', '#80cbc4', '#00695c', '#00897b', '#004d40', '#a7ffeb'] },
  { id: 'sakura', name: 'Sakura (Soft Pink Blossom)', colors: ['#e062ae', '#e290b2', '#e5b3c5', '#f0b7db', '#f19ec2', '#f3c8e2', '#e3579a', '#f580b3'] },
  { id: 'dark', name: 'Enterprise Dark (Neon Slate)', colors: ['#dd6b66', '#759aa0', '#e69d87', '#8dc1a9', '#ea7e53', '#eedd78', '#73a373', '#73b9bc', '#7289ab', '#91ca8c', '#f49f42'], isDark: true }
];

// Registry cache for dynamic lookups of active color palettes
const themeColorCache: Record<string, string[]> = {
  default: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6']
};

// Seed built-in cache items
ECHARTS_THEMES.forEach(theme => {
  themeColorCache[theme.id] = theme.colors;
});

// Definition of each theme matching the design configuration
const themeConfigs: Record<string, any> = {
  vintage: {
    color: ['#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8', '#efa18f', '#78a355', '#905a3d', '#f2d643', '#cd5c5c'],
    backgroundColor: 'transparent',
    textStyle: { color: '#333333' },
    title: { textStyle: { color: '#333333' } },
    legend: { textStyle: { color: '#333333' } },
    grid: { containLabel: true }
  },
  macarons: {
    color: ['#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80', '#8d98b3', '#e5cf0d', '#97b552', '#95706d', '#dc69aa'],
    backgroundColor: 'transparent',
    textStyle: { color: '#555555' },
    title: { textStyle: { color: '#008acd' } },
    legend: { textStyle: { color: '#555555' } },
    grid: { containLabel: true }
  },
  infographic: {
    color: ['#c1232b', '#27727b', '#fcce10', '#e87c25', '#b5c334', '#fe8463', '#9bca63', '#fad860', '#f3a43b', '#60c0dd'],
    backgroundColor: 'transparent',
    textStyle: { color: '#272727' },
    title: { textStyle: { color: '#27727b' } },
    legend: { textStyle: { color: '#272727' } },
    grid: { containLabel: true }
  },
  shine: {
    color: ['#c12e34', '#e6b600', '#0098d9', '#2b821d', '#005eaa', '#339ca8', '#cda007', '#afd6dd'],
    backgroundColor: 'transparent',
    textStyle: { color: '#444444' },
    title: { textStyle: { color: '#c12e34' } },
    legend: { textStyle: { color: '#444444' } },
    grid: { containLabel: true }
  },
  roma: {
    color: ['#e01f54', '#001852', '#f5e8c8', '#b8d2c7', '#c6b38e', '#a4d8c2', '#f3d999', '#d3758f', '#dcc392', '#2e4783'],
    backgroundColor: 'transparent',
    textStyle: { color: '#333333' },
    title: { textStyle: { color: '#e01f54' } },
    legend: { textStyle: { color: '#333333' } },
    grid: { containLabel: true }
  },
  mint: {
    color: ['#26a69a', '#2bbbad', '#4db6ac', '#80cbc4', '#00695c', '#00897b', '#004d40', '#a7ffeb'],
    backgroundColor: 'transparent',
    textStyle: { color: '#374151' },
    title: { textStyle: { color: '#004d40' } },
    legend: { textStyle: { color: '#374151' } },
    grid: { containLabel: true }
  },
  sakura: {
    color: ['#e062ae', '#e290b2', '#e5b3c5', '#f0b7db', '#f19ec2', '#f3c8e2', '#e3579a', '#f580b3'],
    backgroundColor: 'transparent',
    textStyle: { color: '#4b5563' },
    title: { textStyle: { color: '#e062ae' } },
    legend: { textStyle: { color: '#4b5563' } },
    grid: { containLabel: true }
  },
  dark: {
    color: ['#dd6b66', '#759aa0', '#e69d87', '#8dc1a9', '#ea7e53', '#eedd78', '#73a373', '#73b9bc', '#7289ab', '#91ca8c', '#f49f42'],
    backgroundColor: 'transparent',
    textStyle: { color: '#f3f4f6' },
    title: { textStyle: { color: '#f3f4f6' } },
    legend: { textStyle: { color: '#f3f4f6' } },
    grid: { containLabel: true },
    categoryAxis: {
      axisLine: { lineStyle: { color: '#4b5563' } },
      axisLabel: { textStyle: { color: '#9ca3af' } }
    },
    valueAxis: {
      axisLine: { lineStyle: { color: '#4b5563' } },
      axisLabel: { textStyle: { color: '#9ca3af' } },
      splitLine: { lineStyle: { color: '#1f2937' } }
    }
  }
};

// Keep track of registered themes
const registeredThemes = new Set<string>(['vintage', 'macarons', 'infographic', 'shine', 'roma', 'mint', 'sakura', 'dark', 'default']);

// Register built-in themes globally on startup
let registered = false;
export function registerAllThemes() {
  if (registered) return;
  Object.entries(themeConfigs).forEach(([name, config]) => {
    try {
      echarts.registerTheme(name, config);
    } catch (e) {
      console.warn(`Failed to register built-in theme ${name}:`, e);
    }
  });
  registered = true;
}

// Cache for dynamically registered theme metadata
const dynamicThemeMetaCache: Record<string, { background: string; text: string; border: string }> = {};

function isDarkColor(colorStr: string): boolean {
  if (!colorStr || colorStr === 'transparent') return false;
  let hex = colorStr.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq < 128;
}

export function registerThemeOnTheFly(name: string, config: any) {
  const normalizedName = name.toLowerCase().replace(/\s+/g, '_');
  const themeObj = config.theme || config;
  
  if (themeObj && Array.isArray(themeObj.color)) {
    themeColorCache[normalizedName] = themeObj.color;
  }

  // Populate dynamic theme metadata cache
  if (themeObj) {
    const bg = themeObj.backgroundColor && themeObj.backgroundColor !== 'transparent' ? themeObj.backgroundColor : '#ffffff';
    const isDark = themeObj.isDark || isDarkColor(bg);
    const textColor = themeObj.textStyle?.color || (isDark ? '#f3f4f6' : '#1e293b');
    const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    dynamicThemeMetaCache[normalizedName] = {
      background: bg,
      text: textColor,
      border: border
    };
  }

  if (registeredThemes.has(normalizedName)) return normalizedName;
  try {
    echarts.registerTheme(normalizedName, themeObj);
    registeredThemes.add(normalizedName);
    console.log(`Registered dynamic ECharts theme: ${normalizedName}`);
    return normalizedName;
  } catch (e) {
    console.error(`Failed to dynamically register echarts theme ${name}:`, e);
    return 'default';
  }
}

export function getColorsForTheme(themeId?: string): string[] {
  if (!themeId) return themeColorCache.default;
  const normalized = themeId.toLowerCase().replace(/\s+/g, '_');
  return themeColorCache[normalized] || themeColorCache[themeId] || themeColorCache.default;
}

export interface ThemeMeta {
  background: string;
  text: string;
  border: string;
  primary: string;
  secondary: string;
  colors: string[];
  heading?: string;
}

export function getThemeMeta(themeId?: string): ThemeMeta {
  const normalized = (themeId || 'default').toLowerCase().replace(/\s+/g, '_');
  const colors = getColorsForTheme(normalized);
  
  const metaMap: Record<string, { background: string; text: string; border: string }> = {
    default: { background: '#ffffff', text: '#1e293b', border: '#e2e8f0' },
    vintage: { background: '#fef8ef', text: '#2c3e50', border: '#ebdcc5' },
    macarons: { background: '#fcfcfa', text: '#374151', border: '#e2dbe8' },
    infographic: { background: '#fbfbfb', text: '#1f2937', border: '#ebd8d8' },
    shine: { background: '#ffffff', text: '#374151', border: '#e2e8f0' },
    roma: { background: '#fcfaf2', text: '#2c3e50', border: '#e8dec5' },
    mint: { background: '#f0fbf9', text: '#115e59', border: '#ccebe5' },
    sakura: { background: '#fff5f7', text: '#4b5563', border: '#ebd5e0' },
    dark: { background: '#1e293b', text: '#f3f4f6', border: '#334155' }
  };
  
  const meta = metaMap[normalized] || dynamicThemeMetaCache[normalized] || metaMap.default;
  return {
    ...meta,
    primary: colors[0],
    secondary: colors[1] || colors[0],
    colors
  };
}
