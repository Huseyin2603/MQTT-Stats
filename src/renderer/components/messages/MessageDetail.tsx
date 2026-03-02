import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy, Check, ArrowDown, ArrowUp, Hash, Trash2,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useMessageStore } from '@/stores/messageStore';
import { MqttMessage } from '@/services/mqtt/MqttTypes';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export const MessageDetail: React.FC = () => {
  const {
    selectedTopic,
    topicHistory,
    historySelectedId,
    selectHistoryMessage,
    clearTopicHistory,
  } = useMessageStore();

  const [copied, setCopied] = useState(false);
  const [viewFormat, setViewFormat] = useState<'auto' | 'raw' | 'json' | 'xml' | 'hex'>('auto');
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const history = useMemo(
    () => (selectedTopic ? (topicHistory[selectedTopic] ?? []) : []),
    [selectedTopic, topicHistory]
  );

  const selectedMsg: MqttMessage | undefined = useMemo(
    () => history.find((m) => m.id === historySelectedId),
    [history, historySelectedId]
  );

  // Auto-select latest message when topic changes or new messages arrive
  useEffect(() => {
    if (history.length > 0) {
      const latest = history[history.length - 1];
      if (!historySelectedId || !history.find((m) => m.id === historySelectedId)) {
        selectHistoryMessage(latest.id);
      }
    }
  }, [selectedTopic, history.length, historySelectedId, selectHistoryMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (history.length > 0) {
      virtuosoRef.current?.scrollToIndex({ index: history.length - 1, behavior: 'smooth' });
    }
  }, [history.length]);

  const formattedPayload = useMemo(() => {
    if (!selectedMsg) return '';
    const fmt = viewFormat === 'auto' ? selectedMsg.payloadFormat : viewFormat;
    if (fmt === 'json') {
      try { return JSON.stringify(JSON.parse(selectedMsg.payload), null, 2); }
      catch { return selectedMsg.payload; }
    }
    if (fmt === 'hex') {
      return Array.from(new TextEncoder().encode(selectedMsg.payload))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
    }
    return selectedMsg.payload;
  }, [selectedMsg, viewFormat]);

  const editorLang = useMemo(() => {
    if (!selectedMsg) return 'plaintext';
    const fmt = viewFormat === 'auto' ? selectedMsg.payloadFormat : viewFormat;
    const map: Record<string, string> = {
      json: 'json', xml: 'xml', raw: 'plaintext', hex: 'plaintext', base64: 'plaintext', protobuf: 'json',
    };
    return map[fmt] || 'plaintext';
  }, [selectedMsg, viewFormat]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!selectedTopic) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: '#8b949e', fontSize: 12,
      }}>
        Select a topic from the tree to view message history
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderBottom: '1px solid #30363d',
        flexShrink: 0, minHeight: 36,
      }}>
        <Hash size={12} style={{ color: '#8b949e', flexShrink: 0 }} />
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#e6edf3',
          fontFamily: 'monospace', flex: 1, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{selectedTopic}</span>
        <span style={{
          fontSize: 10, color: '#8b949e', background: '#21262d',
          padding: '1px 6px', borderRadius: 4, flexShrink: 0,
        }}>{history.length} msg{history.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => clearTopicHistory(selectedTopic)}
          title="Clear history"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#8b949e', padding: '2px 6px', borderRadius: 4,
            fontSize: 10,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#e6edf3'; e.currentTarget.style.background = '#21262d'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.background = 'none'; }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* ── History List (40%) ── */}
      <div style={{
        height: '40%', flexShrink: 0,
        borderBottom: '1px solid #30363d', overflow: 'hidden',
      }}>
        {history.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#8b949e', fontSize: 11,
          }}>
            No messages yet
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={history}
            style={{ height: '100%' }}
            itemContent={(index, msg) => (
              <HistoryRow
                key={msg.id}
                msg={msg}
                isSelected={msg.id === historySelectedId}
                isEven={index % 2 === 0}
                onClick={() => selectHistoryMessage(msg.id)}
              />
            )}
          />
        )}
      </div>

      {/* ── Payload Viewer (60%) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Format toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderBottom: '1px solid #30363d',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: '#8b949e' }}>View as:</span>
          {(['auto', 'raw', 'json', 'xml', 'hex'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setViewFormat(fmt)}
              style={{
                padding: '1px 7px', borderRadius: 4,
                fontSize: 10, fontWeight: 500, cursor: 'pointer',
                border: 'none',
                background: viewFormat === fmt ? '#1f6feb' : '#21262d',
                color: viewFormat === fmt ? '#fff' : '#8b949e',
                transition: 'all 0.15s',
              }}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {selectedMsg && (
            <button
              onClick={() => handleCopy(formattedPayload)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                color: copied ? '#3fb950' : '#8b949e', fontSize: 11,
                padding: '2px 6px', borderRadius: 4,
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>

        {/* Monaco Editor */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {selectedMsg ? (
            <Editor
              height="100%"
              language={editorLang}
              value={formattedPayload || '(empty payload)'}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'Cascadia Code', 'Consolas', monospace",
                lineNumbers: editorLang !== 'plaintext' ? 'on' : 'off',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 8, bottom: 8 },
                renderLineHighlight: 'none',
                automaticLayout: true,
              }}
            />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: '#8b949e', fontSize: 11,
            }}>
              Select a message from the history above
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HistoryRow: React.FC<{
  msg: MqttMessage;
  isSelected: boolean;
  isEven: boolean;
  onClick: () => void;
}> = ({ msg, isSelected, isEven, onClick }) => {
  const preview = msg.payload.length > 80
    ? msg.payload.slice(0, 80) + '…'
    : msg.payload;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', cursor: 'pointer',
        fontSize: 11, userSelect: 'none',
        background: isSelected
          ? '#1c2d4a'
          : isEven ? '#0d1117' : '#0f1419',
        borderLeft: isSelected ? '2px solid #58a6ff' : '2px solid transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#161b22'; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isEven ? '#0d1117' : '#0f1419'; }}
    >
      {/* Direction icon */}
      {msg.direction === 'inbound'
        ? <ArrowDown size={10} style={{ color: '#3fb950', flexShrink: 0 }} />
        : <ArrowUp size={10} style={{ color: '#58a6ff', flexShrink: 0 }} />}

      {/* Timestamp */}
      <span style={{ color: '#8b949e', fontFamily: 'monospace', flexShrink: 0, minWidth: 80 }}>
        {formatTime(msg.timestamp)}
      </span>

      {/* Payload preview */}
      <span style={{
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', color: isSelected ? '#e6edf3' : '#c9d1d9',
        fontFamily: 'monospace',
      }}>
        {preview.length > 0 ? preview : <span style={{ color: '#6e7681', fontStyle: 'italic' }}>(empty)</span>}
      </span>

      {/* QoS badge */}
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '0px 4px', borderRadius: 3,
        background: msg.qos === 0 ? 'rgba(31,111,235,0.2)' : msg.qos === 1 ? 'rgba(227,179,65,0.2)' : 'rgba(255,123,114,0.2)',
        color: msg.qos === 0 ? '#58a6ff' : msg.qos === 1 ? '#e3b341' : '#ff7b72',
        flexShrink: 0,
      }}>
        Q{msg.qos}
      </span>

      {/* Retain badge */}
      {msg.retain && (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '0px 4px', borderRadius: 3,
          background: 'rgba(163,113,247,0.2)', color: '#a371f7', flexShrink: 0,
        }}>
          R
        </span>
      )}

      {/* Size */}
      <span style={{ fontSize: 9, color: '#6e7681', flexShrink: 0 }}>
        {msg.payloadBytes}B
      </span>
    </div>
  );
};