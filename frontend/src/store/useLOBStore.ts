import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LOB {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface LOBState {
  activeLOB: LOB | null;
  lobs: LOB[];
  setActiveLOB: (lob: LOB | null) => void;
  setLOBs: (lobs: LOB[]) => void;
}

export const useLOBStore = create<LOBState>()(
  persist(
    (set) => ({
      activeLOB: null,
      lobs: [],
      setActiveLOB: (lob) => set({ activeLOB: lob }),
      setLOBs: (lobs) => set({ lobs }),
    }),
    {
      name: 'lob-storage',
    }
  )
);
