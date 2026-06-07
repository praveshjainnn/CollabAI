'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Users, Wifi, WifiOff, Globe } from 'lucide-react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';

interface OnlineUser {
  id: string;
  name: string;
  color: string;
  cursor?: unknown;
}

interface PresenceBarProps {
  status: 'connecting' | 'connected' | 'disconnected';
  users: OnlineUser[];
  currentUserId: string;
}

export const PresenceBar = ({ status, users, currentUserId }: PresenceBarProps) => {
  const [showAll, setShowAll] = useState(false);
  
  // Filter out users without valid names and deduplicate
  // We include the current user to show their avatar too, or filter if requested
  const others = users.filter((u) => u.id !== currentUserId && u.name);
  const currentUser = users.find(u => u.id === currentUserId);
  
  const displayUsers = showAll ? others : others.slice(0, 3);
  const remaining = others.length - 3;

  return (
    <div className="flex items-center gap-3 ml-auto mr-2">
      {/* Connection Status Capsule */}
      <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all duration-300 ${
        status === 'connected' 
          ? 'bg-emerald-50/50 border-emerald-100' 
          : 'bg-slate-50/50 border-slate-100'
      }`}>
        {status === 'connected' ? (
          <div className="flex items-center gap-1.5" title="Connected and syncing">
            <div className="relative flex h-2 w-2">
              <span className="status-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider hidden lg:block">Live</span>
          </div>
        ) : status === 'connecting' ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
            <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold hidden lg:block">Syncing</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] uppercase tracking-wider text-rose-600 font-bold hidden lg:block">Offline</span>
          </div>
        )}
      </div>

      {/* Avatars Stack */}
      <div className="flex items-center -space-x-2 mr-1 scale-90 sm:scale-100">
        {/* Current User Avatar (First) */}
        {currentUser && (
          <CurrentUserAvatar user={currentUser} />
        )}

        {/* Other Collaborators */}
        {displayUsers.map((u, idx) => (
          <CollaboratorAvatar key={u.id} user={u} index={idx} />
        ))}

        {/* More Badge */}
        {!showAll && remaining > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold shadow-sm hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 z-0"
          >
            +{remaining}
          </button>
        )}
      </div>
    </div>
  );
};

const CurrentUserAvatar = ({ user }: { user: OnlineUser }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const instance = tippy(ref.current, {
      content: `You (${user.name})`,
      theme: 'premium',
      animation: 'shift-away',
    });
    return () => instance.destroy();
  }, [user.name]);

  return (
    <div ref={ref} className="group relative z-20 cursor-default">
      <div 
        className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-bold shadow-sm ring-2 ring-indigo-500/10 transition-transform active:scale-95"
        style={{ background: user.color }}
      >
        {user.name[0]?.toUpperCase() || 'Y'}
      </div>
    </div>
  );
};

const CollaboratorAvatar = ({ user, index }: { user: OnlineUser; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const instance = tippy(ref.current, {
      content: user.name,
      theme: 'premium',
      animation: 'shift-away',
    });
    return () => instance.destroy();
  }, [user.name]);

  return (
    <div
      ref={ref}
      className="group relative transition-all hover:scale-105 hover:z-30 cursor-default"
      style={{ zIndex: 10 - index }}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-bold shadow-md transition-all group-hover:ring-2 group-hover:ring-indigo-500/30"
        style={{ background: user.color }}
      >
        {user.name[0]?.toUpperCase()}
      </div>
    </div>
  );
};
