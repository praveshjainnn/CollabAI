'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { WS_URL } from '@/lib/api';
import { createEditorExtensions } from './config/createEditorExtensions';

interface CollaborativeEditorProps {
  docId: string;
  user: { id: string; name: string; color: string };
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void;
  onSynced?: () => void;
}

type CollaborationState = { ydoc: Y.Doc; provider: WebsocketProvider };

export const useCollaborativeEditor = ({
  docId,
  user,
  onStatusChange,
  onSynced,
}: CollaborativeEditorProps) => {
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [collaboration, setCollaboration] = useState<CollaborationState | null>(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const { id: userId, name: userName, color: userColor } = userRef.current;
    if (!docId || !userId) return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(`${WS_URL}/ws`, docId, ydoc, { connect: true });

    providerRef.current = provider;
    provider.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor,
    });

    provider.on('status', ({ status }: { status: string }) => {
      onStatusChange?.(status as 'connecting' | 'connected' | 'disconnected');
    });

    provider.on('sync', (isSynced: boolean) => {
      if (isSynced) onSynced?.();
    });

    setCollaboration({ ydoc, provider });

    return () => {
      provider.destroy();
      ydoc.destroy();
      providerRef.current = null;
      setCollaboration(null);
    };
  }, [docId, onStatusChange, onSynced]);

  const editor = useEditor({
    extensions: createEditorExtensions({ collaboration, user }),
    editorProps: {
      attributes: {
        class: 'doc-prose focus:outline-none',
        spellcheck: 'true',
        'data-placeholder': 'Start writing your collaborative document...',
      },
    },
    immediatelyRender: false,
  }, [collaboration?.ydoc, user.id]); // Only re-create if doc ID or collaboration object changes

  const getProvider = useCallback(() => providerRef.current, []);

  return { editor, getProvider };
};

interface EditorBodyProps {
  editor: ReturnType<typeof useEditor>;
}

export const EditorBody = ({ editor }: EditorBodyProps) => {
  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto min-h-full">
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
};
