import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { X, Calculator, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface CalculatedColumnFormData {
  name: string;
  expression: string;
  friendly_name?: string;
  description?: string;
  data_type?: string;
  is_filterable?: boolean;
  is_visible?: boolean;
  dataset_id: number;
}

interface CalculatedColumnFormModalProps {
  isOpen: boolean;
  datasetId: number;
  onClose: () => void;
}

const CalculatedColumnFormModal: React.FC<CalculatedColumnFormModalProps> = ({ isOpen, datasetId, onClose }) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CalculatedColumnFormData>();

  const createMutation = useMutation({
    mutationFn: (newCol: CalculatedColumnFormData) => api.post(`/api/datasets/${datasetId}/calculated-columns`, newCol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets', datasetId] });
      reset();
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Add Calculated Column</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit => createMutation.mutate({ ...onSubmit, dataset_id: datasetId }))} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Column Name (ID)</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono"
              placeholder="e.g. total_amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Friendly Name</label>
            <input
              {...register('friendly_name')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              placeholder="e.g. Total Amount ($)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SQL Expression</label>
            <textarea
              {...register('expression', { required: 'Expression is required' })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono text-sm"
              placeholder="amount * quantity * (1 - discount)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data Type (Optional)</label>
            <select
              {...register('data_type')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm"
            >
              <option value="">Auto-detect</option>
              <option value="INTEGER">INTEGER</option>
              <option value="DECIMAL">DECIMAL</option>
              <option value="VARCHAR">VARCHAR</option>
              <option value="DATE">DATE</option>
              <option value="BOOLEAN">BOOLEAN</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm resize-none"
              placeholder="Business logic for this calculated column..."
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_filterable')}
                defaultChecked={true}
                className="w-4 h-4 text-brand border-slate-300 rounded focus:ring-brand"
              />
              <span className="text-sm text-slate-700">Filterable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_visible')}
                defaultChecked={true}
                className="w-4 h-4 text-brand border-slate-300 rounded focus:ring-brand"
              />
              <span className="text-sm text-slate-700">Visible</span>
            </label>
          </div>

          {createMutation.isError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>Failed to create calculated column.</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-brand text-white rounded-lg text-sm font-bold hover:bg-brand-dark transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Calculated Column'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalculatedColumnFormModal;
