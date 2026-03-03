import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface ProtoSchema {
  id: string;
  fileName: string;
  filePath: string;
  messageTypes: string[];
  loadedAt: number;
}

export interface TopicMapping {
  id: string;
  topicPattern: string;
  schemaId: string;
  messageType: string;
  enabled: boolean;
}

interface ProtobufStore {
  schemas: ProtoSchema[];
  mappings: TopicMapping[];

  loadSchema: (filePath: string) => Promise<void>;
  removeSchema: (schemaId: string) => void;
  addMapping: (topicPattern: string, schemaId: string, messageType: string) => void;
  removeMapping: (mappingId: string) => void;
  toggleMapping: (mappingId: string) => void;

  findMapping: (topic: string) => TopicMapping | undefined;
  decodePayload: (topic: string, base64Payload: string) => Promise<{ decoded: any; messageType: string } | null>;
}

function mqttTopicMatches(pattern: string, topic: string): boolean {
  const patternParts = pattern.split('/');
  const topicParts = topic.split('/');

  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    if (p === '#') return true;
    if (i >= topicParts.length) return false;
    if (p !== '+' && p !== topicParts[i]) return false;
  }
  return patternParts.length === topicParts.length;
}

export const useProtobufStore = create<ProtobufStore>()(
  persist(
    (set, get) => ({
  schemas: [],
  mappings: [],

  loadSchema: async (filePath: string) => {
    try {
      const api = (window as any).electronAPI;
      const result = await api.protobufLoadSchema(filePath);
      if (!result.success) {
        console.error(`[Protobuf] Failed to load schema: ${result.error}`);
        return;
      }
      if (!result.schemaId) {
        console.error('[Protobuf] Load schema returned no schemaId');
        return;
      }
      const fileName = filePath.split(/[\\/]/).pop() || filePath;
      set((s) => ({
        schemas: [
          ...s.schemas,
          {
            id: result.schemaId,
            fileName,
            filePath,
            messageTypes: result.messageTypes || [],
            loadedAt: Date.now(),
          },
        ],
      }));
    } catch (err: any) {
      console.error(`[Protobuf] loadSchema error:`, err.message);
    }
  },

  removeSchema: (schemaId: string) => {
    try {
      const api = (window as any).electronAPI;
      api.protobufRemoveSchema(schemaId).catch(() => {});
    } catch {}
    set((s) => ({
      schemas: s.schemas.filter((sc) => sc.id !== schemaId),
      mappings: s.mappings.filter((m) => m.schemaId !== schemaId),
    }));
  },

  addMapping: (topicPattern: string, schemaId: string, messageType: string) => {
    set((s) => ({
      mappings: [
        ...s.mappings,
        { id: uuidv4(), topicPattern, schemaId, messageType, enabled: true },
      ],
    }));
  },

  removeMapping: (mappingId: string) => {
    set((s) => ({ mappings: s.mappings.filter((m) => m.id !== mappingId) }));
  },

  toggleMapping: (mappingId: string) => {
    set((s) => ({
      mappings: s.mappings.map((m) =>
        m.id === mappingId ? { ...m, enabled: !m.enabled } : m
      ),
    }));
  },

  findMapping: (topic: string) => {
    const { mappings } = get();
    return mappings.find((m) => m.enabled && mqttTopicMatches(m.topicPattern, topic));
  },

  decodePayload: async (topic: string, base64Payload: string) => {
    try {
      const mapping = get().findMapping(topic);
      if (!mapping) return null;

      const api = (window as any).electronAPI;
      const result = await api.protobufDecode(mapping.schemaId, mapping.messageType, base64Payload);
      if (!result.success) {
        console.error(`[Protobuf] Decode failed: ${result.error}`);
        return null;
      }
      return { decoded: result.decoded, messageType: mapping.messageType };
    } catch (err: any) {
      console.error(`[Protobuf] decodePayload error:`, err.message);
      return null;
    }
  },
}),
{
  name: 'mqtt-protobuf-schemas',
  partialize: (state) => ({
    schemas: state.schemas,
    mappings: state.mappings,
  }),
  onRehydrateStorage: () => async (state) => {
    if (!state?.schemas) return;
    const api = (window as any).electronAPI;
    if (!api) return;

    for (const schema of state.schemas) {
      try {
        const result = await api.protobufLoadSchema(schema.filePath);
        if (!result.success) {
          console.warn(`[Protobuf] Failed to reload schema ${schema.fileName}: ${result.error}`);
        }
      } catch (err) {
        console.warn(`[Protobuf] Schema file missing: ${schema.filePath}`);
      }
    }
  },
}
  )
);
