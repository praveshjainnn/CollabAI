'use client';

import { useRef, useState } from 'react';
import { type Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  ImagePlus,
  Quote,
  Redo,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline,
  Undo,
  Table as TableIcon,
  ListTodo,
  Columns,
  Rows,
  PlusCircle,
  XCircle,
  Type,
  Trash2,
  FilePlus,
  Scissors,
  ArrowDownToLine,
  ArrowUpToLine,
  ArrowLeftToLine,
  ArrowRightToLine
} from 'lucide-react';

interface ToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'IBM Plex Sans', value: '"IBM Plex Sans", sans-serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];

const ToolbarButton = ({ onClick, active, disabled, title, children, className }: ToolbarButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`min-w-[32px] h-8 px-1.5 rounded-md flex items-center justify-center transition-all text-sm border ${
      active
        ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
        : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-800'
    } disabled:opacity-30 disabled:cursor-not-allowed ${className || ''}`}
    type="button"
  >
    {children}
  </button>
);

const Divider = () => (
  <div className="w-px h-6 mx-1 bg-slate-200 shrink-0" />
);

const Select = ({
  value,
  onChange,
  className,
  title,
  children,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <select
    title={title}
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    className={`h-8 rounded-md border px-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white border-slate-200 text-slate-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
  >
    {children}
  </select>
);

export const Toolbar = ({ editor }: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isReady = !!editor;

  const headingLevel = editor?.isActive('heading', { level: 1 })
    ? 'h1'
    : editor?.isActive('heading', { level: 2 })
      ? 'h2'
      : editor?.isActive('heading', { level: 3 })
        ? 'h3'
        : 'paragraph';

  const activeFontFamily =
    (editor?.getAttributes('textStyle')?.fontFamily as string | undefined)
    || 'Inter, sans-serif';
  const activeFontSize = (editor?.getAttributes('textStyle')?.fontSize as string | undefined) || '16px';
  
  const rgbToHex = (str: string | undefined): string => {
    if (!str) return '#000000';
    if (str.startsWith('#')) return str;
    const match = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return str;
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  const activeColor = rgbToHex(editor?.getAttributes('textStyle')?.color as string | undefined || '#111827');
  const activeHighlight = rgbToHex(editor?.getAttributes('highlight')?.color as string | undefined || '#fef08a');

  const isTableActive = !!editor?.isActive('table');

  return (
    <div className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm border-slate-200 shadow-sm overflow-x-auto no-scrollbar shrink-0 min-h-[48px] flex items-center group/toolbar">
      {/* Scroll indicators */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-white to-transparent pointer-events-none opacity-0 group-hover/toolbar:opacity-100 transition-opacity z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-white to-transparent pointer-events-none opacity-0 group-hover/toolbar:opacity-100 transition-opacity z-10" />
      
      <div className="flex min-w-max items-center gap-1 px-4 py-2">
        {/* History Group */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!isReady || !editor?.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!isReady || !editor?.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Divider />

        {/* Text Style Group */}
        <div className="flex items-center gap-1">
          <Select
            title="Heading"
            disabled={!isReady}
            value={isReady ? headingLevel : 'paragraph'}
            onChange={(value) => {
              if (isReady) {
                const chain = editor.chain().focus();
                if (value === 'paragraph') {
                  chain.setParagraph().run();
                  return;
                }
                chain.toggleHeading({ level: Number(value.replace('h', '')) as 1 | 2 | 3 }).run();
              }
            }}
            className="w-28"
          >
            <option value="paragraph">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </Select>

          <Select
            title="Font"
            disabled={!isReady}
            value={isReady ? activeFontFamily : 'Inter, sans-serif'}
            onChange={(value) => editor?.chain().focus().setFontFamily(value).run()}
            className="w-32"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </Select>

          <Select
            title="Size"
            disabled={!isReady}
            value={isReady ? activeFontSize : '16px'}
            onChange={(value) => editor?.chain().focus().setFontSize(value).run()}
            className="w-20"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </Select>
        </div>

        <Divider />

        {/* Formatting Group */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={!!editor?.isActive('bold')}
            disabled={!isReady}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={!!editor?.isActive('italic')}
            disabled={!isReady}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={!!editor?.isActive('underline')}
            disabled={!isReady}
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            active={!!editor?.isActive('strike')}
            disabled={!isReady}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleCode().run()}
            active={!!editor?.isActive('code')}
            disabled={!isReady}
            title="Inline code"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Divider />

        {/* Colors Group */}
        <div className="flex items-center gap-2 px-1">
          <div className="group relative flex items-center gap-1.5" title="Text Color">
             <Type className="w-4 h-4 text-slate-400" />
             <div className="relative w-5 h-5 rounded border border-slate-200 overflow-hidden shadow-xs">
                <input
                  type="color"
                  disabled={!isReady}
                  value={activeColor}
                  onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
                  className="absolute -inset-2 w-10 h-10 cursor-pointer"
                />
             </div>
          </div>
          
          <div className="group relative flex items-center gap-1.5" title="Highlight Color">
            <Highlighter className="w-4 h-4 text-slate-400" />
            <div className="relative w-5 h-5 rounded border border-slate-200 overflow-hidden shadow-xs">
              <input
                type="color"
                disabled={!isReady}
                value={activeHighlight}
                onChange={(e) => editor?.chain().focus().setHighlight({ color: e.target.value }).run()}
                className="absolute -inset-2 w-10 h-10 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* List & Alignment Group */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={!!editor?.isActive('bulletList')}
            disabled={!isReady}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={!!editor?.isActive('orderedList')}
            disabled={!isReady}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            active={!!editor?.isActive('taskList')}
            disabled={!isReady}
            title="Task List"
          >
            <ListTodo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={!!editor?.isActive('blockquote')}
            disabled={!isReady}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Divider />

        {/* Alignment Group */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            active={!!editor?.isActive({ textAlign: 'left' })}
            disabled={!isReady}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            active={!!editor?.isActive({ textAlign: 'center' })}
            disabled={!isReady}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            active={!!editor?.isActive({ textAlign: 'right' })}
            disabled={!isReady}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
            active={!!editor?.isActive({ textAlign: 'justify' })}
            disabled={!isReady}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <Divider />

        {/* Insert Group */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => {
              if (isReady) {
                const previousUrl = editor.getAttributes('link').href as string | undefined;
                const url = window.prompt('Enter URL', previousUrl || 'https://');
                if (url !== null) {
                  url.trim() ? editor.chain().focus().setLink({ href: url.trim() }).run() : editor.chain().focus().unsetLink().run();
                }
              }
            }}
            active={!!editor?.isActive('link')}
            disabled={!isReady}
            title="Link"
          >
            <Link2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton disabled={!isReady} onClick={() => fileInputRef.current?.click()} title="Upload Image">
            <ImagePlus className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              // Guard: don't insert a table inside a table
              if (isReady && !isTableActive) {
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              }
            }}
            title="Insert Table"
            active={isTableActive}
            disabled={!isReady || isTableActive}
          >
            <TableIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            active={!!editor?.isActive('codeBlock')}
            disabled={!isReady}
            title="Code Block"
          >
            <Code2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            disabled={!isReady}
            title="Horizontal Rule"
          >
             <Minus className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              // Insert our custom Grid-Locked Page Break
              if (isReady) {
                editor.commands.insertContent({ type: 'pageBreak' });
              }
            }}
            disabled={!isReady}
            title="Page Break"
            className="text-indigo-600 hover:bg-indigo-50"
          >
             <Scissors className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Table Controls (Dynamic) */}
        {isReady && isTableActive && (
          <>
            <Divider />
            <div className="flex items-center gap-0.5 bg-indigo-50 px-1 py-0.5 rounded-lg border border-indigo-100 shadow-inner">
               <ToolbarButton onClick={() => editor?.chain().focus().addColumnBefore().run()} title="Add Col Before"><ArrowLeftToLine className="w-3.5 h-3.5" /></ToolbarButton>
               <ToolbarButton onClick={() => editor?.chain().focus().addColumnAfter().run()} title="Add Col After"><ArrowRightToLine className="w-3.5 h-3.5" /></ToolbarButton>
               <ToolbarButton onClick={() => editor?.chain().focus().deleteColumn().run()} title="Delete Column" className="hover:text-red-600"><XCircle className="w-3.5 h-3.5" /></ToolbarButton>
               <div className="w-px h-4 bg-indigo-100 mx-1" />
               <ToolbarButton onClick={() => editor?.chain().focus().addRowBefore().run()} title="Add Row Before"><ArrowUpToLine className="w-3.5 h-3.5" /></ToolbarButton>
               <ToolbarButton onClick={() => editor?.chain().focus().addRowAfter().run()} title="Add Row After"><ArrowDownToLine className="w-3.5 h-3.5" /></ToolbarButton>
               <ToolbarButton onClick={() => editor?.chain().focus().deleteRow().run()} title="Delete Row" className="hover:text-red-600"><XCircle className="w-3.5 h-3.5" /></ToolbarButton>
               <div className="w-px h-4 bg-indigo-100 mx-1" />
               <ToolbarButton onClick={() => editor?.chain().focus().deleteTable().run()} title="Delete Table" className="text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></ToolbarButton>
            </div>
          </>
        )}

        <Divider />

        {/* Eraser: only removes formatting marks, preserves block structure */}
        <ToolbarButton
          onClick={() => {
            // Only clear inline marks (bold, italic, underline, color, highlight, etc.)
            editor?.chain().focus().unsetAllMarks().run();
          }}
          disabled={!isReady}
          title="Clear Formatting"
        >
          <Eraser className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Tip for users about slash commands */}
        <div className="flex items-center px-2 py-1 ml-auto shrink-0 bg-indigo-50 border border-indigo-100/50 rounded-full animate-pulse-subtle">
           <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
             <span className="w-4 h-4 rounded bg-indigo-500 text-white flex items-center justify-center font-mono">/</span>
             Type Slash for commands
           </span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
             const src = reader.result?.toString();
             if (src && isReady) editor.chain().focus().setImage({ src }).run();
          };
          reader.readAsDataURL(file);
          event.target.value = '';
        }}
      />
    </div>
  );
};
