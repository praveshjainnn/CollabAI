'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api, WS_URL } from '@/lib/api';
import { useEditor, EditorContent } from '@tiptap/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { createEditorExtensions } from '@/components/editor/config/createEditorExtensions';
import { Toolbar } from '@/components/editor/Toolbar';
import { FloatingToolbar } from '@/components/editor/FloatingToolbar';
import { PresenceBar } from '@/components/editor/PresenceBar';
import { RevisionHistory } from '@/components/editor/RevisionHistory';
import { ActivitySidebar } from '@/components/editor/ActivitySidebar';
import { ShortcutsModal } from '@/components/editor/ShortcutsModal';
import { ShareModal } from '@/components/editor/ShareModal';
import { SlashCommandMenu } from '@/components/editor/slash/SlashCommandMenu';
import { useSlashCommands } from '@/components/editor/slash/useSlashCommands';
import { CommentsSidebar } from '@/components/editor/CommentsSidebar';
import { CommentModal } from '@/components/editor/CommentModal';
import {
  FileText, ArrowLeft, Share2, History, Activity, Download, Eye,
  Loader2, CheckCircle, AlertCircle, Scissors, MessageCircle, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

interface OnlineUser {
  id: string;
  name: string;
  color: string;
  cursor?: unknown;
}

interface Document {
  id: string;
  title: string;
  role: string;
}

type SyncStatus = 'connecting' | 'connected' | 'disconnected';
type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';
type CollaborationState = { 
  ydoc: Y.Doc; 
  provider: WebsocketProvider;
  persistence: IndexeddbPersistence;
};

export default function DocumentPage() {
  const params = useParams();
  const docId = params.id as string;
  const router = useRouter();
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();

  const [document, setDocument] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentModalPos, setCommentModalPos] = useState({ top: 0, left: 0 });
  const [collaboration, setCollaboration] = useState<CollaborationState | null>(null);
  const [teammates, setTeammates] = useState<OnlineUser[]>([]);
  const teammatesRef = useRef<OnlineUser[]>(teammates);
  useEffect(() => {
    teammatesRef.current = teammates;
  }, [teammates]);
  const [isExporting, setIsExporting] = useState(false);
  const backButtonRef = useRef<HTMLAnchorElement>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoFocusEditor = useRef(false);
  const isReadOnly = document?.role === 'viewer';
  const userId = user?.id ?? '';
  const userName = user?.name ?? 'Anonymous';
  const userColor = user?.color ?? '#6366f1';

  useEffect(() => {
    if (backButtonRef.current) {
      const instance = tippy(backButtonRef.current, {
        content: 'Back to Dashboard',
        theme: 'premium',
      });
      return () => instance.destroy();
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    };
  }, []);

  // Fetch document metadata
  useEffect(() => {
    if (!isAuthenticated || !docId) return;
    api.get(`/documents/${docId}`)
      .then(({ data }) => {
        setDocument(data.document);
        setTitle(data.document.title);
        
        // Also fetch collaborators for mentions
        api.get(`/documents/${docId}/collaborators`).then(({ data: collabData }) => {
          setTeammates(collabData.collaborators || []);
        });
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setDocLoading(false));
  }, [docId, isAuthenticated, router]);

  // Yjs collaboration setup (sync + presence)
  useEffect(() => {
    if (!docId || !userId || !userName) return;

    const ydoc = new Y.Doc();
    const headers = {
      'Sec-WebSocket-Protocol': token || '',
    };
    const provider = new WebsocketProvider(`${WS_URL}/ws`, docId, ydoc, {
      connect: true,
      params: { token: token || '' },
    });

    provider.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor,
    });

    const handleAwarenessChange = () => {
      const dedupedUsers = new Map<string, OnlineUser>();
      provider.awareness.getStates().forEach((state, clientID) => {
        const presence = state as { user?: OnlineUser; cursor?: unknown } | null;
        if (!presence?.user?.id || !presence.user.name) {
          return;
        }
        
        // Always prefer the mapping by ID to avoid duplicates across multiple devices by same user
        dedupedUsers.set(presence.user.id, {
          id: presence.user.id,
          name: presence.user.name,
          color: presence.user.color || '#6366f1',
          cursor: presence.cursor,
        });
      });
      setOnlineUsers(Array.from(dedupedUsers.values()));
    };

    provider.on('status', ({ status }: { status: string }) => {
      setSyncStatus(status as SyncStatus);
    });
    provider.on('sync', (isSynced: boolean) => {
      setSyncStatus(isSynced ? 'connected' : 'connecting');
    });

    const persistence = new IndexeddbPersistence(docId, ydoc);
    
    persistence.on('synced', () => {
      console.log(`[IDB] Doc ${docId} loaded from local storage`);
    });

    provider.awareness.on('change', handleAwarenessChange);
    handleAwarenessChange();
    
    setCollaboration({ ydoc, provider, persistence });

    return () => {
      provider.awareness.off('change', handleAwarenessChange);
      provider.destroy();
      persistence.destroy();
      ydoc.destroy();
      setCollaboration(null);
      setOnlineUsers([]);
      setSyncStatus('disconnected');
    };
  }, [docId, token, userId, userName, userColor]);

  // Tiptap editor (created after provider is ready)
  const editor = useEditor({
    extensions: createEditorExtensions({
      collaboration,
      user: {
        id: userId,
        name: userName,
        color: userColor,
      },
      // Pass the ref to prevent useEditor re-init on every peer movement
      teammates: teammatesRef.current,
    }),
    editorProps: {
      attributes: {
        class: 'doc-prose focus:outline-none',
        spellcheck: 'true',
        'data-placeholder': 'Start writing your collaborative document...',
      },
    },
    editable: !isReadOnly,
    immediatelyRender: false,
    onUpdate: () => {
      setSaveStatus('saving');
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = setTimeout(() => setSaveStatus('saved'), 1500);
    },
  }, [collaboration, userId, userName, userColor, isReadOnly]);

  useEffect(() => {
    if (!editor || isReadOnly || syncStatus !== 'connected') return;

    const importKey = `import_content_${docId}`;
    try {
      const importContent = sessionStorage.getItem(importKey);
      if (importContent) {
        editor.commands.setContent(importContent);
        sessionStorage.removeItem(importKey);
        setTimeout(() => toast.success('Word document processed!'), 500);
      }
    } catch {
      // ignore
    }

    if (didAutoFocusEditor.current) return;
    didAutoFocusEditor.current = true;
    requestAnimationFrame(() => {
      if (!editor.isDestroyed) {
        editor.commands.focus('start');
      }
    });
  }, [editor, isReadOnly, syncStatus, docId]);

  // Save title
  const saveTitle = useCallback(async (newTitle: string) => {
    if (!docId || isReadOnly || newTitle === document?.title) return;
    try {
      await api.patch(`/documents/${docId}`, { title: newTitle });
      setDocument((d) => (d ? { ...d, title: newTitle } : d));
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save title', err);
      setSaveStatus('error');
    }
  }, [docId, document?.title, isReadOnly]);

  const handleTitleBlur = () => {
    const nextTitle = title.trim() || 'Untitled Document';
    setTitle(nextTitle);
    setEditingTitle(false);
    saveTitle(nextTitle);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const nextTitle = title.trim() || 'Untitled Document';
      setTitle(nextTitle);
      setEditingTitle(false);
      saveTitle(nextTitle);
    }
    if (e.key === 'Escape') {
      setTitle(document?.title ?? '');
      setEditingTitle(false);
    }
  };

  const handleDownload = async (type: 'pdf' | 'docx') => {
    if (!editor || isExporting) return;
    setIsExporting(true);
    try {
      const html = editor.getHTML();
      const safeTitle = (title || 'Untitled Document').trim();

      if (type === 'pdf') {
        const html2pdf = (await import('html2pdf.js')).default;
        
        // Create a temporary container to style the A4 document for PDF generation
        const container = window.document.createElement('div');
        container.innerHTML = `
          <div class="pdf-export-container">
            ${html}
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap');
              .pdf-export-container { 
                font-family: 'Inter', -apple-system, sans-serif; 
                line-height: 1.65; 
                color: #1a1a1a; 
                padding: 0; 
                margin: 0;
                width: 792px; 
                background: white;
                font-size: 11pt;
              }
              .pdf-export-container h1 { font-size: 28pt; font-weight: 700; margin-bottom: 24pt; margin-top: 0; color: #000; letter-spacing: -0.02em; }
              .pdf-export-container h2 { font-size: 20pt; font-weight: 600; margin-top: 24pt; margin-bottom: 12pt; color: #111; border-bottom: 1px solid #eee; padding-bottom: 4pt; }
              .pdf-export-container h3 { font-size: 16pt; font-weight: 600; margin-top: 18pt; margin-bottom: 8pt; color: #222; }
              .pdf-export-container p { margin-bottom: 12pt; text-align: justify; }
              .pdf-export-container ul, .pdf-export-container ol { margin-bottom: 12pt; padding-left: 20pt; }
              .pdf-export-container li { margin-bottom: 4pt; }
              .pdf-export-container blockquote { border-left: 4pt solid #6366f1; padding: 8pt 16pt; color: #444; font-style: italic; margin: 16pt 0; background: #f8fafc; border-radius: 0 8pt 8pt 0; }
              .pdf-export-container pre { background: #1e293b; color: #f8fafc; padding: 16pt; border-radius: 8pt; font-size: 9pt; margin: 16pt 0; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; page-break-inside: avoid; }
              .pdf-export-container code { background: #f1f5f9; color: #475569; padding: 2pt 4pt; border-radius: 4pt; font-size: 0.9em; font-family: 'JetBrains Mono', monospace; }
              .pdf-export-container pre code { background: transparent; color: inherit; padding: 0; }
              .pdf-export-container table { border-collapse: collapse; width: 100%; margin: 20pt 0; page-break-inside: avoid; }
              .pdf-export-container th, .pdf-export-container td { border: 1px solid #e2e8f0; padding: 8pt 12pt; text-align: left; font-size: 10pt; }
              .pdf-export-container th { background: #f8fafc; font-weight: 700; color: #334155; }
              .pdf-export-container img { 
                display: block;
                max-width: 100%; 
                height: auto; 
                margin: 20pt auto; 
                border-radius: 8pt; 
                box-shadow: 0 4pt 12pt rgba(0,0,0,0.05);
                page-break-inside: avoid;
              }
              .pdf-export-container hr { border: none; border-top: 1px solid #e2e8f0; margin: 24pt 0; }
              .pdf-export-container .page-break { page-break-after: always; height: 0; margin: 0; border: none; }
            </style>
          </div>
        `;

        const opt = {
          margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number], // 0.5 inch margins
          filename: `${safeTitle.replace(/[^\w\-]+/g, '_')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const },
          pagebreak: { mode: ['css', 'legacy'] as ['css', 'legacy'] }
        };

        // Run html2pdf
        await html2pdf().from(container).set(opt).save();
        toast.success('PDF downloaded smoothly!');
      } else {
        // Handle DOCX export via backend.
        // The backend returns one of two shapes depending on whether S3 is configured:
        //   Shape A (S3):      { download_url: string, filename: string, expires_in: number }
        //   Shape B (fallback): binary arraybuffer  ←  original behaviour
        //
        // We probe the Content-Type header first to decide which path to take.
        const rawResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ''}/documents/${docId}/export`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: editor.getHTML(), title: title || 'document' }),
            credentials: 'include',
          }
        );

        if (!rawResponse.ok) {
          throw new Error(`Export failed: ${rawResponse.status}`);
        }

        const contentType = rawResponse.headers.get('Content-Type') || '';

        if (contentType.includes('application/json')) {
          // Shape A: S3 presigned URL — download directly from S3
          // The file travels S3 → Browser without touching EC2 again.
          const data = await rawResponse.json();
          const anchor = window.document.createElement('a');
          anchor.href = data.download_url;
          anchor.download = data.filename;
          window.document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        } else {
          // Shape B: binary blob from FastAPI (S3 not configured)
          // Original behaviour — keeps working without AWS creds.
          const buffer = await rawResponse.arrayBuffer();
          const url = window.URL.createObjectURL(
            new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
          );
          const link = window.document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${safeTitle.replace(/[^\w\-]+/g, '_')}.docx`);
          window.document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }

        toast.success('Word document downloaded smoothly!');

      }
    } catch (err) {
      console.error('Failed to export document', err);
      toast.error('Failed to export document');
    } finally {
      setIsExporting(false);
    }
  };

  const runAiCommand = useCallback(async (instruction: string) => {
    if (!editor) return '';
    try {
      const selectionText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        '\n'
      );
      const documentText = editor.getText().slice(0, 20000);
      const { data } = await api.post('/ai/command', {
        instruction,
        selectionText,
        documentText,
      });
      return String(data?.output || '');
    } catch (err: any) {
      console.error('AI Command Error:', err);
      const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || 'The AI was unable to fulfill this request.';
      
      // If it's a 502/503 (often Gemini quota or temporary outage)
      if (err.response?.status >= 500) {
        toast.error('The AI assistant is temporarily unavailable. Please try again in moments.');
      } else {
        toast.error(`AI Assistant: ${errorMsg}`);
      }
      return '';
    }
  }, [editor]);
  
  const handleAddComment = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      toast.error('Select some text first to add a comment');
      return;
    }
    
    // Get coordinates for the modal
    const coords = editor.view.coordsAtPos(from);
    setCommentModalPos({ top: coords.top + 30, left: coords.left });
    setIsCommentModalOpen(true);
  }, [editor]);

  const submitComment = useCallback((text: string) => {
    if (!editor || !collaboration || !text.trim()) return;
    
    const { from, to } = editor.state.selection;
    const id = `comment-${Math.random().toString(36).substring(2, 9)}`;
    
    // 1. Create Yjs relative positions (survive edits)
    const relativeFrom = Y.encodeRelativePosition(
      Y.createRelativePositionFromTypeIndex(collaboration.ydoc.getXmlFragment('default'), from)
    );
    const relativeTo = Y.encodeRelativePosition(
      Y.createRelativePositionFromTypeIndex(collaboration.ydoc.getXmlFragment('default'), to)
    );

    // 2. Save to shared map
    const commentsMap = collaboration.ydoc.getMap('comments');
    commentsMap.set(id, {
      id,
      text,
      author: { id: userId, name: userName, color: userColor },
      createdAt: Date.now(),
      from: relativeFrom,
      to: relativeTo,
      resolved: false
    });

    // 3. Highlight in editor
    editor.chain().focus().setComment(id).run();
    
    setIsCommentModalOpen(false);
    setShowComments(true);
    toast.success('Comment added!');
  }, [editor, collaboration, userId, userName, userColor]);

  const slash = useSlashCommands({
    editor,
    onAiCommand: runAiCommand,
    onAddComment: handleAddComment,
  });

  if (authLoading || docLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfdf9]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="flex flex-col items-center gap-3">
          <div style={{ width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #e3f988, #b5d926)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(227,249,136,0.5)' }}>
            <Sparkles className="text-slate-900" style={{ width: '16px', height: '16px' }} />
          </div>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#799602' }} />
          <p className="text-sm text-slate-500 font-semibold">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fcfdf9]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="shrink-0 z-[100] sticky top-0" style={{
        background: 'rgba(252,253,249,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(227,249,136,0.3)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}>
        <div className="px-4 md:px-6 h-16 flex items-center gap-2 sm:gap-4 max-w-full mx-auto">
          {/* Left section: Back and Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard"
              ref={backButtonRef}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-100 text-slate-500 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="w-1 h-4 bg-slate-200 rounded-full mx-1 hidden sm:block" />

            <Link href="/dashboard" className="flex items-center gap-2 group transition-transform active:scale-95" style={{ textDecoration: 'none' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #e3f988, #b5d926)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(227,249,136,0.5)' }}>
                <Sparkles className="text-slate-900" style={{ width: '14px', height: '14px' }} />
              </div>
            </Link>
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0 mx-2">
            {editingTitle && !isReadOnly ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="text-base font-bold bg-[#fcfdf9] border-2 border-[#b5d926] px-3 py-1.5 rounded-xl outline-none w-full max-w-md text-slate-900 shadow-inner"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!isReadOnly) setEditingTitle(true);
                  }}
                  className="px-2 py-1 -ml-2 rounded-lg text-lg font-bold transition-all truncate max-w-[200px] sm:max-w-md block text-left disabled:pointer-events-none text-slate-900 hover:bg-slate-100"
                  title={isReadOnly ? 'Read-only document' : 'Click to rename'}
                  disabled={isReadOnly}
                >
                  {title || 'Untitled Document'}
                </button>
                {isReadOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-medium bg-gray-100 text-gray-500">
                    <Eye className="w-3 h-3" />
                    Read only
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status area */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Saving</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle className="w-2.5 h-2.5" />
                  <span>Synced</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-rose-500">
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>Error</span>
                </div>
              )}
              {saveStatus === 'idle' && (
                <div className="flex items-center gap-1.5 opacity-60">
                  <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'connected' ? 'bg-slate-300' : 'bg-amber-400 animate-pulse'}`} />
                  <span>{syncStatus === 'connected' ? 'Idle' : 'Awaiting sync'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Presence */}
          <PresenceBar
            status={syncStatus}
            users={onlineUsers}
            currentUserId={user?.id ?? ''}
          />

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowRevisions(!showRevisions)}
              className={`h-8 w-8 lg:w-auto lg:px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center lg:justify-start gap-1.5 ${
                showRevisions 
                  ? 'bg-[#f4fbe2] text-[#799602]' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden lg:block">History</span>
            </button>
            <button
              onClick={() => {
                setShowActivity(!showActivity);
                setShowComments(false);
                setShowRevisions(false);
              }}
              className={`h-8 w-8 lg:w-auto lg:px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center lg:justify-start gap-1.5 ${
                showActivity 
                  ? 'bg-[#f4fbe2] text-[#799602]' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden lg:block">Activities</span>
            </button>
            <button
              onClick={() => {
                setShowComments(!showComments);
                setShowActivity(false);
                setShowRevisions(false);
              }}
              className={`h-8 w-8 lg:w-auto lg:px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center lg:justify-start gap-1.5 ${
                showComments 
                  ? 'bg-[#f4fbe2] text-[#799602]' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:block">Comments</span>
            </button>
            <div className="relative group/download">
              <button
                disabled={isExporting}
                className="w-8 h-8 lg:w-auto lg:px-3 lg:py-1.5 rounded-lg lg:rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center lg:justify-start gap-2 text-xs font-bold disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#799602' }} /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden lg:block">{isExporting ? 'Exporting...' : 'Download'}</span>
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden opacity-0 invisible group-hover/download:opacity-100 group-hover/download:visible transition-all z-[110] transform origin-top-right scale-95 group-hover/download:scale-100">
                <div className="p-3 border-b border-slate-50">
                  <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Select Export Format</div>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => handleDownload('docx')}
                    className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#f4fbe2] hover:text-[#799602] rounded-xl transition-all flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm">Word Document</div>
                      <div className="text-[10px] text-slate-400">Microsoft Word (.docx)</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#f4fbe2] hover:text-[#799602] rounded-xl transition-all flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <Scissors className="w-4 h-4 rotate-90" />
                    </div>
                    <div>
                      <div className="text-sm">PDF Document</div>
                      <div className="text-[10px] text-slate-400">Portable Document (.pdf)</div>
                    </div>
                  </button>
                </div>
                <div className="bg-slate-50/80 p-2 px-4 text-[9px] text-slate-500 font-medium">
                  Optimized for collaborative printing
                </div>
              </div>
            </div>
            {document?.role === 'owner' && (
              <button
                onClick={() => setShowShare(true)}
                style={{ background: 'linear-gradient(135deg, #e3f988, #b5d926)', color: '#0f172a' }}
                className="h-8 w-8 lg:w-auto lg:px-3 rounded-lg text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center lg:justify-start gap-1.5 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden lg:block">Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Editor layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden" style={{ backgroundColor: '#fcfdf9', position: 'relative' }}>
        
        {/* subtle lime dot-grid texture overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(227,249,136,0.15) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />

        {/* Main editor area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
          <Toolbar editor={editor} />
          {isReadOnly && (
            <div className="border-b px-4 py-2 text-xs font-bold transition-colors bg-amber-50 border-amber-100 text-amber-700">
              You are in View-Only mode. Join the collaboration to edit.
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto doc-canvas-bg scroll-smooth relative">
            <div className="doc-paper-shell">
              <div className="doc-paper">
                <EditorContent
                  editor={editor}
                  className="min-h-[1056px]"
                />
              </div>
            </div>

            {/* Stats Bar */}
            {editor && (
              <div className="fixed bottom-6 right-6 flex items-center gap-4 px-4 py-2 bg-white/90 backdrop-blur-md border border-[rgba(227,249,136,0.3)] rounded-2xl shadow-xl z-20 animate-fade-in text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: '#799602' }}>{editor.storage.characterCount.words()}</span>
                  <span>Words</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="flex items-center gap-1.5">
                  <span style={{ color: '#799602' }}>{Math.ceil(editor.storage.characterCount.words() / 200)}</span>
                  <span>Min Read</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Revision history sidebar */}
        {showRevisions && (
          <RevisionHistory
            docId={docId}
            onClose={() => setShowRevisions(false)}
            currentContent={editor?.getText() || ''}
            collaboration={collaboration}
          />
        )}

        {/* Activity Feed Sidebar */}
        {showActivity && (
          <ActivitySidebar
            docId={docId}
            onClose={() => setShowActivity(false)}
          />
        )}

        {/* Comments Sidebar */}
        {showComments && collaboration && (
          <CommentsSidebar
            ydoc={collaboration.ydoc}
            editor={editor}
            onClose={() => setShowComments(false)}
            currentUserId={userId}
          />
        )}
      </div>

      <CommentModal 
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        onSubmit={submitComment}
        position={commentModalPos}
      />

      {/* Shortcuts modal */}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      <SlashCommandMenu
        isOpen={slash.isOpen}
        query={slash.query}
        top={slash.position.top}
        left={slash.position.left}
        selectedIndex={slash.selectedIndex}
        running={slash.running}
        commands={slash.commands}
        onSelect={(index) => {
          void slash.executeCommand(index);
        }}
        onHover={slash.setSelectedIndex}
      />
      <FloatingToolbar 
        editor={editor} 
        onAiCommand={runAiCommand} 
        onAddComment={handleAddComment}
      />
      
      {showShare && (
        <ShareModal 
          docId={docId} 
          onClose={() => setShowShare(false)} 
        />
      )}
    </div>
  );
}
