import React, { useState } from 'react';
import { Mail, Send, Layout, Plus, Loader2, Paperclip, Type, Image as ImageIcon, Clock } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../api';
import toast from 'react-hot-toast';
import ScheduleModal from '../scheduler/ScheduleModal';

const MailerPage: React.FC = () => {
    const [recipients, setRecipients] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [targetDashboardId, setTargetDashboardId] = useState<number | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    const { data: dashboards } = useQuery<any[]>({
        queryKey: ['dashboards'],
        queryFn: async () => {
            const res = await api.get('/api/dashboards/');
            return res.data;
        },
    });

    const sendMutation = useMutation({
        mutationFn: async () => {
            setIsSending(true);
            try {
                const response = await api.post('/api/mailer/send', {
                    to: recipients.split(',').map(e => e.trim()),
                    subject,
                    body,
                    dashboard_id: targetDashboardId,
                    include_snapshot: true
                });
                return response.data;
            } finally {
                setIsSending(false);
            }
        },
        onSuccess: () => {
            toast.success('Email report sent successfully!');
            setRecipients('');
            setSubject('');
            setBody('');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.detail || 'Failed to send email');
        }
    });

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-brand/10 dark:bg-brand/20 rounded-xl text-brand">
                            <Mail size={24} />
                        </div>
                        Smart Mailer
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Design and distribute high-impact dashboard reports</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Composition Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Plus size={16} className="text-brand" /> New Report Campaign
                            </h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Recipients</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-500" />
                                        <input 
                                            type="text" 
                                            value={recipients}
                                            onChange={(e) => setRecipients(e.target.value)}
                                            placeholder="Comma separated emails..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-100 focus:ring-4 focus:ring-brand/10 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Target Dashboard</label>
                                    <div className="relative">
                                        <Layout size={16} className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-500" />
                                        <select 
                                            value={targetDashboardId || ''}
                                            onChange={(e) => setTargetDashboardId(Number(e.target.value))}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-100 focus:ring-4 focus:ring-brand/10 transition-all outline-none appearance-none"
                                        >
                                            <option value="">None (Custom Email Only)</option>
                                            {dashboards?.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Subject Line</label>
                                <div className="relative">
                                    <Type size={16} className="absolute left-3 top-3.5 text-slate-400 dark:text-slate-500" />
                                    <input 
                                        type="text" 
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="e.g. Weekly Sales Summary - {{date}}"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-100 focus:ring-4 focus:ring-brand/10 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Message Body</label>
                                <textarea 
                                    rows={6}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Write a brief intro for your report..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-100 outline-none resize-none focus:ring-4 focus:ring-brand/10 transition-all"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 transition-colors" title="Attach Files">
                                        <Paperclip size={20} />
                                    </button>
                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 transition-colors" title="Embed Images">
                                        <ImageIcon size={20} />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => sendMutation.mutate()}
                                    disabled={isSending || !recipients}
                                    className="flex items-center gap-2 px-8 py-3 bg-brand text-white rounded-xl font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-all disabled:opacity-50"
                                >
                                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    Send Report Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Options */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Delivery Options</h3>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-brand/5 dark:hover:bg-brand/10 transition-colors group">
                                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-brand focus:ring-brand dark:bg-slate-950 dark:border-slate-700" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-brand transition-colors">Include PDF Snapshot</span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">High-fidelity layout capture</span>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-brand/5 dark:hover:bg-brand/10 transition-colors group">
                                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-brand focus:ring-brand dark:bg-slate-950 dark:border-slate-700" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-brand transition-colors">Interactive Link</span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Direct access to live dashboard</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="bg-brand/5 dark:bg-brand/10 rounded-3xl border border-brand/10 dark:border-brand/20 p-6 text-center">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-brand mx-auto mb-4 shadow-sm border border-brand/5 dark:border-brand/10">
                            <Clock size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Automate this Report?</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-6">Schedule this campaign to run daily, weekly, or monthly.</p>
                        <button 
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="w-full py-2.5 bg-white dark:bg-slate-800 border border-brand/20 dark:border-brand/40 text-brand dark:text-brand-light text-xs font-bold rounded-xl hover:bg-brand dark:hover:bg-brand hover:text-white dark:hover:text-white transition-all shadow-sm"
                        >
                            Setup Recurring Schedule
                        </button>
                    </div>
                </div>
            </div>

            <ScheduleModal 
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSuccess={() => toast.success('Recurring report scheduled!')}
                initialData={{
                    name: subject || 'Automated Dashboard Report',
                    targetId: targetDashboardId || undefined,
                    recipients: recipients
                }}
            />
        </div>
    );
};

export default MailerPage;
