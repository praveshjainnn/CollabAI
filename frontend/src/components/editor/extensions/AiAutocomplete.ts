import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { api } from '@/lib/api';

export interface AiAutocompleteOptions {
  debounceMs: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiAutocomplete: {
      acceptSuggestion: () => ReturnType;
    };
  }
}

export const AiAutocomplete = Extension.create<AiAutocompleteOptions>({
  name: 'aiAutocomplete',

  addOptions() {
    return {
      debounceMs: 3000,
    };
  },

  addStorage() {
    return {
      suggestion: '',
    };
  },

  addCommands() {
    return {
      acceptSuggestion: () => ({ tr, dispatch, editor }) => {
        const suggestion = this.storage.suggestion;
        if (!suggestion || !dispatch) return false;

        const { from } = tr.selection;
        tr.insertText(suggestion, from);
        this.storage.suggestion = '';
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.storage.suggestion) {
          return this.editor.commands.acceptSuggestion();
        }
        return false;
      },
      Escape: () => {
        if (this.storage.suggestion) {
          this.storage.suggestion = '';
          this.editor.view.dispatch(this.editor.state.tr); // force redraw
          return true;
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const key = new PluginKey('aiAutocomplete');
    let timeout: NodeJS.Timeout | null = null;

    return [
      new Plugin({
        key,
        props: {
          decorations: (state) => {
            const suggestion = this.storage.suggestion;
            if (!suggestion) return DecorationSet.empty;

            const { selection } = state;
            if (!selection.empty) return DecorationSet.empty;

            const widget = document.createElement('span');
            widget.className = 'ai-ghost-text';
            widget.textContent = suggestion;
            widget.style.color = '#94a3b8';
            widget.style.fontStyle = 'italic';
            widget.style.pointerEvents = 'none';
            widget.style.userSelect = 'none';

            return DecorationSet.create(state.doc, [
              Decoration.widget(selection.from, widget, { side: 1 })
            ]);
          },
          handleKeyDown: (view, event) => {
            // Any typing clears the current suggestion
            if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
              this.storage.suggestion = '';
            }
            return false;
          },
        },
        view: (view) => {
          return {
            update: (view, prevState) => {
              const { state } = view;
              
              // Only trigger if doc changed or selection moved
              if (prevState && prevState.doc.eq(state.doc) && prevState.selection.eq(state.selection)) {
                return;
              }

              this.storage.suggestion = '';

              if (timeout) clearTimeout(timeout);
              
              if (!state.selection.empty || state.doc.textContent.length < 5) return;

              timeout = setTimeout(async () => {
                if (view.isDestroyed) return;
                
                try {
                  const documentText = state.doc.textBetween(Math.max(0, state.selection.from - 2000), state.selection.from, '\n');
                  if (!documentText.trim()) return;

                  const { data } = await api.post('/ai/autocomplete', { documentText });
                  
                  if (data.output && !view.isDestroyed) {
                    this.storage.suggestion = data.output;
                    view.dispatch(view.state.tr); // force redraw to show decoration
                  }
                } catch (err) {
                  // silent fail for autocomplete
                }
              }, this.options.debounceMs);
            },
          };
        },
      }),
    ];
  },
});
