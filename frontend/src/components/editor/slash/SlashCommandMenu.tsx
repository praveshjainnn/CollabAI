'use client';

import React, { useEffect, useRef } from 'react';
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Code2, 
  Minus, 
  Smile, 
  Sparkles, 
  Eraser,
  Table as TableIcon,
  MessageSquare,
  Hash,
  FileText
} from 'lucide-react';

interface SlashCommand {
  id: string;
  title: string;
  description: string;
}

const getIcon = (id: string, className: string) => {
  switch (id) {
    case 'text': return <Type className={className} />;
    case 'h1': return <Heading1 className={className} />;
    case 'h2': return <Heading2 className={className} />;
    case 'h3': return <Heading3 className={className} />;
    case 'bullet': return <List className={className} />;
    case 'ordered': return <ListOrdered className={className} />;
    case 'quote': return <Quote className={className} />;
    case 'code-block': 
    case 'code-fence': return <Code2 className={className} />;
    case 'divider': return <Minus className={className} />;
    case 'emoji': return <Smile className={className} />;
    case 'clear': return <Eraser className={className} />;
    case 'table': return <TableIcon className={className} />;
    case 'comment': return <MessageSquare className={className} />;
    default:
      if (id.startsWith('ai-')) return <Sparkles className={`${className} text-amber-500`} />;
      return <Hash className={className} />;
  }
};

interface SlashCommandMenuProps {
  isOpen: boolean;
  query: string;
  top: number;
  left: number;
  selectedIndex: number;
  running: boolean;
  commands: SlashCommand[];
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

export const SlashCommandMenu = ({
  isOpen,
  query,
  top,
  left,
  selectedIndex,
  running,
  commands,
  onSelect,
  onHover,
}: SlashCommandMenuProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return;
    const activeBtn = scrollRef.current.querySelector('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-100 w-[320px] rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-black/5 flex flex-col"
      style={{ top, left }}
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-indigo-500 rounded flex items-center justify-center">
            <Hash className="w-3 h-3 text-white" />
          </div>
          <span className="text-[12px] font-bold text-slate-700 tracking-tight">
            COMMANDS
          </span>
        </div>
        {query && (
          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
            "{query}"
          </span>
        )}
      </div>
      
      <div 
        ref={scrollRef}
        className="max-h-95 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
      >
        {commands.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500">No matching commands</p>
          </div>
        )}
        
        {commands.map((command, index) => {
          const isActive = selectedIndex === index;
          return (
            <button
              key={command.id}
              type="button"
              disabled={running}
              data-active={isActive}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(index)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-left ${
                isActive 
                  ? 'bg-indigo-600 shadow-md transform scale-[1.02]' 
                  : 'hover:bg-slate-50'
              } ${running ? 'opacity-50 cursor-wait' : ''}`}
            >
              <div className={`p-2 rounded-md transition-colors ${
                isActive ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-indigo-50'
              }`}>
                {getIcon(command.id, `w-4 h-4 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-indigo-600'}`)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${
                  isActive ? 'text-white' : 'text-slate-900'
                }`}>
                  {command.title}
                </div>
                <div className={`text-[11px] truncate mt-0.5 ${
                  isActive ? 'text-indigo-100/80' : 'text-slate-500'
                }`}>
                  {command.description}
                </div>
              </div>

              {isActive && (
                <div className="text-[10px] items-center gap-1 flex text-white/70 animate-pulse pr-1">
                  <span className="px-1 py-0.5 rounded bg-white/20 border border-white/10 uppercase font-mono">Enter</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex gap-2">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 italic">
                <span className="p-0.5 rounded bg-slate-200 not-italic font-mono">↑↓</span> navigate
            </span>
        </div>
        <div className="text-[10px] text-slate-400">
            CollabAI
        </div>
      </div>
    </div>
  );
};
