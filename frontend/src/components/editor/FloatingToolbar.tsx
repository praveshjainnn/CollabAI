'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Strikethrough, Highlighter, Code, Sparkles, Wand2, Languages, ListTodo, MessageSquare } from 'lucide-react';
import { marked } from 'marked';

interface FloatingToolbarProps {
  editor: Editor | null;
  onAiCommand: (instruction: string) => Promise<string>;
  onAddComment?: () => void;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

const Divider = () => <div className="w-px h-4 bg-slate-200 mx-0.5" />;

const ItemButton = ({
  active,
  title,
  onClick,
  children,
  className = "",
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
      active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
    } ${className}`}
  >
    {children}
  </button>
);

export const FloatingToolbar = ({ editor, onAiCommand, onAddComment }: FloatingToolbarProps) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });

  const handleAiRefine = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '\n');
    if (!text) return;

    const refined = await onAiCommand(`Improve the following text for clarity and flow, maintaining its meaning:\n${text}`);
    if (refined) {
      const html = await marked.parse(refined);
      editor.chain().focus().insertContentAt({ from, to }, html).run();
    }
  };

  const handleAiSummarize = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '\n');
    if (!text) return;

    const summary = await onAiCommand(`Summarize the following text briefly but comprehensively:\n${text}`);
    if (summary) {
      const html = await marked.parse(summary);
      editor.chain().focus()
            .insertContentAt(to, `\n\n<blockquote><strong>AI Summary:</strong> ${html}</blockquote>\n\n`)
            .run();
    }
  };

  const handleAiTranslate = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '\n');
    if (!text) return;

    const translated = await onAiCommand(`Translate the following text to professional Hindi (preserving technical terms in English if appropriate):\n${text}`);
    if (translated) {
      const html = await marked.parse(translated);
      editor.chain().focus().insertContentAt(to, `\n\n<p><strong>HINDI (Hindi Translation):</strong></p>${html}\n\n`).run();
    }
  };

  const handleAiActionItems = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '\n');
    if (!text) return;

    const items = await onAiCommand(`Extract a list of actionable tasks or next steps from the following text as a markdown checklist:\n${text}`);
    if (items) {
      const html = await marked.parse(items);
      editor.chain().focus().insertContentAt(to, `\n\n<h3>✅ Action Items:</h3>${html}\n\n`).run();
    }
  };

  const handleAiContinueWriting = async () => {
    if (!editor) return;
    const { to } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, to - 2000), to, '\n');
    
    const continuation = await onAiCommand(`Based on the preceding text, continue writing the next paragraph naturally and professionally:\n${textBefore}`);
    if (continuation) {
      const html = await marked.parse(continuation);
      editor.chain().focus().insertContentAt(to, ` ${html}`).run();
    }
  };

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const updatePosition = () => {
      const { from, to } = editor.state.selection;
      if (!editor.isFocused || from === to) {
        setVisible(false);
        return;
      }

      try {
        const start = editor.view.coordsAtPos(from);
        const end = editor.view.coordsAtPos(to);
        const top = Math.max(80, Math.min(start.top, end.top) - 54);
        const left = (start.left + end.right) / 2;
        setPosition({ top, left });
        setVisible(true);
      } catch {
        setVisible(false);
      }
    };

    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', () => setVisible(false));
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      editor.off('selectionUpdate', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [editor]);

  if (!editor || !editor.isEditable || !visible) return null;

  return (
    <div
      className="fixed z-40 -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center gap-1">
        <ItemButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-3.5 h-3.5" />
        </ItemButton>
        <ItemButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="w-3.5 h-3.5" />
        </ItemButton>
        <ItemButton
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="w-3.5 h-3.5" />
        </ItemButton>
        <ItemButton
          title="Strike"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ItemButton>
        <ItemButton
          title="Highlight"
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="w-3.5 h-3.5" />
        </ItemButton>
        <ItemButton
          title="Inline code"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="w-3.5 h-3.5" />
        </ItemButton>

        <ItemButton
          title="Add Comment"
          onClick={() => onAddComment?.()}
          className="hover:text-indigo-600 hover:bg-indigo-50"
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
        </ItemButton>

        <Divider />
        
        <ItemButton
          title="Refine Text"
          onClick={handleAiRefine}
          className="hover:text-indigo-600 hover:bg-indigo-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </ItemButton>
        <ItemButton
          title="Summarize"
          onClick={handleAiSummarize}
          className="hover:text-amber-600 hover:bg-amber-50"
        >
          <div className="relative group">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5 rounded-full bg-amber-400 group-hover:animate-ping" />
          </div>
        </ItemButton>
        <ItemButton
          title="Continue Writing"
          onClick={handleAiContinueWriting}
          className="hover:text-purple-600 hover:bg-purple-50"
        >
          <Wand2 className="w-3.5 h-3.5" />
        </ItemButton>
        <ItemButton
          title="Extract Action Items"
          onClick={handleAiActionItems}
          className="hover:text-emerald-600 hover:bg-emerald-50"
        >
          <ListTodo className="w-3.5 h-3.5" />
        </ItemButton>
        <ItemButton
          title="Translate to Hindi"
          onClick={handleAiTranslate}
          className="hover:text-rose-600 hover:bg-rose-50"
        >
          <Languages className="w-3.5 h-3.5" />
        </ItemButton>
      </div>
    </div>
  );
};
