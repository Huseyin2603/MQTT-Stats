import React, { useMemo } from 'react';
import {
  ArrowDown, ArrowUp, Trash2, Search, Filter, X,
} from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { useMessageStore } from '@/stores/messageStore';
import { MqttMessage } from '@/services/mqtt/MqttTypes';
import { formatDistanceToNow } from 'date-fns';

export const MessageList: React.FC = () => {
  const {
    messages, selectedTopic, selectedMessageId,
    searchText, topicFilter,
    selectMessage, setSearchText, setTopicFilter, clearAll,
  } = useMessageStore();

  // ── Filtrelenmiş mesajlar ──
  const filtered = useMemo(() => {
    let result = [...messages];

    // Topic filtresi
    if (selectedTopic) {
      result = result.filter((m) => m.topic === selectedTopic);
    }

    if (topicFilter) {
      try {
        const regex = new RegExp(topicFilter, 'i');
        result = result.filter((m) => regex.test(m.topic));
      } catch {
        result = result.filter((m) =>
          m.topic.toLowerCase().includes(topicFilter.toLowerCase())
        );
      }
    }

    // Metin araması
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (m) =>
          m.payload.toLowerCase().includes(search) ||
          m.topic.toLowerCase().includes(search)
      );
    }

    // En yenisi üstte
    return result.reverse();
  }, [messages, selectedTopic, topicFilter, searchText]);

  // ── Tek mesaj satırı ──
  const MessageRow: React.FC<{ msg: MqttMessage }> = ({ msg }) => {
    const isSelected = msg.id === selectedMessageId;
    const isInbound = msg.direction === 'inbound';

    return (
      <div
        onClick={() => selectMessage(msg.id)}
        className={`
          flex items-start gap-2 px-3 py-2 cursor-pointer
          border-b border-border/30 transition-colors
          ${isSelected ? 'bg-blue/10' : 'hover:bg-bg-hover'}
        `}
      >
        {/* Yön ikonu */}
        <div className="shrink-0 mt-0.5">
          {isInbound ? (
            <ArrowDown size={12} className="text-green" />
          ) : (
            <ArrowUp size={12} className="text-blue" />
          )}
        </div>

        {/* İçerik */}
        <div className="flex-1 min-w-0">
          {/* Topic + Meta */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-blue truncate">
              {msg.topic}
            </span>
            <span className={`
              text-[9px] px-1 rounded font-bold shrink-0
              ${msg.qos === 0 ? 'bg-blue/20 text-blue' : ''}
              ${msg.qos === 1 ? 'bg-yellow/20 text-yellow' : ''}
              ${msg.qos === 2 ? 'bg-orange/20 text-orange' : ''}
            `}>
              Q{msg.qos}
            </span>
            {msg.retain && (
              <span className="text-[9px] px-1 rounded bg-purple/20 text-purple font-bold shrink-0">
                RET
              </span>
            )}
            <span className="text-[9px] px-1 rounded bg-bg-tertiary text-text-muted shrink-0">
              {msg.payloadFormat.toUpperCase()}
            </span>
          </div>

          {/* Payload önizleme */}
          <div className="text-xs font-mono text-text-secondary truncate mt-0.5
                          text-selectable">
            {msg.payload.length > 200
              ? msg.payload.substring(0, 200) + '...'
              : msg.payload || '(empty)'}
          </div>
        </div>

        {/* Zaman + Boyut */}
        <div className="shrink-0 text-right">
          <div className="text-[10px] text-text-muted">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </div>
          <div className="text-[10px] text-text-muted">
            {msg.payloadBytes}B
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">

      {/* ═══ BAŞLIK + FİLTRE BAR ═══ */}
      <div className="px-3 py-2 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Messages ({filtered.length})
          </span>
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs
                       text-text-muted hover:text-red hover:bg-red/10
                       transition-colors"
          >
            <Trash2 size={10} />
            Clear
          </button>
        </div>

        {/* Arama */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2
                                         text-text-muted" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="form-input w-full pl-7 text-xs"
              placeholder="Search messages..."
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X size={12} className="text-text-muted hover:text-text-primary" />
              </button>
            )}
          </div>

          <div className="relative">
            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2
                                         text-text-muted" />
            <input
              type="text"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="form-input w-40 pl-7 text-xs"
              placeholder="Topic filter..."
            />
          </div>
        </div>

        {/* Aktif topic filtresi varsa göster */}
        {selectedTopic && (
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-blue/10 text-xs">
            <span className="text-text-secondary">Topic:</span>
            <span className="text-blue font-mono">{selectedTopic}</span>
            <button
              onClick={() => useMessageStore.getState().selectTopic(null)}
              className="ml-auto"
            >
              <X size={12} className="text-text-muted hover:text-text-primary" />
            </button>
          </div>
        )}
      </div>

      {/* ═══ MESAJ LİSTESİ (Virtualized) ═══ */}
      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            {messages.length === 0
              ? 'No messages yet. Subscribe to a topic to see messages.'
              : 'No messages match your filter.'}
          </div>
        ) : (
          <Virtuoso
            data={filtered}
            itemContent={(_: number, msg: MqttMessage) => <MessageRow msg={msg} />}
            overscan={20}
            style={{ height: '100%' }}
          />
        )}
      </div>
    </div>
  );
};