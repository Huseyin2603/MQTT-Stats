import React from 'react';
import { Activity, ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { useMessageStore } from '@/stores/messageStore';
import { useConnectionStore } from '@/stores/connectionStore';

export const StatusBar: React.FC = () => {
  const { totalReceived, totalSent } = useMessageStore();
  const { profiles, states } = useConnectionStore();

  const connectedCount = profiles.filter(
    (p) => states[p.id] === 'connected'
  ).length;

  return (
    <div className="flex items-center h-6 px-3 bg-bg-secondary border-t border-border
                    text-[11px] text-text-muted gap-4">
      {/* Bağlantı durumu */}
      <div className="flex items-center gap-1">
        <Activity size={10} />
        <span>{connectedCount} connected</span>
      </div>

      {/* Gelen mesaj */}
      <div className="flex items-center gap-1">
        <ArrowDown size={10} className="text-green" />
        <span>{totalReceived.toLocaleString()} received</span>
      </div>

      {/* Giden mesaj */}
      <div className="flex items-center gap-1">
        <ArrowUp size={10} className="text-blue" />
        <span>{totalSent.toLocaleString()} sent</span>
      </div>

      {/* Boşluk */}
      <div className="flex-1" />

      {/* Saat */}
      <div className="flex items-center gap-1">
        <Clock size={10} />
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};