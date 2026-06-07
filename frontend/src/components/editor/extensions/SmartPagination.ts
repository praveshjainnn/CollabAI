import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface SmartPaginationOptions {
  pageHeight: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smartPagination: {
      checkPagination: () => ReturnType;
    };
  }
}

export const SmartPagination = Extension.create<SmartPaginationOptions>({
  name: 'smartPagination',

  addOptions() {
    return {
      pageHeight: 864, // 9 inches of content (11in total - 2in margins)
    };
  },

  addCommands() {
    return {
      checkPagination: () => ({ editor, view, tr, dispatch }) => {
        const { selection } = tr;
        const { $from } = selection;

        // Ensure we are at the end of a block
        if (!$from.parent.isTextblock || $from.parentOffset < $from.parent.content.size) {
          return false;
        }

        try {
          const coords = view.coordsAtPos($from.pos);
          
          // Find the depth since the last break
          let lastBreakPos = 0;
          editor.state.doc.descendants((node, pos) => {
            if (pos >= $from.pos) return false;
            // Detect our custom PageBreak node
            if (node.type.name === 'pageBreak') {
              lastBreakPos = pos;
            }
            return true;
          });

          let lastBreakY = 0;
          if (lastBreakPos > 0) {
            try {
              lastBreakY = view.coordsAtPos(lastBreakPos).bottom;
            } catch (e) {
              lastBreakY = 0;
            }
          } else {
            // First page (account for docPaper padding of approx 1in = 96px)
            const firstPos = view.coordsAtPos(1);
            lastBreakY = firstPos.top;
          }

          const currentHeight = coords.bottom - lastBreakY;

          if (currentHeight > this.options.pageHeight) {
            if (dispatch) {
               // Use our custom grid-locked PageBreak node
               tr.insert(tr.selection.to, editor.schema.nodes.pageBreak.create());
            }
            return true;
          }
        } catch (error) {
          // Coords can fail during layout shifts - ignore silently
        }

        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    // Guard to prevent re-entrant / infinite-loop page-break insertion
    let isInserting = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    return [
      new Plugin({
        key: new PluginKey('smartPagination'),
        view: () => {
          return {
            update: (view, prevState) => {
              // Only check on actual content changes
              if (prevState && prevState.doc.eq(view.state.doc)) return;

              // Don't re-enter while we're already inserting a page break
              if (isInserting) return;

              // Width guard: Skip pagination on narrow screens where A4 layout breaks anyway
              // 600px is a safe threshold for "enough space for A4"
              if (view.dom.clientWidth < 600) return;

              // Debounce: wait for editing to settle before checking pagination
              if (debounceTimer) clearTimeout(debounceTimer);
              debounceTimer = setTimeout(() => {
                if (view.isDestroyed) return;
                if (isInserting) return;

                isInserting = true;
                try {
                  this.editor.commands.checkPagination();
                } finally {
                  // Release the guard after a tick to let the resulting
                  // transaction fully propagate before we allow another check
                  setTimeout(() => {
                    isInserting = false;
                  }, 100);
                }
              }, 1000);
            },
            destroy: () => {
              if (debounceTimer) clearTimeout(debounceTimer);
            },
          };
        },
      }),
    ];
  },
});
