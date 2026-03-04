import React, { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';
import { useMessageStore } from '@/stores/messageStore';
import { MqttMessage } from '@/services/mqtt/MqttTypes';

type ExportFormat = 'excel' | 'csv';

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const flatKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value as Record<string, unknown>, flatKey));
    } else {
      acc[flatKey] = value;
    }
    return acc;
  }, {} as Record<string, unknown>);
}

function getPayloadFlattened(msg: MqttMessage): Record<string, unknown> | null {
  let src = msg.decodedPayload;
  if (src === undefined || src === null) {
    try { src = JSON.parse(msg.payload); } catch { return null; }
  }
  if (src !== null && typeof src === 'object' && !Array.isArray(src)) {
    return flattenObject(src as Record<string, unknown>);
  }
  return null;
}

async function exportToExcel(messages: MqttMessage[], fileName: string, flatten: boolean) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('MQTT Messages');

  const baseColumns: Partial<ExcelJS.Column>[] = [
    { header: 'Timestamp', key: 'timestamp', width: 25 },
    { header: 'Topic', key: 'topic', width: 30 },
    { header: 'Direction', key: 'direction', width: 10 },
    { header: 'QoS', key: 'qos', width: 5 },
    { header: 'Retain', key: 'retain', width: 8 },
    { header: 'Format', key: 'format', width: 10 },
    { header: 'Size (bytes)', key: 'size', width: 12 },
  ];

  if (flatten) {
    // Collect all flattened keys across all messages
    const allKeys = new Set<string>();
    const flattenedRows = messages.map((msg) => {
      const flat = getPayloadFlattened(msg);
      if (flat) Object.keys(flat).forEach((k) => allKeys.add(k));
      return flat;
    });

    const payloadKeys = Array.from(allKeys).sort();
    sheet.columns = [
      ...baseColumns,
      ...payloadKeys.map((k) => ({ header: `payload.${k}`, key: `__payload_${k}`, width: 20 })),
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };

    messages.forEach((msg, i) => {
      const row: Record<string, unknown> = {
        timestamp: new Date(msg.timestamp).toISOString(),
        topic: msg.topic,
        direction: msg.direction,
        qos: msg.qos,
        retain: msg.retain,
        format: msg.payloadFormat,
        size: msg.payloadBytes,
      };
      const flat = flattenedRows[i];
      if (flat) {
        payloadKeys.forEach((k) => { row[`__payload_${k}`] = flat[k] ?? ''; });
      }
      sheet.addRow(row);
    });
  } else {
    sheet.columns = [
      ...baseColumns,
      { header: 'Payload (Raw)', key: 'payloadRaw', width: 50 },
      { header: 'Payload (Decoded)', key: 'payloadDecoded', width: 50 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };

    messages.forEach((msg) => {
      sheet.addRow({
        timestamp: new Date(msg.timestamp).toISOString(),
        topic: msg.topic,
        direction: msg.direction,
        qos: msg.qos,
        retain: msg.retain,
        payloadRaw: msg.payload,
        payloadDecoded: msg.decodedPayload ? JSON.stringify(msg.decodedPayload) : msg.payload,
        format: msg.payloadFormat,
        size: msg.payloadBytes,
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, fileName);
}

function escapeCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""').replace(/\r?\n/g, '\\n')}"`;
}

function exportToCsv(messages: MqttMessage[], fileName: string, flatten: boolean) {
  let headers: string[];
  let rows: unknown[][];

  if (flatten) {
    const allKeys = new Set<string>();
    const flattenedRows = messages.map((msg) => {
      const flat = getPayloadFlattened(msg);
      if (flat) Object.keys(flat).forEach((k) => allKeys.add(k));
      return flat;
    });
    const payloadKeys = Array.from(allKeys).sort();
    headers = [
      'Timestamp', 'Topic', 'Direction', 'QoS', 'Retain', 'Format', 'Size (bytes)',
      ...payloadKeys.map((k) => `payload.${k}`),
    ];
    rows = messages.map((msg, i) => {
      const flat = flattenedRows[i];
      return [
        new Date(msg.timestamp).toISOString(),
        msg.topic,
        msg.direction,
        msg.qos,
        msg.retain,
        msg.payloadFormat,
        msg.payloadBytes,
        ...payloadKeys.map((k) => {
          const v = flat?.[k] ?? '';
          const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
          return escapeCsvValue(str);
        }),
      ];
    });
  } else {
    headers = [
      'Timestamp', 'Topic', 'Direction', 'QoS', 'Retain',
      'Payload (Raw)', 'Payload (Decoded)', 'Format', 'Size (bytes)',
    ];
    rows = messages.map((msg) => [
      new Date(msg.timestamp).toISOString(),
      msg.topic,
      msg.direction,
      msg.qos,
      msg.retain,
      escapeCsvValue(msg.payload),
      escapeCsvValue(msg.decodedPayload ? JSON.stringify(msg.decodedPayload) : msg.payload),
      msg.payloadFormat,
      msg.payloadBytes,
    ]);
  }

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, fileName);
}

export const ExportPanel: React.FC = () => {
  const { messages } = useMessageStore();

  const [format, setFormat] = useState<ExportFormat>('excel');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [includeDecoded, setIncludeDecoded] = useState(true);
  const [flattenPayload, setFlattenPayload] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Unique topics
  const allTopics = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => set.add(m.topic));
    return Array.from(set).sort();
  }, [messages]);

  const [selectedTopics, setSelectedTopics] = useState<Set<string> | null>(null);

  // null means "all topics selected"; a Set means explicit selection
  const effectiveSelected = useMemo(() => {
    return selectedTopics ?? new Set(allTopics);
  }, [selectedTopics, allTopics]);

  const allSelected = selectedTopics === null || allTopics.every((t) => effectiveSelected.has(t));

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) => {
      const base = prev === null ? new Set(allTopics) : new Set(prev);
      if (base.has(topic)) base.delete(topic);
      else base.add(topic);
      return base;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTopics(new Set()); // explicitly deselect all
    } else {
      setSelectedTopics(null); // select all
    }
  };

  const setQuickRange = (minutes: number | null) => {
    if (minutes === null) {
      setFromDate('');
      setToDate('');
      return;
    }
    const now = new Date();
    const from = new Date(now.getTime() - minutes * 60 * 1000);
    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setFromDate(fmt(from));
    setToDate(fmt(now));
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (!effectiveSelected.has(msg.topic)) return false;
      if (fromDate) {
        const from = new Date(fromDate).getTime();
        if (msg.timestamp < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate).getTime();
        if (msg.timestamp > to) return false;
      }
      return true;
    });
  }, [messages, effectiveSelected, fromDate, toDate]);

  const handleExport = async () => {
    if (filteredMessages.length === 0) return;
    setExporting(true);
    try {
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const msgsToExport = includeDecoded
        ? filteredMessages
        : filteredMessages.map((m) => ({ ...m, decodedPayload: undefined }));

      if (format === 'excel') {
        await exportToExcel(msgsToExport, `mqtt-export-${stamp}.xlsx`, flattenPayload);
      } else {
        exportToCsv(msgsToExport, `mqtt-export-${stamp}.csv`, flattenPayload);
      }
    } finally {
      setExporting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#e6edf3',
    padding: '4px 8px',
    fontSize: 12,
  };

  const quickBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#1f6feb' : '#21262d',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#e6edf3',
    padding: '3px 8px',
    fontSize: 11,
    cursor: 'pointer',
  });

  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
      color: '#e6edf3', fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#e6edf3', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Download size={14} />
        Data Export
      </div>

      {/* Format */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ color: '#8b949e', fontSize: 11 }}>Format</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['excel', 'csv'] as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              style={{
                background: format === f ? '#1f6feb' : '#21262d',
                border: '1px solid #30363d',
                borderRadius: 6,
                color: '#e6edf3',
                padding: '4px 16px',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: format === f ? 600 : 400,
              }}
            >
              {f === 'excel' ? 'Excel (.xlsx)' : 'CSV'}
            </button>
          ))}
        </div>
      </div>

      {/* Time Range */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ color: '#8b949e', fontSize: 11 }}>📅 Time Range</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={quickBtnStyle(!fromDate && !toDate)} onClick={() => setQuickRange(null)}>All</button>
          <button style={quickBtnStyle(false)} onClick={() => setQuickRange(5)}>Last 5m</button>
          <button style={quickBtnStyle(false)} onClick={() => setQuickRange(60)}>Last 1h</button>
          <button style={quickBtnStyle(false)} onClick={() => setQuickRange(1440)}>Last 24h</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 30, color: '#8b949e' }}>From</span>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ ...inputStyle, flex: 1, colorScheme: 'dark' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 30, color: '#8b949e' }}>To</span>
            <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ ...inputStyle, flex: 1, colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>

      {/* Topics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ color: '#8b949e', fontSize: 11 }}>📋 Topics</span>
        {allTopics.length === 0 ? (
          <span style={{ color: '#6e7681', fontStyle: 'italic' }}>No topics yet</span>
        ) : (
          <div style={{
            border: '1px solid #30363d', borderRadius: 6,
            maxHeight: 160, overflowY: 'auto',
            backgroundColor: '#161b22',
          }}>
            {/* Select All */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px',
              borderBottom: '1px solid #30363d',
              cursor: 'pointer', userSelect: 'none',
              color: '#8b949e', fontWeight: 600,
            }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ accentColor: '#58a6ff' }}
              />
              Select All
            </label>
            {allTopics.map((topic) => (
              <label key={topic} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 10px',
                cursor: 'pointer', userSelect: 'none',
                borderBottom: '1px solid #21262d',
              }}>
                <input
                  type="checkbox"
                  checked={effectiveSelected.has(topic)}
                  onChange={() => toggleTopic(topic)}
                  style={{ accentColor: '#58a6ff' }}
                />
                <span style={{ color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topic}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Include Decoded */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={includeDecoded}
          onChange={(e) => setIncludeDecoded(e.target.checked)}
          style={{ accentColor: '#58a6ff' }}
        />
        Include decoded payload
      </label>

      {/* Flatten Payload */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={flattenPayload}
          onChange={(e) => setFlattenPayload(e.target.checked)}
          style={{ accentColor: '#58a6ff' }}
        />
        <span>
          Flatten Payload
          <span style={{ color: '#8b949e', marginLeft: 4 }}>(expand JSON keys into separate columns)</span>
        </span>
      </label>

      {/* Preview */}
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 6, padding: '6px 12px',
        color: '#8b949e',
      }}>
        Preview: <strong style={{ color: '#e6edf3' }}>{filteredMessages.length}</strong> message{filteredMessages.length !== 1 ? 's' : ''} selected
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting || filteredMessages.length === 0}
        style={{
          background: filteredMessages.length === 0 ? '#21262d' : '#238636',
          border: '1px solid #2ea043',
          borderRadius: 6,
          color: filteredMessages.length === 0 ? '#6e7681' : '#ffffff',
          padding: '8px 16px',
          fontSize: 13, fontWeight: 600,
          cursor: filteredMessages.length === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'background 0.15s',
        }}
      >
        <Download size={14} />
        {exporting ? 'Exporting...' : 'Export'}
      </button>
    </div>
  );
};
