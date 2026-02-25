import React, { useRef, useEffect } from 'react';
import { Trash2, Download } from 'lucide-react';
import { useConnectionStore } from '@/stores/connectionStore';

export const LogPanel: React.FC = () => {
  const { activeProfileId, logs } = useConnectionStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentLogs = activeProfileId ? logs[activeProfileId] || [] : [];

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentLogs.length]);

  const levelColors: Record<string, string> = {
    info: 'text-blue',
    warn: 'text-yellow',
    error: 'text-red',
    debug: 'text-text-muted',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Connection Log
        </span>
        <span className="text-[10px] text-text-muted">{currentLogs.length} entries</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {currentLogs.length === 0 ? (
          <div className="text-text-muted text-center py-4">No logs yet</div>
        ) : (
          currentLogs.map((log, i) => (
            <div key={i} className="flex gap-2 py-0.5 hover:bg-bg-hover rounded px-1">
              <span className="text-text-muted shrink-0 w-17.5">
                {new Date(log.time).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 w-10.5 uppercase font-bold ${levelColors[log.level] || 'text-text-muted'}`}>
                {log.level}
              </span>
              <span className="text-text-primary text-selectable">{log.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};