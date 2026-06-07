'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  FileText, Plus, Trash2, LogOut, Loader2,
  Clock, Search, MoreVertical, Edit3,
  FilePlus, LayoutGrid, ChevronRight, Upload, Sparkles,
} from 'lucide-react';
import { PaginationControls } from '@/components/ui/PaginationControls';

interface Document {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  role: string;
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
  pageSize: 12,
  totalPages: 1,
};

export default function DashboardPage() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchDocuments = useCallback(async (page: number, q: string) => {
    if (page === 1) setLoading(true);
    try {
      const { data } = await api.get('/documents', {
        params: {
          page,
          pageSize: pagination.pageSize,
          q,
        },
      });
      setDocuments(data.documents || []);
      setPagination((prev) => ({
        ...prev,
        ...(data.pagination || DEFAULT_PAGINATION),
      }));
    } catch (err) {
      console.error('Failed to fetch documents', err);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchDocuments(pagination.page, searchQuery);
    }
  }, [fetchDocuments, isAuthenticated, pagination.page, searchQuery]);

  const createDocument = async () => {
    setCreating(true);
    try {
      const { data } = await api.post('/documents', { title: 'Untitled Document' });
      toast.success('Document created!');
      router.push(`/document/${data.document.id}`);
    } catch (err) {
      console.error('Failed to create document', err);
      toast.error('Failed to create document');
      setCreating(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import('mammoth');
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      const title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      
      const { data } = await api.post('/documents', { title: title || 'Imported Document' });
      const docId = data.document.id;
      
      sessionStorage.setItem(`import_content_${docId}`, html);
      toast.success('Document imported successfully!');
      router.push(`/document/${docId}`);
    } catch (err) {
      console.error('Import failed', err);
      toast.error('Failed to import document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteDocument = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      await fetchDocuments(pagination.page, searchQuery);
    } catch (err: any) {
      console.error('Failed to delete document', id, err);
      const msg = err.response?.data?.error || err.message;
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setDeletingId(null);
      setMenuOpen(null);
      setConfirmDeleteId(null);
    }
  };

  const recentDocuments = useMemo(() => {
    return documents.slice(0, 4);
  }, [documents]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfdf9]">
        <Loader2 className="w-8 h-8 text-[#799602] animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fcfdf9', color: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', position: 'relative' }}>
      
      {/* subtle grid texture overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(227,249,136,0.18) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />

      {/* Navigation */}
      <header className="sticky top-0 z-50" style={{
        background: 'rgba(252,253,249,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(227,249,136,0.3)',
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-auto sm:h-16 py-3 sm:py-0 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8">
          <div className="w-full sm:w-auto flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 group transition-transform active:scale-95" style={{ textDecoration: 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px',
                background: 'linear-gradient(135deg, #e3f988, #b5d926)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 14px rgba(227,249,136,0.5)' }}>
                <Sparkles className="text-slate-900" style={{ width: '15px', height: '15px' }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a', letterSpacing: '-0.025em' }}>
                Collab<span style={{ color: '#799602' }}>AI</span>
              </span>
            </Link>

            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={createDocument}
                disabled={creating}
                style={{
                  background: 'linear-gradient(135deg, #e3f988, #b5d926)',
                  boxShadow: '0 2px 10px rgba(227,249,136,0.35)',
                  color: '#0f172a'
                }}
                className="text-xs font-bold h-9 px-3.5 rounded-xl hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer border-0"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>New</span>
              </button>
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shadow-sm border-2 border-[rgba(227,249,136,0.5)]"
                style={{ background: user?.color || '#799602' }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-xl relative group sm:order-0">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-[#799602] transition-colors" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search documents..."
              style={{
                border: '1px solid rgba(227,249,136,0.3)',
                backgroundColor: '#ffffff',
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <input
              type="file"
              accept=".docx"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || creating}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(227,249,136,0.3)',
                color: '#334155',
              }}
              className="text-sm font-bold h-10 px-4 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Upload Word Document (.docx)"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-slate-500" />}
              <span>Import</span>
            </button>
            <button
              onClick={createDocument}
              disabled={creating}
              style={{
                background: 'linear-gradient(135deg, #e3f988, #b5d926)',
                boxShadow: '0 2px 12px rgba(227,249,136,0.35)',
                color: '#0f172a'
              }}
              className="text-sm font-bold h-10 px-4.5 rounded-xl hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer border-0"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>New Document</span>
            </button>

            <div className="h-6 w-px bg-[rgba(227,249,136,0.4)] mx-1" />

            <div className="flex items-center gap-3">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm border-2 border-[rgba(227,249,136,0.5)]"
                style={{ background: user?.color || '#799602' }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-none mb-1">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Collaborator</p>
              </div>
              <button
                onClick={logout}
                style={{ border: '1px solid rgba(227,249,136,0.2)' }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8" style={{ position: 'relative', zIndex: 1 }}>
        {!loading && documents.length > 0 && searchQuery === '' && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-[#799602]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Recently updated</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => router.push(`/document/${doc.id}`)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(227,249,136,0.3)',
                  }}
                  className="p-4.5 rounded-2xl shadow-sm cursor-pointer hover:-translate-y-0.5 hover:border-[#799602]/50 hover:shadow-md hover:shadow-lime-500/5 transition-all group flex items-center sm:block gap-4 sm:gap-0"
                >
                  <div style={{ backgroundColor: 'rgba(227,249,136,0.15)', border: '1px solid rgba(227,249,136,0.3)' }} className="w-9 h-9 rounded-xl flex items-center justify-center mb-0 sm:mb-3.5 group-hover:scale-105 transition-transform shrink-0">
                    <FileText className="w-4.5 h-4.5 text-[#799602]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 group-hover:text-[#799602] transition-colors truncate mb-1 text-sm">{doc.title}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4.5 h-4.5 text-[#799602]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {searchQuery ? `Search results for "${searchQuery}"` : 'All documents'}
            </h2>
          </div>
          <p className="text-xs font-bold text-[#799602] bg-[#f4fbe2] border border-[rgba(227,249,136,0.4)] rounded-full px-3 py-1">
            {pagination.total} documents
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ backgroundColor: '#ffffff', border: '1px solid rgba(227,249,136,0.2)' }} className="h-44 rounded-2xl shadow-sm animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(227,249,136,0.3)' }} className="flex flex-col items-center justify-center py-20 text-center rounded-2xl shadow-sm px-6 max-w-2xl mx-auto">
            <div style={{ backgroundColor: 'rgba(227,249,136,0.15)', border: '1px solid rgba(227,249,136,0.3)' }} className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
              <FilePlus className="w-7 h-7 text-[#799602] opacity-90" />
            </div>
            <h2 style={{ letterSpacing: '-0.02em' }} className="text-xl font-bold text-slate-800 mb-2">
              {searchQuery ? 'No documents found' : 'Create your first document'}
            </h2>
            <p className="text-slate-400 mb-6 max-w-sm text-sm font-medium leading-relaxed">
              {searchQuery 
                ? 'We couldn\'t find any documents matching your current search criteria.' 
                : 'Work together seamlessly with real-time editing. Create a document to begin collaborating.'}
            </p>
            {!searchQuery && (
              <button
                onClick={createDocument}
                disabled={creating}
                style={{
                  background: 'linear-gradient(135deg, #e3f988, #b5d926)',
                  boxShadow: '0 2px 10px rgba(227,249,136,0.35)',
                  color: '#0f172a'
                }}
                className="font-bold px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer border-0"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Get Started
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc, i) => (
              <div
                key={doc.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(227,249,136,0.3)',
                  animationDelay: `${i * 30}ms`
                }}
                className={`group relative rounded-2xl p-5.5 flex flex-col hover:border-[#799602] hover:shadow-md hover:shadow-lime-500/5 transition-all duration-300 animate-fade-in cursor-pointer ${
                  menuOpen === doc.id ? 'z-50' : 'z-0'
                }`}
                onClick={() => router.push(`/document/${doc.id}`)}
              >
                <div className="flex items-start justify-between mb-5">
                  <div style={{ backgroundColor: 'rgba(227,249,136,0.12)', border: '1px solid rgba(227,249,136,0.25)' }} className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                    <FileText className="w-5.5 h-5.5 text-[#799602]" />
                  </div>
                  
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === doc.id ? null : doc.id);
                      }}
                      className="w-9 h-9 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors border-0 cursor-pointer"
                      type="button"
                    >
                      <MoreVertical className="w-4.5 h-4.5" />
                    </button>
                    
                    {menuOpen === doc.id && (
                      <div style={{ border: '1px solid rgba(227,249,136,0.3)', boxShadow: '0 8px 24px rgba(227,249,136,0.08)' }} className="absolute right-0 mt-1.5 bg-white rounded-xl py-1.5 z-60 w-44 animate-scale-in origin-top-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/document/${doc.id}`);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#f4fbe2] hover:text-[#799602] flex items-center gap-2.5 transition-colors font-bold border-0 cursor-pointer"
                          type="button"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#799602]" />
                          Open Editor
                        </button>
                        {doc.role === 'owner' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(doc.id);
                              setMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors font-bold border-t border-slate-100 border-0 cursor-pointer"
                            type="button"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            Delete Document
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 mb-5">
                  <h3 className="font-extrabold text-lg text-slate-800 group-hover:text-[#799602] transition-colors truncate mb-1.5">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-350" />
                      {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    <div style={{ fontSize: '9px' }} className={`font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      doc.role === 'owner' 
                        ? 'bg-[#f4fbe2] text-[#799602] border border-[rgba(227,249,136,0.3)]' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                    }`}>
                      {doc.role}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex -space-x-1.5">
                    <div className="w-6.5 h-6.5 rounded-lg border-2 border-white bg-[#f4fbe2] text-[#799602] flex items-center justify-center text-[9px] font-bold">
                      CO
                    </div>
                  </div>
                  <div className="text-[#799602] font-extrabold text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    Edit Document <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {documents.length > 0 && (
          <div className="mt-12 flex justify-center">
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
            />
          </div>
        )}
      </main>

      {/* Overlays */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
      )}

      {confirmDeleteId && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div 
            style={{ border: '1px solid rgba(227,249,136,0.3)', backgroundColor: '#ffffff' }}
            className="rounded-2xl p-8 w-full max-w-md relative z-[110] shadow-xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mb-5 text-rose-500 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Wait, delete this?</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
              The document <span className="text-slate-700 font-bold">"{documents.find(d => d.id === confirmDeleteId)?.title}"</span> will be gone forever. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{ border: '1px solid rgba(227,249,136,0.3)', color: '#64748b' }}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all border-0 cursor-pointer"
                disabled={deletingId === confirmDeleteId}
              >
                No, Keep it
              </button>
              <button
                onClick={() => confirmDeleteId && deleteDocument(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-[2] bg-rose-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-2 border-0 cursor-pointer"
              >
                {deletingId === confirmDeleteId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
