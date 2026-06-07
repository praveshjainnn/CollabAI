'use client';

import { Extension } from '@tiptap/core';
import { yCursorPlugin } from '@tiptap/y-tiptap';
import type { Awareness } from 'y-protocols/awareness';

interface CursorUser {
  id: string;
  name: string;
  color: string;
}

interface CursorOptions {
  provider: {
    awareness: Awareness;
  } | null;
  user: CursorUser;
}

const defaultCursorBuilder = (user: CursorUser) => {
  const cursor = document.createElement('span');
  cursor.classList.add('collaboration-cursor__caret');
  cursor.style.borderColor = user.color;
  cursor.style.borderStyle = 'solid';
  cursor.style.borderWidth = '1px';
  cursor.style.position = 'relative';
  cursor.style.marginLeft = '-1px';
  cursor.style.marginRight = '-1px';
  cursor.style.userSelect = 'none';
  cursor.style.pointerEvents = 'none';
  cursor.style.zIndex = '10';

  const label = document.createElement('div');
  label.classList.add('collaboration-cursor__label');
  label.style.backgroundColor = user.color;
  label.style.color = '#fff';
  label.style.position = 'absolute';
  label.style.top = '-20px';
  label.style.left = '-1px';
  label.style.fontSize = '10px';
  label.style.fontWeight = 'bold';
  label.style.lineHeight = 'normal';
  label.style.userSelect = 'none';
  label.style.pointerEvents = 'none';
  label.style.whiteSpace = 'nowrap';
  label.style.padding = '1px 4px';
  label.style.borderRadius = '3px 3px 3px 0';
  label.style.zIndex = '11';
  label.innerText = user.name;

  cursor.appendChild(label);
  return cursor;
};

export const CollaborationAwarenessCursor = Extension.create<CursorOptions>({
  name: 'collaborationAwarenessCursor',
  priority: 999,

  addOptions() {
    return {
      provider: null,
      user: {
        id: '',
        name: 'Anonymous',
        color: '#6366f1',
      },
    };
  },

  addStorage() {
    return {
      users: [] as Array<CursorUser & { clientId: number }>,
    };
  },

  onCreate() {
    if (!this.options.provider?.awareness) {
      throw new Error('The "provider" option is required for CollaborationAwarenessCursor.');
    }

    this.options.provider.awareness.setLocalStateField('user', this.options.user);
    this.storage.users = Array.from(this.options.provider.awareness.states.entries()).map(([clientId, state]) => ({
      clientId,
      ...(state.user || { id: '', name: 'Anonymous', color: '#6366f1' }),
    }));

    this.options.provider.awareness.on('update', () => {
      this.storage.users = Array.from(this.options.provider!.awareness.states.entries()).map(([clientId, state]) => ({
        clientId,
        ...(state.user || { id: '', name: 'Anonymous', color: '#6366f1' }),
      }));
    });
  },

  addProseMirrorPlugins() {
    return [
      yCursorPlugin(this.options.provider!.awareness, {
        cursorBuilder: (user) => defaultCursorBuilder(user as CursorUser),
      }),
    ];
  },
});
