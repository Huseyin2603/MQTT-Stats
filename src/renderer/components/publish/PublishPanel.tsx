import React, { useState, useCallback } from 'react';
import {
  Send, Clock, Copy, RotateCcw, BookTemplate, ChevronDown,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { v4 as uuid } from 'uuid';
import { useConnectionStore } from '@/stores/connectionStore';
import { useMessageStore } from '@/stores/messageStore';
import { QoS, PayloadFormat, MqttMessage } from '@/services/mqtt/MqttTypes';

// ===== Format Tanımları =====
const FORMAT_OPTIONS: {
  value: PayloadFormat;
  label: string;
  monacoLang: string;
  placeholder: string;
}[] = [
  {
    value: 'raw',
    label: 'Raw',
    monacoLang: 'plaintext',
    placeholder: 'Enter plain text message...',
  },
  {
    value: 'json',
    label: 'JSON',
    monacoLang: 'json',
    placeholder: '{\n  "temperature": 25.5,\n  "humidity": 60\n}',
  },
  {
    value: 'xml',
    label: 'XML',
    monacoLang: 'xml',
    placeholder: '<sensor>\n  <temperature>25.5</temperature>\n  <humidity>60</humidity>\n</sensor>',
  },
  {
    value: 'hex',
    label: 'HEX',
    monacoLang: 'plaintext',
    placeholder: '48 65 6C 6C 6F',
  },
  {
    value: 'base64',
    label: 'Base64',
    monacoLang: 'plaintext',
    placeholder: 'SGVsbG8gV29ybGQ=',
  },
];

export const PublishPanel: React.FC = () => {
  const { activeProfileId, states } = useConnectionStore();
  const { addMessage } = useMessageStore();
  const isConnected = states[activeProfileId || ''] === 'connected';

  // ── State ──
  const [topic, setTopic] = useState('');
  const [payload, setPayload] = useState('');
  const [format, setFormat] = useState<PayloadFormat>('raw');
  const [qos, setQos] = useState<QoS>(0);
  const [retain, setRetain] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // ── Geçmiş ──
  const [history, setHistory] = useState<
    { topic: string; payload: string; format: PayloadFormat; qos: QoS; time: number }[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);

  // Mevcut format bilgisi
  const currentFormat = FORMAT_OPTIONS.find((f) => f.value === format)!;

  // ── Payload Doğrulama ──
  const validatePayload = useCallback((): string | null => {
    if (!payload.trim()) return null;

    if (format === 'json') {
      try {
        JSON.parse(payload);
        return null; // Geçerli
      } catch (e: any) {
        return `Invalid JSON: ${e.message}`;
      }
    }

    if (format === 'xml') {
      if (!payload.trim().startsWith('<')) {
        return 'XML must start with <';
      }
    }

    if (format === 'hex') {
      if (!/^([0-9a-fA-F]{2}\s?)*$/.test(payload.trim())) {
        return 'Invalid HEX format. Use: 48 65 6C 6C 6F';
      }
    }

    return null;
  }, [payload, format]);

  const validationError = validatePayload();

  // ── Mesaj Gönder ──
  const handlePublish = async () => {
    if (!activeProfileId || !isConnected || !topic.trim()) return;

    setIsSending(true);

    try {
      // Payload'ı hazırla
      let finalPayload = payload;

      // JSON ise güzelleştir (opsiyonel)
      if (format === 'json' && payload.trim()) {
        try {
          finalPayload = JSON.stringify(JSON.parse(payload));
        } catch {
          // Zaten hatalıysa olduğu gibi gönder
        }
      }

      // MQTT ile gönder
      const api = (window as any).electronAPI;
      if (!api) throw new Error('electronAPI not available');
      const result = await api.mqttPublish(activeProfileId, topic.trim(), finalPayload, qos, retain);
      if (!result.success) throw new Error(result.error || 'Publish failed');

      // Giden mesajı store'a ekle
      const outMsg: MqttMessage = {
        id: uuid(),
        connectionId: activeProfileId,
        topic: topic.trim(),
        payload: finalPayload,
        payloadBytes: new TextEncoder().encode(finalPayload).length,
        payloadFormat: format,
        qos,
        retain,
        duplicate: false,
        timestamp: Date.now(),
        direction: 'outbound',
      };
      addMessage(outMsg);

      // Geçmişe ekle
      setHistory((prev) => [
        { topic: topic.trim(), payload, format, qos, time: Date.now() },
        ...prev.slice(0, 19), // Max 20 kayıt
      ]);

    } catch (err: any) {
      console.error('Publish failed:', err.message);
    } finally {
      setIsSending(false);
    }
  };

  // ── Geçmişten Yükle ──
  const loadFromHistory = (entry: typeof history[0]) => {
    setTopic(entry.topic);
    setPayload(entry.payload);
    setFormat(entry.format);
    setQos(entry.qos);
    setShowHistory(false);
  };

  // Enter kısayolu (Ctrl+Enter ile gönder)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handlePublish();
    }
  };

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>

      {/* ═══ BAŞLIK ═══ */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Publish
        </span>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs
                     text-text-muted hover:text-text-primary hover:bg-bg-hover
                     transition-colors"
          title="Publish History"
        >
          <Clock size={12} />
          History ({history.length})
        </button>
      </div>

      {/* ═══ GEÇMIŞ DROPDOWN ═══ */}
      {showHistory && history.length > 0 && (
        <div className="border-b border-border max-h-50 overflow-y-auto bg-bg-tertiary">
          {history.map((entry, i) => (
            <button
              key={i}
              onClick={() => loadFromHistory(entry)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left
                         hover:bg-bg-hover transition-colors border-b border-border/30"
            >
              <span className="text-xs font-mono text-blue truncate flex-1">
                {entry.topic}
              </span>
              <span className="text-[10px] px-1 rounded bg-bg-primary text-text-muted">
                {entry.format.toUpperCase()}
              </span>
              <span className="text-[10px] text-text-muted">
                {new Date(entry.time).toLocaleTimeString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ═══ TOPIC INPUT ═══ */}
      <div className="px-3 pt-3 pb-2">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="form-input w-full font-mono"
          placeholder="Topic (e.g. home/sensor/temperature)"
          disabled={!isConnected}
        />
      </div>

      {/* ═══ FORMAT + QOS + RETAIN BAR ═══ */}
      <div className="flex items-center gap-2 px-3 pb-2">
      {/* Format Seçici */}
<div style={{
  display: 'flex', borderRadius: 6, overflow: 'hidden',
  border: '1px solid #30363d',
}}>
  {FORMAT_OPTIONS.map((opt) => (
    <button
      key={opt.value}
      onClick={() => setFormat(opt.value)}
      style={{
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        backgroundColor: format === opt.value ? '#58a6ff' : '#1c2333',
        color: format === opt.value ? '#ffffff' : '#8b949e',
        borderRight: '1px solid #30363d',
        transition: 'all 0.15s',
      }}
    >
      {opt.label}
    </button>
  ))}
</div>

        {/* Boşluk */}
        <div className="flex-1" />

        {/* QoS */}
        <select
          value={qos}
          onChange={(e) => setQos(parseInt(e.target.value) as QoS)}
          className="form-select text-xs w-20"
        >
          <option value={0}>QoS 0</option>
          <option value={1}>QoS 1</option>
          <option value={2}>QoS 2</option>
        </select>

        {/* Retain */}
        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={retain}
            onChange={(e) => setRetain(e.target.checked)}
            className="form-checkbox"
          />
          Retain
        </label>
      </div>

      {/* ═══ PAYLOAD EDITOR (Monaco) ═══ */}
      <div className="flex-1 px-3 pb-2 min-h-0">
        <div className="h-full rounded-md overflow-hidden border border-border">
          <Editor
            height="100%"
            language={currentFormat.monacoLang}
            value={payload}
            onChange={(value: string | undefined) => setPayload(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'Cascadia Code', 'Consolas', monospace",
              lineNumbers: format === 'json' || format === 'xml' ? 'on' : 'off',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: 'none',
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              placeholder: currentFormat.placeholder,
              tabSize: 2,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* ═══ DOĞRULAMA HATASI ═══ */}
      {validationError && (
        <div className="px-3 pb-1">
          <div className="text-xs text-red px-2 py-1 rounded bg-red/10">
            ⚠ {validationError}
          </div>
        </div>
      )}

      {/* ═══ GÖNDER BAR ═══ */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        {/* Payload boyutu */}
        <span className="text-xs text-text-muted">
          {new TextEncoder().encode(payload).length} bytes
        </span>

        <div className="flex-1" />

        {/* Temizle */}
        <button
          onClick={() => setPayload('')}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs
                     text-text-muted hover:text-text-primary hover:bg-bg-hover
                     transition-colors"
          title="Clear payload"
        >
          <RotateCcw size={12} />
          Clear
        </button>

        {/* Gönder */}
        <button
          onClick={handlePublish}
          disabled={!isConnected || !topic.trim() || isSending || !!validationError}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium
                     bg-blue text-white hover:bg-blue/80
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          <Send size={14} />
          {isSending ? 'Sending...' : 'Publish'}
          <span className="text-[10px] opacity-60 ml-1">Ctrl+Enter</span>
        </button>
      </div>
    </div>
  );
};