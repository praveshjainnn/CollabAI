import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'

export interface MentionListProps {
  items: Array<{ id: string; name: string; color: string }>
  command: (item: { id: string; name: string }) => void
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]

    if (item) {
      props.command({ id: item.id, name: item.name })
    }
  }

  const upHandler = () => {
    setSelectedIndex(((selectedIndex + props.items.length) - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden min-w-[180px] p-1 animate-fade-in-fast">
      {props.items.length
        ? props.items.map((item, index) => (
          <button
            className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors ${
              index === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: item.color }}
            >
              {item.name[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium truncate">{item.name}</span>
          </button>
        ))
        : <div className="px-3 py-2 text-sm text-slate-400">No teammates found</div>
      }
    </div>
  )
})

MentionList.displayName = 'MentionList'
