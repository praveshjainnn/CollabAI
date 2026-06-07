'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, Loader2 } from 'lucide-react';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  initialText?: string;
  position: { top: number; left: number };
}

export const CommentModal = ({ isOpen, onClose, onSubmit, initialText = '', position }: CommentModalProps) => {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText('');
      // Wait for animation
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-100" onClick={onClose} />
      <div 
        className="fixed z-110 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-scale-in"
        style={{ 
          top: Math.min(position.top, window.innerHeight - 250), 
          left: Math.min(position.left, window.innerWidth - 340) 
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Add Comment</span>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? (Cmd+Enter to post)"
          className="w-full h-24 p-3 bg-slate-50 rounded-xl border border-slate-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-medium text-slate-700 leading-relaxed placeholder:text-slate-400 resize-none transition-all"
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {text.length}/500 chars
          </span>
          <button
            onClick={() => handleSubmit()}
            disabled={!text.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-indigo-600/20"
          >
            Post Comment
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
};
