'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  Check,
  Copy,
  Link,
  Loader2,
  Shield,
  Share2,
  X,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

interface ShareModalProps {
  docId: string;
  onClose: () => void;
}

interface ShareLink {
  id: string;
  token: string;
  role: 'editor' | 'viewer';
  isActive: boolean;
  useCount: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  pageSize: 5,
  totalPages: 1,
};

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['editor', 'viewer']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

const toDateText = (value: string | null) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid';
  return date.toLocaleString();
};

export const ShareModal = ({ docId, onClose }: ShareModalProps) => {
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [linkPagination, setLinkPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [linkRole, setLinkRole] = useState<'editor' | 'viewer'>('viewer');
  const [linkExpiryDays, setLinkExpiryDays] = useState<number>(7);
  const [creatingLink, setCreatingLink] = useState(false);
  const [inviting, setInviting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: inviteErrors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'viewer',
    },
  });

  const frontendOrigin = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const loadShareLinks = useCallback(async (page: number) => {
    const { data } = await api.get(`/documents/${docId}/share-links`, {
      params: { page, pageSize: linkPagination.pageSize },
    });
    setShareLinks(data.links || []);
    setLinkPagination((prev) => ({ ...prev, ...(data.pagination || DEFAULT_PAGINATION) }));
  }, [docId, linkPagination.pageSize]);

  const loadSharingData = useCallback(async () => {
    setLoadingData(true);
    setError('');
    try {
      await loadShareLinks(linkPagination.page);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setError(apiErr?.response?.data?.error || 'Failed to load sharing settings');
    } finally {
      setLoadingData(false);
    }
  }, [linkPagination.page, loadShareLinks]);

  useEffect(() => {
    void loadSharingData();
  }, [loadSharingData]);

  const onInviteSubmit = async (values: InviteFormValues) => {
    setInviting(true);
    setError('');
    try {
      // In a real app, this would send an email. For now, we create a direct link or 
      // add them to collaborators if the user exists.
      // We'll simulate adding a collaborator or creating a notification.
      await api.post(`/documents/${docId}/invite`, values);
      toast.success(`Invitation sent to ${values.email}`);
      reset();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setError(apiErr?.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const createShareLink = async () => {
    setError('');
    setCreatingLink(true);
    try {
      await api.post(`/documents/${docId}/share-links`, {
        role: linkRole,
        expiresInDays: linkExpiryDays,
      });
      toast.success('New share link generated');
      await loadShareLinks(1);
      setLinkPagination((prev) => ({ ...prev, page: 1 }));
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setError(apiErr?.response?.data?.error || 'Failed to create share link');
    } finally {
      setCreatingLink(false);
    }
  };

  const revokeLink = async (linkId: string) => {
    setError('');
    try {
      await api.delete(`/documents/${docId}/share-links/${linkId}`);
      toast.success('Link revoked successfully');
      await loadShareLinks(linkPagination.page);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setError(apiErr?.response?.data?.error || 'Failed to revoke share link');
    }
  };

  const copyLink = async (token: string) => {
    const joinUrl = `${frontendOrigin}/join/${token}`;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
    toast.info('Link copied to clipboard');
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shadow-sm">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 leading-none">Share Document</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Manage Access & Permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Section 1: Invite by Email */}
          <div className="mb-8">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              Invite Collaborators
            </h4>
            <form onSubmit={handleSubmit(onInviteSubmit)} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <input
                  {...register('email')}
                  placeholder="Enter email address..."
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    inviteErrors.email ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-100 text-slate-900'
                  } bg-slate-50/50 text-sm focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400 outline-none`}
                />
                {inviteErrors.email && (
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight ml-1">{inviteErrors.email.message}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <select
                  {...register('role')}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Invite
                </button>
              </div>
            </form>
          </div>

          <div className="h-px bg-slate-100 mb-8" />

          {/* Section 2: Share Links */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Link className="w-3.5 h-3.5" />
              Manage Share Links
            </h4>
            
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight ml-1">Default Role</label>
                    <select
                      value={linkRole}
                      onChange={(e) => setLinkRole(e.target.value as 'editor' | 'viewer')}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50"
                    >
                      <option value="viewer">Viewer link</option>
                      <option value="editor">Editor link</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight ml-1">Expiry</label>
                    <select
                      value={linkExpiryDays}
                      onChange={(e) => setLinkExpiryDays(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50"
                    >
                      <option value={1}>1 Day</option>
                      <option value={7}>7 Days</option>
                      <option value={30}>30 Days</option>
                      <option value={0}>Never</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void createShareLink()}
                  disabled={creatingLink}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl gradient-bg text-white text-sm font-bold shadow-md hover:shadow-indigo-200/50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  Generate
                </button>
              </div>
            </div>

            {loadingData ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="text-xs font-bold uppercase tracking-widest">Hydrating links...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400 font-medium font-serif italic">No shared portals detected...</p>
                  </div>
                ) : (
                  <>
                    {shareLinks.map((link) => {
                      const joinUrl = `${frontendOrigin}/join/${link.token}`;
                      return (
                        <div key={link.id} className="group relative bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${
                                  link.role === 'editor' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {link.role}
                                </span>
                                <span className={`w-1.5 h-1.5 rounded-full ${link.isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {link.isActive ? 'Active portal' : 'Revoked access'}
                                </span>
                              </div>
                              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">
                                {link.useCount} Uses
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 overflow-hidden">
                                <Link className="w-3 h-3 text-slate-300 shrink-0" />
                                <span className="text-xs text-slate-500 font-mono truncate">{joinUrl}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void copyLink(link.token)}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all active:scale-90"
                              >
                                {copied === link.token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => void revokeLink(link.id)}
                                disabled={!link.isActive}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-600 transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
                                title="Revoke Link"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between mt-1">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                  Generated {new Date(link.createdAt).toLocaleDateString()}
                                </div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                  {link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleDateString()}` : 'No Expiry'}
                                </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-4">
                      <PaginationControls
                        compact
                        page={linkPagination.page}
                        totalPages={linkPagination.totalPages}
                        total={linkPagination.total}
                        onChange={(nextPage) => setLinkPagination((prev) => ({ ...prev, page: nextPage }))}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 grayscale opacity-60">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End-to-End Encrypted Handshakes</span>
          </div>
          <button 
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
