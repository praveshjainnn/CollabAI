'use client';

import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Image } from '@tiptap/extension-image';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { Collaboration } from '@tiptap/extension-collaboration';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Typography } from '@tiptap/extension-typography';
import { CharacterCount } from '@tiptap/extension-character-count';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Link } from '@tiptap/extension-link';
import { Mention } from '@tiptap/extension-mention';
import { getMentionSuggestion } from '@/components/editor/mention/suggestion';

import type { WebsocketProvider } from 'y-websocket';
import type * as Y from 'yjs';
import { CollaborationAwarenessCursor } from '@/components/editor/extensions/CollaborationAwarenessCursor';
import { FontSize } from '@/components/editor/extensions/FontSize';
import { SmartPagination } from '@/components/editor/extensions/SmartPagination';
import { PageBreak } from '@/components/editor/extensions/PageBreak';
import { AiAutocomplete } from '@/components/editor/extensions/AiAutocomplete';
import { Comment } from '@/components/editor/extensions/Comment';

const lowlight = createLowlight(all);

interface UserProfile {
  id: string;
  name: string;
  color: string;
}

interface CollaborationState {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
}

interface EditorExtensionOptions {
  collaboration: CollaborationState | null;
  user: UserProfile;
  teammates?: UserProfile[];
}

export const createEditorExtensions = ({
  collaboration,
  user,
  teammates = [],
}: EditorExtensionOptions) => {
  const base = [
    StarterKit.configure({
      undoRedo: false,
      codeBlock: false,
      underline: false,
      link: false,
    }),
    PageBreak,
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
    }),
    CodeBlockLowlight.configure({ lowlight }),
    TextStyle,
    Color.configure({ types: ['textStyle'] }),
    FontFamily.configure({ types: ['textStyle'] }),
    FontSize,
    Underline,
    Superscript,
    Subscript,
    Image.configure({
      allowBase64: true,
      inline: false,
    }),
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Typography,
    Placeholder.configure({
      placeholder: 'Start writing or type "/" for AI & commands...',
    }),
    AiAutocomplete.configure({ debounceMs: 3000 }),
    Comment,
    CharacterCount.configure({
      limit: 1000000,
    }),
    SmartPagination.configure({
        pageHeight: 1000, // Reduced slightly to account for margins and padding
    }),
    Mention.configure({
      HTMLAttributes: {
        class: 'mention-chip',
      },
      suggestion: getMentionSuggestion(teammates),
    }),
  ];

  if (!collaboration) {
    return base;
  }

  return [
    ...base,
    Collaboration.configure({ document: collaboration.ydoc }),
    CollaborationAwarenessCursor.configure({
      provider: collaboration.provider,
      user,
    }),
  ];
};
