'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { marked } from 'marked';

interface SlashRange {
  from: number;
  to: number;
}

interface SlashPosition {
  top: number;
  left: number;
}

interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  run: () => Promise<unknown> | unknown;
}

interface UseSlashCommandsOptions {
  editor: Editor | null;
  onAiCommand: (instruction: string) => Promise<string>;
  onAddComment?: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const useSlashCommands = ({ editor, onAiCommand, onAddComment }: UseSlashCommandsOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<SlashPosition>({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandRange, setCommandRange] = useState<SlashRange | null>(null);
  const [running, setRunning] = useState(false);

  const closeMenu = () => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
    setCommandRange(null);
  };

  const commands = useMemo<SlashCommandItem[]>(() => {
    if (!editor) return [];

    const makeAiCommand = (id: string, title: string, description: string, instruction: string): SlashCommandItem => ({
      id,
      title,
      description,
      keywords: ['ai', 'gemini', 'assist'],
      run: async () => {
        const selectedText = editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to,
          '\n'
        );
        const generated = await onAiCommand(`${instruction}\nSelected text:\n${selectedText || '(none)'}`);
        if (generated) {
          const html = await marked.parse(generated);
          editor.chain().focus().insertContent(html).run();
        }
      },
    });

    return [
      {
        id: 'text',
        title: 'Text',
        description: 'Continue as normal paragraph text',
        keywords: ['paragraph', 'plain'],
        run: () => editor.chain().focus().setParagraph().run(),
      },
      {
        id: 'h1',
        title: 'Heading 1',
        description: 'Large section heading',
        keywords: ['title', 'header'],
        run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: 'h2',
        title: 'Heading 2',
        description: 'Medium section heading',
        keywords: ['subtitle', 'header'],
        run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: 'h3',
        title: 'Heading 3',
        description: 'Small section heading',
        keywords: ['subheading', 'header'],
        run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        id: 'bullet',
        title: 'Bullet List',
        description: 'Create unordered list',
        keywords: ['list', 'points'],
        run: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'ordered',
        title: 'Numbered List',
        description: 'Create ordered list',
        keywords: ['list', 'steps'],
        run: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'quote',
        title: 'Quote',
        description: 'Insert blockquote',
        keywords: ['blockquote', 'citation'],
        run: () => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'code-block',
        title: 'Code Block',
        description: 'Insert formatted code block',
        keywords: ['snippet', 'dev', 'code', 'codeblock'],
        run: () => editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: 'code-fence',
        title: 'Code Fence',
        description: 'Quick insert for triple backtick style block',
        keywords: ['```', 'code', 'fence', 'block'],
        run: () => editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: 'divider',
        title: 'Divider',
        description: 'Insert horizontal separator',
        keywords: ['separator', 'line', 'hr'],
        run: () => editor.chain().focus().setHorizontalRule().run(),
      },
      {
        id: 'table',
        title: 'Table',
        description: 'Insert 3x3 data table',
        keywords: ['table', 'grid', 'data', 'cells'],
        run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
      {
        id: 'emoji',
        title: 'Emoji',
        description: 'Quick insert for basic emoji',
        keywords: ['emoji', 'smile', 'reaction'],
        run: () => {
             const emojis = ['🙂', '🚀', '🔥', '✨', '💡', '✅', '❤️', '🎉'];
             const random = emojis[Math.floor(Math.random() * emojis.length)];
             editor.chain().focus().insertContent(random).run();
        },
      },
      {
        id: 'clear',
        title: 'Clear Formatting',
        description: 'Reset all marks and nodes',
        keywords: ['clear', 'reset', 'clean'],
        run: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
      },
      {
        id: 'comment',
        title: 'Add Comment',
        description: 'Suggest a revision or leave feedback',
        keywords: ['comment', 'review', 'suggest', 'note'],
        run: () => {
          if (onAddComment) {
            onAddComment();
          }
        },
      },
      {
        id: 'ai-summary',
        title: 'Summarize',
        description: 'Generate a TL;DR for selected text',
        keywords: ['ai', 'summary', 'tldr'],
        run: async () => {
             const { from, to } = editor.state.selection;
             const selectedText = editor.state.doc.textBetween(from, to, '\n');
             if (!selectedText) {
                alert('Please select text to summarize');
                return;
             }
             const generated = await onAiCommand(`Summarize the following text concisely:\n${selectedText}`);
             if (generated) {
                const html = await marked.parse(generated);
                // Insert after the selection instead of replacing it
                editor.chain().focus()
                      .insertContentAt(to, `\n\n<blockquote><strong>AI Summary:</strong> ${html}</blockquote>\n\n`)
                      .run();
             }
        }
      },
      makeAiCommand(
        'ai-continue',
        'AI Continue Writing',
        'Naturally extend the current text',
        'Continue the document from the current cursor position, matching the existing tone and professional style.'
      ),
      makeAiCommand(
        'ai-summarize-bullet',
        'AI Bullet Summary',
        'Summarize as key points',
        'Create a concise bulleted summary of the context, highlighting the primary takeaways.'
      ),
      makeAiCommand(
        'ai-rewrite-pro',
        'AI Professional Rewrite',
        'Rewrite for professional clarity',
        'Rewrite the following text to be highly professional, impactful, and free of jargon.'
      ),
      makeAiCommand(
        'ai-brainstorm',
        'AI Brainstorm Ideas',
        'Generate creative suggestions',
        'Provide five unique and creative ideas or extensions related to this topic.'
      ),
      makeAiCommand(
        'ai-find-bugs',
        'AI Code Critic',
        'Identify issues in code snippets',
        'Analyze any code in the context and provide brief, punchy suggestions for improvement or potential bug fixes.'
      ),
      makeAiCommand(
        'ai-tone-check',
        'AI Tone Analysis',
        'Evaluate the emotional tone',
        'Analyze the tone of the document (e.g., formal, aggressive, helpful) and provide a one-sentence summary.'
      ),
    ];
  }, [editor, onAiCommand]);

  const filteredCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;
    return commands.filter((item) =>
      item.title.toLowerCase().includes(normalized)
      || item.description.toLowerCase().includes(normalized)
      || item.keywords.some((key) => key.includes(normalized))
    );
  }, [commands, query]);

  const executeCommand = useCallback(async (index: number) => {
    if (!editor || !commandRange) return;
    const command = filteredCommands[index];
    if (!command) return;

    setRunning(true);
    try {
      editor.chain().focus().deleteRange(commandRange).run();
      await command.run();
      closeMenu();
    } finally {
      setRunning(false);
    }
  }, [commandRange, editor, filteredCommands]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const updateMenuFromCursor = () => {
      if (!editor || editor.isDestroyed) return;
      const { from } = editor.state.selection;
      const $from = editor.state.selection.$from;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, '\0', '\0');
      const slashIndex = textBefore.lastIndexOf('/');
      if (slashIndex < 0) {
        closeMenu();
        return;
      }

      const afterSlash = textBefore.slice(slashIndex + 1);
      const hasWhitespaceAfterSlash = /\s/.test(afterSlash);
      
      if (hasWhitespaceAfterSlash) {
        closeMenu();
        return;
      }

      const fromPos = $from.start() + slashIndex;
      let coords: { top: number; bottom: number; left: number; right: number };
      try {
        coords = editor.view.coordsAtPos(from);
      } catch {
        return;
      }
      const top = clamp(coords.bottom + 8, 80, window.innerHeight - 320);
      const left = clamp(coords.left - 6, 12, window.innerWidth - 360);

      setCommandRange({ from: fromPos, to: from });
      setQuery(afterSlash);
      setPosition({ top, left });
      setSelectedIndex(0);
      setIsOpen(true);
    };

    const handleTransaction = () => {
      updateMenuFromCursor();
    };

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (!isOpen || !editor.isFocused) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (filteredCommands.length ? (prev + 1) % filteredCommands.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        await executeCommand(selectedIndex);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    };

    editor.on('transaction', handleTransaction);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      editor.off('transaction', handleTransaction);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, executeCommand, filteredCommands.length, isOpen, selectedIndex]);

  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(0);
    }
  }, [filteredCommands.length, selectedIndex]);

  return {
    isOpen,
    query,
    position,
    selectedIndex,
    running,
    commands: filteredCommands,
    executeCommand,
    setSelectedIndex,
    closeMenu,
  };
};
