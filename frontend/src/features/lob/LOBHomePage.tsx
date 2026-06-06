import React from 'react';
import { useParams } from 'react-router-dom';
import { useLOBStore } from '../../store/useLOBStore';
import { LayoutDashboard, Star, Clock } from 'lucide-react';

const LOBHomePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeLOB, lobs } = useLOBStore();

  // Find LOB by id if available
  const lob = lobs.find(l => l.id === Number(id)) || activeLOB;

  if (!lob) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">LOB not found</p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner"
            style={{ backgroundColor: lob.color || '#6366F1' }}
          >
            {/* Real implementation would use the dynamic icon string mapped to Lucide component */}
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{lob.name}</h1>
            <p className="text-slate-500">{lob.description || 'Welcome to the ' + lob.name + ' workspace'}</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 cols */}
        <div className="lg:col-span-2 space-y-6">

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Star className="text-amber-500" size={20} />
              Featured Dashboards
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Stub Cards for Featured Dashboards */}
            {[1, 2].map((i) => (
              <div key={i} className="card hover:shadow-md transition-shadow cursor-pointer group">
                <div className="aspect-video bg-slate-100 rounded-lg mb-3 relative overflow-hidden flex items-center justify-center border border-slate-200">
                  <span className="text-slate-400 font-medium">Chart Preview</span>
                </div>
                <h3 className="font-semibold text-slate-800 group-hover:text-brand transition-colors">Executive Summary {i}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Clock size={12} /> Last updated 2 hrs ago
                </p>
              </div>
            ))}
          </div>

        </div>

        {/* Sidebar Column - 1 col */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    U
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">User updated <span className="font-medium">Sales Pipeline</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LOBHomePage;
