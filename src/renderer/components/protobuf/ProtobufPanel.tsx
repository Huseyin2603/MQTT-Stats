import React, { useState } from 'react';
import { FileCode2, Trash2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { useProtobufStore, ProtoSchema, TopicMapping } from '@/stores/protobufStore';
import { formatDistanceToNow } from 'date-fns';

export const ProtobufPanel: React.FC = () => {
  const { schemas, mappings, loadSchema, removeSchema, addMapping, removeMapping, toggleMapping } = useProtobufStore();

  const [mappingTopic, setMappingTopic] = useState('');
  const [mappingSchemaId, setMappingSchemaId] = useState('');
  const [mappingMessageType, setMappingMessageType] = useState('');

  const handleLoadSchema = async () => {
    try {
      const api = (window as any).electronAPI;
      const filePath: string | null = await api.openFileDialog({
        filters: [{ name: 'Proto Files', extensions: ['proto'] }],
      });
      if (!filePath) return;
      await loadSchema(filePath);
    } catch (err: any) {
      console.error('[Protobuf] openFileDialog error:', err.message);
    }
  };

  const selectedSchema = schemas.find((s) => s.id === mappingSchemaId);

  const handleAddMapping = () => {
    if (!mappingTopic.trim() || !mappingSchemaId || !mappingMessageType) return;
    addMapping(mappingTopic.trim(), mappingSchemaId, mappingMessageType);
    setMappingTopic('');
    setMappingSchemaId('');
    setMappingMessageType('');
  };

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ backgroundColor: '#0d1117' }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <FileCode2 size={14} style={{ color: '#58a6ff' }} />
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Protobuf Decoder
        </span>
      </div>

      {/* Section 1: Loaded Schemas */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: '#8b949e' }}>Loaded Schemas</span>
          <button
            onClick={handleLoadSchema}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{ backgroundColor: '#1f6feb', color: '#e6edf3' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#388bfd'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1f6feb'; }}
          >
            <Plus size={11} />
            Load .proto
          </button>
        </div>

        {schemas.length === 0 ? (
          <p className="text-xs" style={{ color: '#6e7681' }}>No schemas loaded. Click "Load .proto" to add one.</p>
        ) : (
          <div className="space-y-1">
            {schemas.map((schema: ProtoSchema) => (
              <div
                key={schema.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded"
                style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
              >
                <FileCode2 size={12} style={{ color: '#58a6ff', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono truncate" style={{ color: '#e6edf3' }}>
                    {schema.fileName}
                  </div>
                  <div className="text-[10px]" style={{ color: '#6e7681' }}>
                    {schema.messageTypes.length} type{schema.messageTypes.length !== 1 ? 's' : ''} ·{' '}
                    {formatDistanceToNow(schema.loadedAt, { addSuffix: true })}
                  </div>
                </div>
                <button
                  onClick={() => removeSchema(schema.id)}
                  className="p-1 rounded transition-colors shrink-0"
                  style={{ color: '#6e7681' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f85149'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#6e7681'; }}
                  title="Remove schema"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Topic Mappings */}
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-medium" style={{ color: '#8b949e' }}>Topic Mappings</span>

        {/* Add mapping form */}
        <div className="mt-2 space-y-1.5">
          <input
            type="text"
            value={mappingTopic}
            onChange={(e) => setMappingTopic(e.target.value)}
            placeholder="Topic pattern (e.g. sensor/# or data/+/raw)"
            className="form-input w-full text-xs"
          />
          <select
            value={mappingSchemaId}
            onChange={(e) => { setMappingSchemaId(e.target.value); setMappingMessageType(''); }}
            className="form-input w-full text-xs"
            style={{ backgroundColor: '#161b22', color: mappingSchemaId ? '#e6edf3' : '#6e7681' }}
          >
            <option value="">Select schema...</option>
            {schemas.map((s) => (
              <option key={s.id} value={s.id}>{s.fileName}</option>
            ))}
          </select>
          <select
            value={mappingMessageType}
            onChange={(e) => setMappingMessageType(e.target.value)}
            disabled={!selectedSchema}
            className="form-input w-full text-xs"
            style={{ backgroundColor: '#161b22', color: mappingMessageType ? '#e6edf3' : '#6e7681' }}
          >
            <option value="">Select message type...</option>
            {(selectedSchema?.messageTypes || []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={handleAddMapping}
            disabled={!mappingTopic.trim() || !mappingSchemaId || !mappingMessageType}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: (!mappingTopic.trim() || !mappingSchemaId || !mappingMessageType) ? '#21262d' : '#1f6feb',
              color: (!mappingTopic.trim() || !mappingSchemaId || !mappingMessageType) ? '#6e7681' : '#e6edf3',
              cursor: (!mappingTopic.trim() || !mappingSchemaId || !mappingMessageType) ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={11} />
            Add Mapping
          </button>
        </div>

        {/* Mapping list */}
        {mappings.length > 0 && (
          <div className="mt-2 space-y-1">
            {mappings.map((mapping: TopicMapping) => {
              const schema = schemas.find((s) => s.id === mapping.schemaId);
              return (
                <div
                  key={mapping.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded"
                  style={{
                    backgroundColor: '#161b22',
                    border: `1px solid ${mapping.enabled ? '#30363d' : '#21262d'}`,
                    opacity: mapping.enabled ? 1 : 0.6,
                  }}
                >
                  <button
                    onClick={() => toggleMapping(mapping.id)}
                    className="shrink-0 transition-colors"
                    style={{ color: mapping.enabled ? '#3fb950' : '#6e7681' }}
                    title={mapping.enabled ? 'Disable' : 'Enable'}
                  >
                    {mapping.enabled
                      ? <ToggleRight size={16} />
                      : <ToggleLeft size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono truncate" style={{ color: '#58a6ff' }}>
                      {mapping.topicPattern}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: '#6e7681' }}>
                      {schema?.fileName || 'Unknown schema'} · {mapping.messageType}
                    </div>
                  </div>
                  <button
                    onClick={() => removeMapping(mapping.id)}
                    className="p-1 rounded transition-colors shrink-0"
                    style={{ color: '#6e7681' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#f85149'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#6e7681'; }}
                    title="Remove mapping"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {mappings.length === 0 && (
          <p className="mt-2 text-xs" style={{ color: '#6e7681' }}>
            No mappings yet. Add a mapping to auto-decode matching messages.
          </p>
        )}
      </div>

      {/* Section 3: Info */}
      <div className="px-3 py-2">
        <p className="text-[10px]" style={{ color: '#6e7681' }}>
          Messages matching a mapping will be automatically decoded and shown with a{' '}
          <span className="px-1 py-0.5 rounded font-bold" style={{ backgroundColor: 'rgba(163,113,247,0.2)', color: '#a371f7' }}>
            PROTO
          </span>{' '}
          badge.
        </p>
      </div>
    </div>
  );
};
