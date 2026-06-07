'use client';

import React from 'react';
import { X, Command, Type, List, Layout, Code, Wand2 } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Text Formatting',
    icon: <Type className="w-4 h-4" />,
    shortcuts: [
      { keys: ['Ctrl', 'B'], label: 'Bold' },
      { keys: ['Ctrl', 'I'], label: 'Italic' },
      { keys: ['Ctrl', 'U'], label: 'Underline' },
      { keys: ['Ctrl', 'Shift', 'X'], label: 'Strikethrough' },
      { keys: ['Ctrl', 'E'], label: 'Center Align' },
    ],
  },
  {
    title: 'Structure',
    icon: <Layout className="w-4 h-4" />,
    shortcuts: [
      { keys: ['Ctrl', 'Alt', '1-3'], label: 'Headings 1-3' },
      { keys: ['Ctrl', 'Shift', '7'], label: 'Ordered List' },
      { keys: ['Ctrl', 'Shift', '8'], label: 'Bullet List' },
      { keys: ['Ctrl', 'Enter'], label: 'Page Break' },
      { keys: ['> '], label: 'Blockquote (Start of line)' },
    ],
  },
  {
    title: 'Power Tools',
    icon: <Wand2 className="w-4 h-4" />,
    shortcuts: [
      { keys: ['/'], label: 'Slash Command Menu' },
      { keys: ['@'], label: 'Mention Teammate' },
      { keys: ['Tab'], label: 'Accept AI Suggestion' },
      { keys: ['Ctrl', '/'], label: 'Toggle this help' },
      { keys: ['Ctrl', 'Shift', 'C'], label: 'Code Block' },
    ],
  },
];

export const ShortcutsModal = ({ onClose }: ShortcutsModalProps) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
              <Command className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Keyboard Shortcuts</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Master the art of fast collaborative writing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {SHORTCUT_GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                  {group.icon}
                  <h3 className="text-sm font-bold uppercase tracking-widest">{group.title}</h3>
                </div>
                <div className="space-y-3">
                  {group.shortcuts.map((s, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between group">
                      <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{s.label}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="min-w-[24px] h-6 px-1.5 flex items-center justify-center rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 shadow-sm">
                              {k}
                            </kbd>
                            {kIdx < s.keys.length - 1 && <span className="text-[10px] text-slate-300">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Press <kbd className="mx-1 px-1.5 py-0.5 rounded border border-slate-200 bg-white">ESC</kbd> to close any menu
          </p>
        </div>
      </div>
    </div>
  );
};
