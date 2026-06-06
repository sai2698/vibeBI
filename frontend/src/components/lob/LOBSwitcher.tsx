import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronDown } from 'lucide-react';
import api from '../../api';
import { useLOBStore, type LOB } from '../../store/useLOBStore';

const LOBSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { activeLOB, setActiveLOB, setLOBs } = useLOBStore();

  const { data: lobs } = useQuery<LOB[]>({
    queryKey: ['lobs'],
    queryFn: async () => {
      // Fetch all LOBs.
      const response = await api.get('/api/lob/');
      return response.data;
    },
  });

  useEffect(() => {
    if (lobs) {
      setLOBs(lobs);
      if (lobs.length > 0) {
        if (!activeLOB || !lobs.find(l => l.id === activeLOB.id)) {
          setActiveLOB(lobs[0]);
        }
      } else {
        setActiveLOB(null);
      }
    }
  }, [lobs, activeLOB, setLOBs, setActiveLOB]);

  const handleSelect = (lob: LOB) => {
    setActiveLOB(lob);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={lobs?.length === 0}
        className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm transition-colors ${lobs?.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
      >
        <Building2 size={18} className="text-slate-500 dark:text-slate-400" />
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {lobs?.length === 0 ? 'No LOBs Created' : (activeLOB ? activeLOB.name : 'Select LOB')}
        </span>
        <ChevronDown size={16} className="text-slate-400 dark:text-slate-500 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1 z-50">
          {lobs?.length === 0 ? (
            <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">No LOBs available</div>
          ) : (
            lobs?.map((lob) => (
              <button
                key={lob.id}
                onClick={() => handleSelect(lob)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  activeLOB?.id === lob.id ? 'bg-brand/5 dark:bg-brand/10 text-brand font-medium' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {lob.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LOBSwitcher;
