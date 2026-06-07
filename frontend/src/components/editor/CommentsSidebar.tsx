'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { X, MessageSquare, Trash2, CheckCircle, User, Clock, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Editor } from '@tiptap/react';

interface Comment {
  id: string;
  author: { id: string; name: string; color: string };
  text: string;
  createdAt: number;
  from: Uint8Array; // Yjs relative position
  to: Uint8Array;   // Yjs relative position
  resolved: boolean;
}

interface CommentsSidebarProps {
  ydoc: Y.Doc;
  editor: Editor | null;
  onClose: () => void;
  currentUserId: string;
}

export const CommentsSidebar = ({ ydoc, editor, onClose, currentUserId }: CommentsSidebarProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const commentsMap = ydoc.getMap<Comment>('comments');

  const updateComments = useCallback(() => {
    const items: Comment[] = [];
    commentsMap.forEach((val) => {
      items.push(val);
    });
    setComments(items.sort((a, b) => b.createdAt - a.createdAt));
  }, [commentsMap]);

  useEffect(() => {
    updateComments();
    commentsMap.observe(updateComments);
    return () => commentsMap.unobserve(updateComments);
  }, [commentsMap, updateComments]);

  const resolveComment = (id: string) => {
    const comment = commentsMap.get(id);
    if (comment) {
      commentsMap.set(id, { ...comment, resolved: true });
      
      // Also remove the mark from the editor if possible
      if (editor) {
        // In a real-world scenario, we'd find the range and remove the mark
        // For simplicity, we'll just update the map state
      }
    }
  };

  const deleteComment = (id: string) => {
    commentsMap.delete(id);
    // Remove mark from editor
    if (editor) {
      // Find and remove mark with this ID
      // This is complex in Tiptap/ProseMirror, usually done via commands
    }
  };

  const scrollToComment = (comment: Comment) => {
    if (!editor) return;

    try {
      const from = Y.createAbsolutePositionFromRelativePosition(
        Y.decodeRelativePosition(comment.from),
        ydoc
      ) as any;
      if (from && editor && editor.view) {
        editor.chain().focus().setTextSelection(from.pos).scrollIntoView().run();
      }
    } catch (e) {
      console.error('Failed to scroll to comment', e);
    }
  };

  const activeComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);

  return (
    <div className="w-80 border-l border-slate-200 bg-slate-50/30 flex flex-col h-full shadow-2xl animate-fade-in z-30">
      <div className="px-6 py-5 border-b border-white bg-white/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-indigo-600" />
          <h2 className="font-bold text-slate-900 tracking-tight">Comments</h2>
          <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full">
            {activeComments.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {activeComments.length === 0 && resolvedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-4 text-slate-300">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-slate-900 font-bold mb-1">No comments yet</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">
              Select text and use the "/" command or toolbar to add a note or feedback.
            </p>
          </div>
        ) : (
          <>
            {activeComments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                onResolve={() => resolveComment(comment.id)}
                onDelete={() => deleteComment(comment.id)}
                onClick={() => scrollToComment(comment)}
                isAuthor={comment.author.id === currentUserId}
              />
            ))}

            {resolvedComments.length > 0 && (
              <div className="pt-6">
                <div className="flex items-center gap-2 px-2 mb-3 text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Resolved</span>
                </div>
                <div className="space-y-3 opacity-60 grayscale-[0.5]">
                  {resolvedComments.map((comment) => (
                    <CommentItem 
                      key={comment.id} 
                      comment={comment} 
                      onDelete={() => deleteComment(comment.id)}
                      onClick={() => scrollToComment(comment)}
                      isAuthor={comment.author.id === currentUserId}
                      resolved
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-white bg-white/50">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center leading-normal">
          Comments auto-sync across devices
        </p>
      </div>
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  onResolve?: () => void;
  onDelete: () => void;
  onClick: () => void;
  isAuthor: boolean;
  resolved?: boolean;
}

const CommentItem = ({ comment, onResolve, onDelete, onClick, isAuthor, resolved }: CommentItemProps) => {
  return (
    <div 
      className={`group bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer ${resolved ? 'border-transparent shadow-none bg-slate-50/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
            style={{ backgroundColor: comment.author.color }}
          >
            {comment.author.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate tracking-tight">{comment.author.name}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </div>
          </div>
        </div>
        
        {!resolved && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button 
              onClick={onResolve}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
              title="Resolve"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
            {isAuthor && (
              <button 
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
      
      <p className={`text-xs leading-relaxed font-medium text-slate-600 ${resolved ? 'line-through text-slate-400' : ''}`}>
        {comment.text}
      </p>
    </div>
  );
};
