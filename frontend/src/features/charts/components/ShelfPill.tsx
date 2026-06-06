import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Type, Hash } from 'lucide-react';

interface ShelfPillProps {
  id: string;
  alias: string;
  color: 'blue' | 'green' | 'purple';
  onAliasChange: (newAlias: string) => void;
  onRemove: () => void;
}

const COLOR_CLASSES = {
  blue: {
    border: 'border-blue-500/30',
    text: 'text-blue-700 dark:text-blue-400',
    icon: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-white dark:bg-[#2d2f34]',
    grip: 'text-blue-400/60 hover:text-blue-500',
    IconComponent: Type,
  },
  green: {
    border: 'border-emerald-500/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    icon: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-white dark:bg-[#2d2f34]',
    grip: 'text-emerald-400/60 hover:text-emerald-500',
    IconComponent: Hash,
  },
  purple: {
    border: 'border-brand/30',
    text: 'text-brand dark:text-brand-light',
    icon: 'text-brand',
    bg: 'bg-white dark:bg-[#2d2f34]',
    grip: 'text-brand/60 hover:text-brand',
    IconComponent: Type,
  },
};

const ShelfPill: React.FC<ShelfPillProps> = ({
  id,
  alias,
  color,
  onAliasChange,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const colorSet = COLOR_CLASSES[color];
  const IconComp = colorSet.IconComponent;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 px-1 py-1 ${colorSet.bg} border ${colorSet.border} ${colorSet.text} rounded text-[11px] font-semibold shadow-sm group select-none ${isDragging ? 'ring-2 ring-brand/30 shadow-lg' : ''}`}
    >
      {/* Drag handle */}
      <button
        className={`shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded transition-colors ${colorSet.grip}`}
        {...attributes}
        {...listeners}
        tabIndex={-1}
      >
        <GripVertical size={12} />
      </button>

      <IconComp size={12} className={`shrink-0 opacity-70 ${colorSet.icon}`} />

      <input
        value={alias}
        onChange={(e) => onAliasChange(e.target.value)}
        className="bg-transparent border-none focus:ring-0 p-0 text-[11px] font-semibold w-fit min-w-[30px] outline-none text-slate-800 dark:text-slate-200"
        style={{ maxWidth: '120px' }}
      />

      <button
        onClick={onRemove}
        className="shrink-0 opacity-50 hover:opacity-100 hover:text-red-500 transition-colors p-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default ShelfPill;
