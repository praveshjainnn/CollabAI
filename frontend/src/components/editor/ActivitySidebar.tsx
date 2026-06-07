'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { X, Activity, User, Clock, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivitySidebarProps {
  docId: string;
  onClose: () => void;
}

interface Revision {
  id: string;
  version: number;
  saveReason: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    color: string;
  };
}

export const ActivitySidebar = ({ docId, onClose }: ActivitySidebarProps) => {
  const [activities, setActivities] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchActivities = useCallback(async () => {
    try {
      const { data } = await api.get(`/documents/${docId}/revisions`, {
        params: { pageSize: 20 }
      });
      setActivities(data.revisions || []);
    } catch (err: any) {
      setError('Failed to load recent activity');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    void fetchActivities();
    const interval = setInterval(fetchActivities, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchActivities]);

  return (
    <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full shadow-2xl animate-slide-in-right z-30">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <h2 className="font-bold text-slate-900 tracking-tight">Activity Feed</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading && activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Tracking history...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold leading-snug">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {activities.map((rev, idx) => (
              <div key={rev.id} className="relative pl-6 group">
                {idx < activities.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-slate-100 group-hover:bg-indigo-100 transition-colors" />
                )}
                <div 
                  className="absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full border-2 border-white ring-2 ring-slate-50 flex items-center justify-center shadow-sm z-10"
                  style={{ backgroundColor: rev.user.color }}
                >
                  <User className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 leading-tight">{rev.user.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDistanceToNow(new Date(rev.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {rev.saveReason === 'restore' ? (
                      <span className="flex items-center gap-1 text-indigo-600 font-bold">
                        <RotateCcw className="w-3 h-3" />
                        Restored version {rev.version}
                      </span>
                    ) : (
                      `Saved changes to version ${rev.version}`
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-50 bg-slate-50/30">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center leading-normal">
          Real-time activity tracking active
        </p>
      </div>
    </div>
  );
};
