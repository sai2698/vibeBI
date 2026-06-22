/**
 * numberFormat.ts
 * Shared BI-style number formatting utilities for charts.
 *
 * - Axis labels: auto K / M / B / T compact notation
 * - Tooltips: exact locale-formatted value + compact unit in parentheses
 */

// ─── Compact (axis) formatting ──────────────────────────────────────────────

const THRESHOLDS = [
  { limit: 1e12, suffix: 'T', divisor: 1e12 },
  { limit: 1e9,  suffix: 'B', divisor: 1e9  },
  { limit: 1e6,  suffix: 'M', divisor: 1e6  },
  { limit: 1e3,  suffix: 'K', divisor: 1e3  },
];

/**
 * Format a number for axis ticks using auto K/M/B/T suffix.
 * Examples:
 *   1500      → "1.5K"
 *   1_000_000 → "1M"
 *   2_500_000 → "2.5M"
 *   999       → "999"
 */
export function formatAxisValue(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || !isFinite(num)) return String(value);

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  for (const { limit, suffix, divisor } of THRESHOLDS) {
    if (abs >= limit) {
      const compact = abs / divisor;
      // Show up to 2 decimal places, but strip trailing zeros
      const formatted = compact % 1 === 0
        ? compact.toFixed(0)
        : compact.toFixed(2).replace(/\.?0+$/, '');
      return `${sign}${formatted}${suffix}`;
    }
  }

  // For values < 1000, show as-is (integers only, no decimals unless needed)
  if (abs === 0) return '0';
  return num % 1 === 0
    ? num.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Format a number for tooltip display: full locale string.
 * Examples:
 *   1500000   → "1,500,000"
 *   1234.567  → "1,234.567"
 */
export function formatExactValue(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || !isFinite(num)) return String(value);
  return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/**
 * Compose the display string for a tooltip value cell.
 * If the compact form differs from the exact form, show both:
 *   "1,500,000 (1.5M)"
 * Otherwise just the exact value:
 *   "999"
 */
export function formatTooltipValue(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || !isFinite(num)) return String(value);

  const exact = formatExactValue(num);
  const compact = formatAxisValue(num);

  // Only append compact if it's actually different (i.e. has a suffix)
  if (/[KMBT]$/.test(compact)) {
    return `${exact} (${compact})`;
  }
  return exact;
}

// ─── ECharts formatter functions ─────────────────────────────────────────────

/**
 * ECharts axisLabel.formatter — compact K/M/B/T.
 */
export const axisLabelFormatter = (value: number): string =>
  formatAxisValue(value);

/**
 * Build a rich HTML tooltip formatter for cartesian charts (bar/line/area).
 * Renders: category name as header + each series with color dot, compact label,
 * and exact value in a subtle secondary line.
 */
export function buildCartesianTooltipFormatter() {
  return (params: any) => {
    if (!params || (Array.isArray(params) && params.length === 0)) return '';

    const list = Array.isArray(params) ? params : [params];
    const category = list[0]?.axisValueLabel ?? list[0]?.name ?? '';

    const rows = list
      .filter((p: any) => p.value !== undefined && p.value !== null)
      .map((p: any) => {
        const raw = typeof p.value === 'object' ? p.value?.[1] ?? p.value?.[0] : p.value;
        const tooltipVal = formatTooltipValue(raw);
        const color = p.color ?? '#6366F1';
        return `
          <div style="display:flex;align-items:flex-start;gap:6px;margin-top:4px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-top:3px;flex-shrink:0;"></span>
            <div>
              <div style="font-size:12px;color:#94a3b8;font-weight:500;">${p.seriesName}</div>
              <div style="font-size:13px;color:#f1f5f9;font-weight:600;">${tooltipVal}</div>
            </div>
          </div>`;
      })
      .join('');

    return `
      <div style="
        background:rgba(15,23,42,0.92);
        border:1px solid rgba(99,102,241,0.25);
        border-radius:10px;
        padding:10px 14px;
        backdrop-filter:blur(8px);
        min-width:160px;
        max-width:280px;
        box-shadow:0 8px 32px rgba(0,0,0,0.4);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      ">
        <div style="font-size:11px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">
          ${category}
        </div>
        ${rows}
      </div>`;
  };
}

/**
 * Build a rich HTML tooltip formatter for pie / donut charts.
 * Shows: slice name, full value, percentage.
 */
export function buildPieTooltipFormatter() {
  return (params: any) => {
    if (!params) return '';
    const p = Array.isArray(params) ? params[0] : params;
    const raw = typeof p.value === 'object' ? (p.value?.[1] ?? p.value?.[0]) : p.value;
    const tooltipVal = formatTooltipValue(raw);
    const pct = typeof p.percent === 'number' ? p.percent.toFixed(1) : '—';
    const color = p.color ?? '#6366F1';

    return `
      <div style="
        background:rgba(15,23,42,0.92);
        border:1px solid rgba(99,102,241,0.25);
        border-radius:10px;
        padding:10px 14px;
        backdrop-filter:blur(8px);
        min-width:160px;
        box-shadow:0 8px 32px rgba(0,0,0,0.4);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      ">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${color};flex-shrink:0;"></span>
          <span style="font-size:13px;font-weight:600;color:#f1f5f9;">${p.name}</span>
        </div>
        <div style="font-size:13px;color:#f1f5f9;font-weight:600;">${tooltipVal}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${pct}% of total</div>
      </div>`;
  };
}

// ─── Auto rotate helpers ──────────────────────────────────────────────────────

/**
 * Auto-pick X-axis label rotation based on number of categories.
 * Falls back to an explicit override if provided.
 */
export function autoRotation(categoryCount: number, overrideRotation?: number | null): number {
  if (overrideRotation != null && overrideRotation !== 0) return overrideRotation;
  if (categoryCount > 15) return 45;
  if (categoryCount > 8)  return 30;
  return 0;
}

/**
 * Compute bottom grid margin based on rotation angle and legend visibility.
 */
export function gridBottomForRotation(rotation: number, showLegend: boolean): string {
  if (rotation >= 45) return showLegend ? '22%' : '16%';
  if (rotation >= 30) return showLegend ? '18%' : '13%';
  return showLegend ? '12%' : '8%';
}

// ─── Pie label-mode threshold ─────────────────────────────────────────────────

/**
 * Determine the label strategy for pie/donut based on slice count:
 * - 'outside': ≤ 6 slices
 * - 'inside':  7–12 slices (show % only)
 * - 'none':    > 12 slices (legend only)
 */
export type PieLabelMode = 'outside' | 'inside' | 'none';

export function pieLabelMode(sliceCount: number, explicitPosition?: string | null): PieLabelMode {
  // If user explicitly set a position, respect it
  if (explicitPosition === 'inside') return 'inside';
  if (explicitPosition === 'outside') return 'outside';
  if (explicitPosition === 'center') return 'inside';

  // Auto-threshold
  if (sliceCount > 12) return 'none';
  if (sliceCount > 6)  return 'inside';
  return 'outside';
}
