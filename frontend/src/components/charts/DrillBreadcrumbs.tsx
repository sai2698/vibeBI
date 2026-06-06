import React from 'react';
import { ChevronRight, Layers } from 'lucide-react';
import type { DrillLevel } from './useDrillDown';

interface DrillBreadcrumbsProps {
  drillStack: DrillLevel[];
  originalDimensionLabel?: string;
  onDrillToLevel: (level: number) => void;
  onResetDrill: () => void;
}

const DrillBreadcrumbs: React.FC<DrillBreadcrumbsProps> = ({
  drillStack,
  originalDimensionLabel = 'All',
  onDrillToLevel,
  onResetDrill,
}) => {
  if (drillStack.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold h-9 bg-brand/10 border-brand text-brand hover:bg-brand/15">
        <Layers size={12} className="text-brand flex-shrink-0" />

        {/* Root level */}
        <button
          className="text-brand/80 hover:text-brand transition-colors font-semibold"
          onClick={() => onDrillToLevel(0)}
          title="Back to original view"
        >
          {originalDimensionLabel}
        </button>

        {/* Drill levels */}
        {drillStack.map((level, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight size={12} className="text-brand/40 flex-shrink-0" />
            <button
              className={`flex items-center gap-1 transition-colors ${idx === drillStack.length - 1 ? 'text-brand' : 'text-brand/80 hover:text-brand'}`}
              onClick={() => onDrillToLevel(idx + 1)}
              title={level.label}
            >
              <span className="text-[10px] font-semibold text-brand/60 uppercase tracking-wide">{level.filterColumn}:</span>
              <span>{level.filterValue.replace('__EXCLUDE__', '≠ ')}</span>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Reset button */}
      <button
        className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap"
        onClick={onResetDrill}
        title="Reset all drills"
      >
        Clear Drill
      </button>
    </div>
  );
};

export default DrillBreadcrumbs;
