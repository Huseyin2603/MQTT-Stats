import React from 'react';
import { Minus, Square, X, Radio } from 'lucide-react';

export const TitleBar: React.FC = () => {
  return (
    <div
      className="flex items-center h-9.5 bg-bg-secondary border-b border-border select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} // Pencereyi sürükle
    >
      {/* Logo & Başlık */}
      <div className="flex items-center gap-2 px-4">
        <Radio size={16} className="text-green" />
        <span className="text-sm font-semibold text-text-primary">
          MQTT Explorer
        </span>
      </div>

      {/* Boşluk (sürüklenebilir alan) */}
      <div className="flex-1" />

      {/* Pencere Kontrolleri */}
      <div
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-11.5 h-9.5 flex items-center justify-center
                     hover:bg-bg-hover transition-colors"
        >
          <Minus size={14} className="text-text-secondary" />
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-11.5 h-9.5 flex items-center justify-center
                     hover:bg-bg-hover transition-colors"
        >
          <Square size={12} className="text-text-secondary" />
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-11.5 h-9.5 flex items-center justify-center
                     hover:bg-red/20 transition-colors group"
        >
          <X size={14} className="text-text-secondary group-hover:text-red" />
        </button>
      </div>
    </div>
  );
};