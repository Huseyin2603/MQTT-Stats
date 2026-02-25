import React, { useState } from 'react';
import {
  Plus, Trash2, Eye, EyeOff, Hash, Star, StarOff,
} from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { useConnectionStore } from '@/stores/connectionStore';
import { QoS } from '@/services/mqtt/MqttTypes';

// ===== Subscription Tipi =====
interface Subscription {
  id: string;
  topic: string;
  qos: QoS;
  isActive: boolean;
  isFavorite: boolean;
  messageCount: number;
  color: string;
}

// ===== Renk Seçenekleri =====
const TOPIC_COLORS = [
  '#58a6ff', '#3fb950', '#f85149', '#d29922',
  '#bc8cff', '#f0883e', '#39d353', '#db61a2',
];

export const SubscribePanel: React.FC = () => {
  const { activeProfileId, states } = useConnectionStore();
  const isConnected = states[activeProfileId || ''] === 'connected';

  // Local state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [newTopic, setNewTopic] = useState('#');
  const [newQos, setNewQos] = useState<QoS>(0);

  // ── Abone Ol ──
  const handleSubscribe = async () => {
    if (!activeProfileId || !isConnected || !newTopic.trim()) return;

    try {
      const api = (window as any).electronAPI;
      if (!api) throw new Error('electronAPI not available');
      const result = await api.mqttSubscribe(activeProfileId, newTopic.trim(), newQos);
      if (!result.success) throw new Error(result.error || 'Subscribe failed');

      const sub: Subscription = {
        id: uuid(),
        topic: newTopic.trim(),
        qos: newQos,
        isActive: true,
        isFavorite: false,
        messageCount: 0,
        color: TOPIC_COLORS[subscriptions.length % TOPIC_COLORS.length],
      };

      setSubscriptions((prev) => [...prev, sub]);
      setNewTopic('');
    } catch (err: any) {
      console.error('Subscribe failed:', err.message);
    }
  };

  // ── Aboneliği Kaldır ──
  const handleUnsubscribe = async (sub: Subscription) => {
    if (!activeProfileId) return;

    try {
      const api = (window as any).electronAPI;
      if (!api) throw new Error('electronAPI not available');
      const result = await api.mqttUnsubscribe(activeProfileId, sub.topic);
      if (!result.success) throw new Error(result.error || 'Unsubscribe failed');
      setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (err: any) {
      console.error('Unsubscribe failed:', err.message);
    }
  };

  // ── Aboneliği Durdur/Başlat ──
  const toggleActive = async (sub: Subscription) => {
    if (!activeProfileId) return;

    const api = (window as any).electronAPI;
    if (!api) throw new Error('electronAPI not available');

    if (sub.isActive) {
      const result = await api.mqttUnsubscribe(activeProfileId, sub.topic);
      if (!result.success) throw new Error(result.error || 'Unsubscribe failed');
    } else {
      const result = await api.mqttSubscribe(activeProfileId, sub.topic, sub.qos);
      if (!result.success) throw new Error(result.error || 'Subscribe failed');
    }

    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === sub.id ? { ...s, isActive: !s.isActive } : s
      )
    );
  };

  // ── Favori Toggle ──
  const toggleFavorite = (subId: string) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === subId ? { ...s, isFavorite: !s.isFavorite } : s
      )
    );
  };

  // Enter tuşu ile abone ol
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubscribe();
  };

  return (
    <div className="flex flex-col h-full">

      {/* ═══ BAŞLIK ═══ */}
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Subscriptions
        </span>
      </div>

      {/* ═══ YENİ ABONELİK INPUT ═══ */}
      <div className="p-3 border-b border-border space-y-2">
        {/* Topic Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2
                                       text-text-muted" />
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              className="form-input pl-7 w-full"
              placeholder="Topic (e.g. sensor/# or home/+/temp)"
              disabled={!isConnected}
            />
          </div>
        </div>

        {/* QoS + Subscribe Butonu */}
        <div className="flex gap-2">
          <select
            value={newQos}
            onChange={(e) => setNewQos(parseInt(e.target.value) as QoS)}
            className="form-select w-24"
            disabled={!isConnected}
          >
            <option value={0}>QoS 0</option>
            <option value={1}>QoS 1</option>
            <option value={2}>QoS 2</option>
          </select>

          <button
            onClick={handleSubscribe}
            disabled={!isConnected || !newTopic.trim()}
            className="flex-1 flex items-center justify-center gap-1.5
                       px-3 py-1.5 rounded-md text-xs font-medium
                       bg-green/20 text-green hover:bg-green/30
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors"
          >
            <Plus size={14} />
            Subscribe
          </button>
        </div>

        {!isConnected && (
          <div className="text-xs text-yellow text-center py-1">
            ⚠ Connect to a broker first
          </div>
        )}
      </div>

      {/* ═══ ABONELİK LİSTESİ ═══ */}
      <div className="flex-1 overflow-y-auto">
        {subscriptions.length === 0 ? (
          <div className="px-3 py-8 text-center text-text-muted text-xs">
            No subscriptions yet
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-2 px-3 py-2 border-b border-border/50
                         hover:bg-bg-hover transition-colors group"
            >
              {/* Renk çubuğu */}
              <div
                className="w-1 h-8 rounded-full shrink-0"
                style={{ backgroundColor: sub.color }}
              />

              {/* Topic bilgisi */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-mono truncate ${
                  sub.isActive ? 'text-text-primary' : 'text-text-muted line-through'
                }`}>
                  {sub.topic}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className={`
                    px-1 rounded text-[10px] font-bold
                    ${sub.qos === 0 ? 'bg-blue/20 text-blue' : ''}
                    ${sub.qos === 1 ? 'bg-yellow/20 text-yellow' : ''}
                    ${sub.qos === 2 ? 'bg-orange/20 text-orange' : ''}
                  `}>
                    QoS {sub.qos}
                  </span>
                  <span>{sub.messageCount} msgs</span>
                </div>
              </div>

              {/* Aksiyon butonları */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100
                              transition-opacity">
                {/* Favori */}
                <button
                  onClick={() => toggleFavorite(sub.id)}
                  className="p-1 rounded hover:bg-bg-tertiary"
                  title="Toggle favorite"
                >
                  {sub.isFavorite ? (
                    <Star size={12} className="text-yellow fill-yellow" />
                  ) : (
                    <StarOff size={12} className="text-text-muted" />
                  )}
                </button>

                {/* Durdur/Başlat */}
                <button
                  onClick={() => toggleActive(sub)}
                  className="p-1 rounded hover:bg-bg-tertiary"
                  title={sub.isActive ? 'Pause' : 'Resume'}
                >
                  {sub.isActive ? (
                    <Eye size={12} className="text-green" />
                  ) : (
                    <EyeOff size={12} className="text-text-muted" />
                  )}
                </button>

                {/* Sil */}
                <button
                  onClick={() => handleUnsubscribe(sub)}
                  className="p-1 rounded hover:bg-red/20"
                  title="Unsubscribe"
                >
                  <Trash2 size={12} className="text-red" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};