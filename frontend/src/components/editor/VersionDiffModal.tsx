'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { X, Loader2, GitCompare, ArrowRight, Clock, User } from 'lucide-react';
import * as Y from 'yjs';
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';

interface VersionDiffModalProps {
  docId: string;
  revisionId: string;
  currentContent: string; // Plain text or HTML for comparison
  onClose: () => void;
}

export const VersionDiffModal = ({ docId, revisionId, currentContent, onClose }: VersionDiffModalProps) => {
  const [loading, setLoading] = useState(true);
  const [diffHtml, setDiffHtml] = useState<string>('');
  const [revisionInfo, setRevisionInfo] = useState<any>(null);

  useEffect(() => {
    const fetchAndDiff = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/documents/${docId}/revisions/${revisionId}`);
        const revision = data.revision;
        setRevisionInfo(revision);

        // Decode Yjs update from base64
        const binary = Uint8Array.from(atob(revision.content), c => c.charCodeAt(0));
        const tempDoc = new Y.Doc();
        Y.applyUpdate(tempDoc, binary);
        
        // Tiptap Collaboration stores content in an XmlFragment named 'default'.
        // getText('default') would create a *new* empty Text type, not read the fragment.
        // We need to extract text from the XmlFragment by walking its tree.
        const xmlFragment = tempDoc.getXmlFragment('default');
        const extractText = (node: any): string => {
          if (!node) return '';
          // If it's a text node, return its string value directly
          if (typeof node === 'string') return node;
          if (node.toString && node._length !== undefined) {
            // Y.XmlText
            return node.toString();
          }
          // If it's an element/fragment, recurse into children
          let text = '';
          if (node.toArray) {
            for (const child of node.toArray()) {
              text += extractText(child);
            }
          } else if (node.toString) {
            return node.toString();
          }
          // Add newlines between block-level elements
          if (node.nodeName && ['P', 'H1', 'H2', 'H3', 'LI', 'DIV', 'BLOCKQUOTE'].includes(node.nodeName.toUpperCase())) {
            text += '\n';
          }
          return text;
        };
        const oldContent = extractText(xmlFragment) || tempDoc.getText('prosemirror').toString() || '';
        
        // Compute Diff
        const dmp = new diff_match_patch();
        const diffs = dmp.diff_main(oldContent, currentContent);
        dmp.diff_cleanupSemantic(diffs);

        // Generate Pretty HTML
        const html = diffs.map(([type, text]) => {
          const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
          if (type === DIFF_INSERT) return `<span class="bg-emerald-100 text-emerald-950 px-0.5 rounded-sm ring-1 ring-emerald-200">${escapedText}</span>`;
          if (type === DIFF_DELETE) return `<span class="bg-rose-100 text-rose-950 line-through px-0.5 rounded-sm opacity-60 ring-1 ring-rose-200">${escapedText}</span>`;
          return `<span>${escapedText}</span>`;
        }).join('');

        setDiffHtml(html);
      } catch (err) {
        console.error('Failed to compute diff', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchAndDiff();
  }, [docId, revisionId, currentContent]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-indigo-200">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Version Comparison</h2>
              <p className="text-xs text-slate-500 font-medium">Reviewing additions and deletions since the selected revision</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-200/50 flex items-center justify-center text-slate-400 transition-all hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Bar */}
        {revisionInfo && (
          <div className="bg-slate-900 px-8 py-3 flex items-center gap-6 text-white text-xs font-semibold">
             <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Revision from {new Date(revisionInfo.createdAt).toLocaleString()}</span>
             </div>
             <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
             <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Current Version (Live)</span>
             </div>
             <div className="ml-auto flex items-center gap-2 opacity-80">
                <User className="w-3.5 h-3.5" />
                <span>Saved by {revisionInfo.user.name}</span>
             </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#fafbfd] p-10">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="font-bold text-slate-400 animate-pulse">Analyzing document changes...</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white p-12 rounded-3xl shadow-sm border border-slate-100 min-h-full">
              <div 
                className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans text-lg [word-break:break-word]"
                dangerouslySetInnerHTML={{ __html: diffHtml || 'No changes detected between these versions.' }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                 <div className="w-3 h-3 rounded bg-emerald-100 ring-1 ring-emerald-200" />
                 <span className="text-[11px] font-bold text-slate-500">ADDITIONS</span>
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="w-3 h-3 rounded bg-rose-100 ring-1 ring-rose-200" />
                 <span className="text-[11px] font-bold text-slate-500">DELETIONS</span>
              </div>
           </div>
           <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
           >
             Close Diff View
           </button>
        </div>
      </div>
    </div>
  );
};

// Help helper for icons
function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
