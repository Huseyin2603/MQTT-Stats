import React, { useMemo, useState } from 'react';
import {
  Copy, Check, ArrowDown, ArrowUp, Clock, Hash,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useMessageStore } from '@/stores/messageStore';

export const MessageDetail: React.FC = () => {
  const { messages, selectedMessageId } = useMessageStore();
  const [copied, setCopied] = useState(false);
  const [viewFormat, setViewFormat] = useState<'auto' | 'raw' | 'json' | 'xml' | 'hex'>('auto');

  const message = useMemo(
    () => messages.find((m) => m.id === selectedMessageId),
    [messages, selectedMessageId]
  );

  if (!message) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-xs">
        ← Select a message to view details
      </div>
    );
  }

  const formattedPayload = useMemo(() => {
    const fmt = viewFormat === 'auto' ? message.payloadFormat : viewFormat;
    if (fmt === 'json') {
      try { return JSON.stringify(JSON.parse(message.payload), null, 2); }
      catch { return message.payload; }
    }
    if (fmt === 'hex') {
      return Array.from(new TextEncoder().encode(message.payload))
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
    }
    return message.payload;
  }, [message, viewFormat]);

  const editorLang = useMemo(() => {
    const fmt = viewFormat === 'auto' ? message.payloadFormat : viewFormat;
    const map: Record<string, string> = {
      json: 'json', xml: 'xml', raw: 'plaintext', hex: 'plaintext', base64: 'plaintext',
    };
    return map[fmt] || 'plaintext';
  }, [message, viewFormat]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Message Detail
        </span>
      </div>

      <div className="px-3 py-2 border-b border-border space-y-1.5">
        <MetaRow
          icon={message.direction === 'inbound'
            ? <ArrowDown size={11} className="text-green" />
            : <ArrowUp size={11} className="text-blue" />}
          label="Direction"
          value={message.direction === 'inbound' ? 'Received' : 'Sent'}
        />
        <MetaRow
          icon={<Hash size={11} className="text-text-muted" />}
          label="Topic"
          value={message.topic}
          mono
          copyable
          onCopy={() => handleCopy(message.topic)}
        />
        <MetaRow
          icon={<Clock size={11} className="text-text-muted" />}
          label="Time"
          value={new Date(message.timestamp).toLocaleString()}
        />
        <div className="flex items-center gap-2 pt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold
            ${message.qos === 0 ? 'bg-blue/20 text-blue' : ''}
            ${message.qos === 1 ? 'bg-yellow/20 text-yellow' : ''}
            ${message.qos === 2 ? 'bg-orange/20 text-orange' : ''}`}>
            QoS {message.qos}
          </span>
          {message.retain && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple/20 text-purple font-bold">
              Retained
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">
            {message.payloadFormat.toUpperCase()}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">
            {message.payloadBytes} bytes
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
        <span className="text-xs text-text-muted">View as:</span>
        {['auto', 'raw', 'json', 'xml', 'hex'].map((fmt) => (
          <button
            key={fmt}
            onClick={() => setViewFormat(fmt as any)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors
              ${viewFormat === fmt
                ? 'bg-blue text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'}`}>
            {fmt.toUpperCase()}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => handleCopy(formattedPayload)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs
                     text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
          {copied ? <Check size={12} className="text-green" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="flex-1 min-h-0">
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
      </div>
    </div>
  );
};

const MetaRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
}> = ({ icon, label, value, mono, copyable, onCopy }) => (
  <div className="flex items-center gap-2 text-xs group">
    {icon}
    <span className="text-text-muted w-16 shrink-0">{label}</span>
    <span className={`text-text-primary truncate text-selectable ${mono ? 'font-mono' : ''}`}>
      {value}
    </span>
    {copyable && onCopy && (
      <button
        onClick={onCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded
                   hover:bg-bg-hover"
      >
        <Copy size={10} className="text-text-muted" />
      </button>
    )}
  </div>
);