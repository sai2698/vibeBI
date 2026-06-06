import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Image, X } from 'lucide-react';

interface ExportMenuProps {
  onExport?: (format: string) => void;
}

const exportFormats = [
  { id: 'csv', label: 'CSV', desc: 'Comma-separated values', icon: <FileText size={18} className="text-green-600" /> },
  { id: 'xlsx', label: 'Excel (XLSX)', desc: 'Microsoft Excel workbook', icon: <FileSpreadsheet size={18} className="text-emerald-600" /> },
  { id: 'pdf', label: 'PDF', desc: 'Portable Document Format', icon: <FileText size={18} className="text-red-500" /> },
  { id: 'png', label: 'PNG Image', desc: 'Chart screenshot', icon: <Image size={18} className="text-blue-500" /> },
];

const ExportMenu: React.FC<ExportMenuProps> = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: string) => {
    onExport?.(format);
    setIsOpen(false);
    // In a real app, this would trigger a download via the backend
    alert(`Export as ${format.toUpperCase()} — feature will connect to /api/export in production.`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
      >
        <Download size={16} /> Export
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-3 pb-2 mb-1 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Export As</span>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
            {exportFormats.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => handleExport(fmt.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                {fmt.icon}
                <div>
                  <div className="text-sm font-medium text-slate-800">{fmt.label}</div>
                  <div className="text-[11px] text-slate-400">{fmt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ExportMenu;
