import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownRight,
  ArrowUpLeft,
  Filter,
  FilterX,
  Table,
  RotateCcw,
  ChevronRight,
  Layers,
} from 'lucide-react';

export interface DrillMenuClickInfo {
  /** The category value that was clicked (e.g. "North") */
  categoryValue: string;
  /** The series name (e.g. "Sales") */
  seriesName: string;
  /** The data value */
  dataValue: number | string;
  /** The dimension column name this category belongs to */
  dimensionName: string;
}

interface DrillContextMenuProps {
  /** Position of the menu (viewport coords) */
  x: number;
  y: number;
  /** Info about the clicked chart element */
  clickInfo: DrillMenuClickInfo;
  /** Available columns that can be drilled into */
  availableColumns: string[];
  /** Currently active dimension */
  currentDimension: string;
  /** Whether there is drill history to go back */
  canDrillUp: boolean;
  /** Callbacks */
  onDrillDown: (targetColumn: string) => void;
  onDrillUp: () => void;
  onFilterByValue: () => void;
  onExcludeValue: () => void;
  onViewAsTable?: () => void;
  onResetDrill?: () => void;
  onClose: () => void;
}

const DrillContextMenu: React.FC<DrillContextMenuProps> = ({
  x,
  y,
  clickInfo,
  availableColumns,
  currentDimension,
  canDrillUp,
  onDrillDown,
  onDrillUp,
  onFilterByValue,
  onExcludeValue,
  onViewAsTable,
  onResetDrill,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });
  const [showDrillSub, setShowDrillSub] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let ax = x;
      let ay = y;

      if (x + rect.width > vw - 12) ax = vw - rect.width - 12;
      if (y + rect.height > vh - 12) ay = vh - rect.height - 12;
      if (ax < 12) ax = 12;
      if (ay < 12) ay = 12;

      setAdjustedPos({ x: ax, y: ay });
    }

    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));
  }, [x, y]);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Filter out current dimension from drill targets
  const drillTargets = availableColumns.filter(
    (col) => col !== currentDimension && col !== clickInfo.dimensionName,
  );

  const menuContent = (
    <div
      ref={menuRef}
      className={`drill-context-menu ${isVisible ? 'drill-context-menu--visible' : ''}`}
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 99999,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="drill-menu-header">
        <span className="drill-menu-header-label">
          {clickInfo.categoryValue}
        </span>
        <span className="drill-menu-header-sub">
          {clickInfo.seriesName}: {typeof clickInfo.dataValue === 'number' ? clickInfo.dataValue.toLocaleString() : clickInfo.dataValue}
        </span>
      </div>

      <div className="drill-menu-divider" />

      {/* Drill Down */}
      {drillTargets.length > 0 && (
        <div
          className="drill-menu-item drill-menu-item--has-sub"
          onMouseEnter={() => setShowDrillSub(true)}
          onMouseLeave={() => setShowDrillSub(false)}
        >
          <div className="drill-menu-item-icon drill-menu-item-icon--brand">
            <ArrowDownRight size={14} />
          </div>
          <span>Drill Down</span>
          <ChevronRight size={12} className="drill-menu-item-arrow" />

          {/* Sub-menu */}
          {showDrillSub && (
            <div className="drill-submenu">
              <div className="drill-submenu-label">
                <Layers size={10} />
                Select dimension to drill into
              </div>
              {drillTargets.map((col) => (
                <button
                  key={col}
                  className="drill-submenu-item"
                  onClick={() => {
                    onDrillDown(col);
                    onClose();
                  }}
                >
                  {col}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {drillTargets.length === 0 && (
        <div className="drill-menu-item drill-menu-item--disabled">
          <div className="drill-menu-item-icon">
            <ArrowDownRight size={14} />
          </div>
          <span>No more dimensions to drill</span>
        </div>
      )}

      {/* Drill Up */}
      {canDrillUp && (
        <button
          className="drill-menu-item"
          onClick={() => {
            onDrillUp();
            onClose();
          }}
        >
          <div className="drill-menu-item-icon drill-menu-item-icon--amber">
            <ArrowUpLeft size={14} />
          </div>
          <span>Drill Up</span>
        </button>
      )}

      <div className="drill-menu-divider" />

      {/* Filter by value */}
      <button
        className="drill-menu-item"
        onClick={() => {
          onFilterByValue();
          onClose();
        }}
      >
        <div className="drill-menu-item-icon drill-menu-item-icon--emerald">
          <Filter size={14} />
        </div>
        <span>
          Filter by <strong>{clickInfo.categoryValue}</strong>
        </span>
      </button>

      {/* Exclude value */}
      <button
        className="drill-menu-item"
        onClick={() => {
          onExcludeValue();
          onClose();
        }}
      >
        <div className="drill-menu-item-icon drill-menu-item-icon--red">
          <FilterX size={14} />
        </div>
        <span>
          Exclude <strong>{clickInfo.categoryValue}</strong>
        </span>
      </button>

      {/* View as Table */}
      {onViewAsTable && (
        <>
          <div className="drill-menu-divider" />
          <button
            className="drill-menu-item"
            onClick={() => {
              onViewAsTable();
              onClose();
            }}
          >
            <div className="drill-menu-item-icon">
              <Table size={14} />
            </div>
            <span>View as Table</span>
          </button>
        </>
      )}

      {/* Reset Drill */}
      {canDrillUp && onResetDrill && (
        <button
          className="drill-menu-item"
          onClick={() => {
            onResetDrill();
            onClose();
          }}
        >
          <div className="drill-menu-item-icon">
            <RotateCcw size={14} />
          </div>
          <span>Reset All Drills</span>
        </button>
      )}
    </div>
  );

  return createPortal(menuContent, document.body);
};

export default DrillContextMenu;
