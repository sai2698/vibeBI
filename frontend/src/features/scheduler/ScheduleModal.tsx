import React, { useState } from 'react';
import { X, Clock, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        name?: string;
        targetId?: number;
        recipients?: string;
    }
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState(initialData?.name || '');
    const [cron, setCron] = useState('0 9 * * 1-5'); // Default: 9 AM weekdays
    const [targetType] = useState('dashboard');
    const [targetId, setTargetId] = useState<number | null>(initialData?.targetId || null);
    const [recipients, setRecipients] = useState(initialData?.recipients || '');
    const [subject] = useState('');

    const { data: dashboards } = useQuery<any[]>({
        queryKey: ['dashboards'],
        queryFn: async () => {
            const res = await api.get('/api/dashboards/');
            return res.data;
        },
        enabled: isOpen
    });

    if (!isOpen) return null;

    const handleSave = async () => {
        try {
            // 1. Create Schedule
            const schedRes = await api.post('/api/schedules/', {
                name,
                target_type: targetType,
                target_id: targetId,
                cron_expression: cron,
                timezone: 'UTC',
                is_active: true
            });

            // 2. Create Email Report
            await api.post('/api/schedules/reports', {
                name: `${name} Report`,
                schedule_id: schedRes.data.id,
                recipients: { emails: recipients.split(',').map(e => e.trim()) },
                subject_template: subject || `Automated Report: ${name}`,
                body_template: "Please find the requested dashboard report attached.",
                include_charts: []
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand/10 dark:bg-brand/20 rounded-xl flex items-center justify-center text-brand">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">New Automated Schedule</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Configure recurring reports and data syncs</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} className="text-slate-400 dark:text-slate-500" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Stepper */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-800'}`} />
                        <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-800'}`} />
                    </div>

                    {step === 1 ? (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block ml-1">Schedule Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Weekly Sales Performance"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100 focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block ml-1">Frequency (Cron)</label>
                                <div className="relative">
                                    <Clock size={18} className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-500" />
                                    <input 
                                        type="text" 
                                        value={cron}
                                        onChange={(e) => setCron(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm dark:text-slate-100 focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic ml-1">Format: minute hour day-of-month month day-of-week</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block ml-1">Target Dashboard</label>
                                <select 
                                    value={targetId || ''}
                                    onChange={(e) => setTargetId(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-100 outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all text-sm font-medium"
                                >
                                    <option value="">Select Dashboard...</option>
                                    {dashboards?.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block ml-1">Email Recipients</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-500" />
                                    <input 
                                        type="text" 
                                        value={recipients}
                                        onChange={(e) => setRecipients(e.target.value)}
                                        placeholder="Comma separated emails..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-100 focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    {step > 1 ? (
                        <button onClick={() => setStep(1)} className="px-6 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            Back
                        </button>
                    ) : <div />}
                    
                    <button 
                        onClick={() => step === 1 ? setStep(2) : handleSave()}
                        className="flex items-center gap-2 px-8 py-2.5 bg-brand text-white rounded-xl font-bold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all transform active:scale-95"
                    >
                        {step === 1 ? 'Next Step' : 'Finish & Activate'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleModal;
