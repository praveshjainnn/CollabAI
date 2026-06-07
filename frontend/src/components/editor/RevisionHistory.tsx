'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { History, X, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { VersionDiffModal } from './VersionDiffModal';
import { GitCompare } from 'lucide-react';

interface Revision {
  id: string;
  createdAt: string;
  user: { id: string; name: string; color: string };
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

import type { WebsocketProvider } from 'y-websocket';
import type * as Y from 'yjs';

import { IndexeddbPersistence } from 'y-indexeddb';

interface CollaborationState {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  persistence: IndexeddbPersistence;
}

interface RevisionHistoryProps {
  docId: string;
  onClose: () => void;
  currentContent: string;
  collaboration?: CollaborationState | null;
}

const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

export const RevisionHistory = ({ docId, onClose, currentContent, collaboration }: RevisionHistoryProps) => {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [diffingRevisionId, setDiffingRevisionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevisions = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/documents/${docId}/revisions`, {
          params: { page: pagination.page, pageSize: pagination.pageSize },
        });
        setRevisions(data.revisions || []);
        setPagination((prev) => ({ ...prev, ...(data.pagination || DEFAULT_PAGINATION) }));
      } catch (err) {
        console.error('Failed to fetch revisions', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchRevisions();
  }, [docId, pagination.page, pagination.pageSize]);

  return (
    <div className="w-[360px] border-l border-slate-200 bg-white flex flex-col h-full animate-slide-in">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-900 text-sm">Revision History</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No revisions yet</p>
            <p className="text-xs mt-1">Changes save automatically</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {revisions.map((rev, i) => (
              <div
                key={rev.id}
                className={`p-3 rounded-xl border transition-all hover:border-indigo-200 hover:bg-slate-50 ${
                  i === 0 ? 'border-indigo-200 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm"
                    style={{ background: rev.user.color }}
                  >
                    {rev.user.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">{rev.user.name}</span>
                  {i === 0 ? (
                    <span className="ml-auto text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                      Current
                    </span>
                  ) : (
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        onClick={() => setDiffingRevisionId(rev.id)}
                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 p-1.5 rounded-lg transition-all"
                        title="Compare with current version"
                      >
                        <GitCompare className="w-3 h-3" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Restore this version from ${formatDistanceToNow(new Date(rev.createdAt), { addSuffix: true })}?`)) {
                            try {
                              await api.post(`/documents/${docId}/revisions/${rev.id}/restore`);
                              toast.success('Document restored!');
                              
                              // Step 1: Disconnect and destroy the providers so they release the DB locks
                              if (collaboration) {
                                try {
                                  collaboration.provider.disconnect();
                                  collaboration.provider.destroy();
                                  collaboration.persistence.destroy();
                                } catch (e) {
                                  console.warn('Could not destroy collaboration providers:', e);
                                }
                              }
                              
                              // Step 2: Delete the IndexedDB cache for this document AFTER destroying connectors.
                              // CRITICAL: We wait for the deletion to succeed/timeout so we don't reload too fast.
                              try {
                                const dbNames = [docId, `${docId}-lib0-db` ];
                                for (const name of dbNames) {
                                  await new Promise<void>((resolve) => {
                                    const req = indexedDB.deleteDatabase(name);
                                    req.onsuccess = () => { console.log(`[IDB] Deleted ${name}`); resolve(); };
                                    req.onerror = () => { console.warn(`[IDB] Error deleting ${name}`); resolve(); };
                                    req.onblocked = () => { console.warn(`[IDB] Deletion blocked for ${name}`); resolve(); };
                                    // Safety timeout
                                    setTimeout(resolve, 500);
                                  });
                                }
                              } catch (idbErr) {
                                console.warn('Could not clear IndexedDB cache:', idbErr);
                              }
                              
                              window.location.reload();
                            } catch (err) {
                              console.error('Failed to restore', err);
                              toast.error('Failed to restore document');
                            }
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-all"
                      >
                        Restore
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium ml-7">
                  <Clock className="w-3 h-3" />
                  <span title={format(new Date(rev.createdAt), 'PPpp')}>
                    {formatDistanceToNow(new Date(rev.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-200 space-y-2">
        <PaginationControls
          compact
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
        />
        <p className="text-xs text-slate-400 text-center">
          Auto-saved on active edit sessions
        </p>
      </div>

      {diffingRevisionId && (
        <VersionDiffModal
          docId={docId}
          revisionId={diffingRevisionId}
          currentContent={currentContent}
          onClose={() => setDiffingRevisionId(null)}
        />
      )}
    </div>
  );
};
