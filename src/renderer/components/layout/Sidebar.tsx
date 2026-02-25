import React from 'react';
import {
  Plus, Wifi, WifiOff, Loader2, Trash2, MoreVertical,
} from 'lucide-react';
import { useConnectionStore } from '@/stores/connectionStore';

export const Sidebar: React.FC = () => {
  const {
    profiles, states, activeProfileId,
    addProfile, setActiveProfile, removeProfile,
    connect, disconnect,
  } = useConnectionStore();

  // Bağlantı durumu renkleri
  const stateColors: Record<string, string> = {
    connected: 'bg-green',
    connecting: 'bg-yellow animate-pulse',
    reconnecting: 'bg-yellow animate-pulse',
    disconnected: 'bg-text-muted',
    error: 'bg-red',
  };

  const stateIcons: Record<string, React.ReactNode> = {
    connected: <Wifi size={14} className="text-green" />,
    connecting: <Loader2 size={14} className="text-yellow animate-spin" />,
    reconnecting: <Loader2 size={14} className="text-yellow animate-spin" />,
    disconnected: <WifiOff size={14} className="text-text-muted" />,
    error: <WifiOff size={14} className="text-red" />,
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-r border-border">
      {/* Başlık */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Connections
        </span>
        <button
          onClick={() => {
            const id = addProfile();
            setActiveProfile(id);
          }}
          className="p-1 rounded hover:bg-bg-hover transition-colors"
          title="New Connection"
        >
          <Plus size={14} className="text-text-secondary" />
        </button>
      </div>

      {/* Bağlantı Listesi */}
      <div className="flex-1 overflow-y-auto py-1">
        {profiles.length === 0 && (
          <div className="px-3 py-8 text-center text-text-muted text-xs">
            No connections yet.
            <br />
            Click <strong>+</strong> to add one.
          </div>
        )}

        {profiles.map((profile) => {
          const state = states[profile.id] || 'disconnected';
          const isActive = profile.id === activeProfileId;

          return (
            <div
              key={profile.id}
              onClick={() => setActiveProfile(profile.id)}
              className={`
                flex items-center gap-2 px-3 py-2 mx-1 rounded cursor-pointer
                transition-colors duration-100
                ${isActive ? 'bg-bg-tertiary' : 'hover:bg-bg-hover'}
              `}
            >
              {/* Durum noktası */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${stateColors[state]}`} />

              {/* İsim & Host */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary truncate">
                  {profile.name}
                </div>
                <div className="text-xs text-text-muted truncate">
                  {profile.host}:{profile.port}
                </div>
              </div>

              {/* Durum ikonu */}
              <div className="shrink-0">
                {stateIcons[state]}
              </div>

              {/* Bağlan/Kes butonu */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (state === 'connected') disconnect(profile.id);
                  else connect(profile.id);
                }}
                className="p-1 rounded hover:bg-bg-hover transition-colors shrink-0"
                title={state === 'connected' ? 'Disconnect' : 'Connect'}
              >
                {state === 'connected' ? (
                  <WifiOff size={12} className="text-red" />
                ) : (
                  <Wifi size={12} className="text-green" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Alt bilgi */}
      <div className="px-3 py-2 border-t border-border text-xs text-text-muted">
        {profiles.filter((p) => states[p.id] === 'connected').length} connected
      </div>
    </div>
  );
};