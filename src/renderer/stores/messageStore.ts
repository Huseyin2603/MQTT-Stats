import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MqttMessage, PayloadFormat, TopicNode } from '@/services/mqtt/MqttTypes';

export function detectPayloadFormat(payload: string): PayloadFormat {
  if (!payload || payload.trim() === '') return 'raw';
  const trimmed = payload.trim();
  // JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { JSON.parse(trimmed); return 'json'; } catch { /* not json */ }
  }
  // XML
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) return 'xml';
  // Hex
  const hexStripped = trimmed.replace(/\s/g, '');
  if (/^[0-9a-fA-F\s]+$/.test(trimmed) && hexStripped.length % 2 === 0 && hexStripped.length > 1) return 'hex';
  // Base64
  if (/^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length % 4 === 0 && trimmed.length >= 8) return 'base64';
  return 'raw';
}

interface MessageStore {
  messages: MqttMessage[];
  topicTree: Record<string, TopicNode>;
  topicHistory: Record<string, MqttMessage[]>;
  selectedTopic: string | null;
  selectedMessageId: string | null;
  historySelectedId: string | null;

  // İstatistikler
  totalReceived: number;
  totalSent: number;

  // Filtre
  searchText: string;
  topicFilter: string;

  // Actions
  addMessage: (msg: MqttMessage) => void;
  selectTopic: (topic: string | null) => void;
  selectMessage: (id: string | null) => void;
  selectHistoryMessage: (id: string | null) => void;
  clearTopicHistory: (topic: string) => void;
  setSearchText: (text: string) => void;
  setTopicFilter: (filter: string) => void;
  clearAll: () => void;
  toggleExpand: (path: string) => void;
}

const MAX_MESSAGES = 50_000;
const MAX_PER_TOPIC = 1_000;
export const MAX_MESSAGES_PER_TOPIC = 150;

export const useMessageStore = create<MessageStore>()(
  immer((set) => ({
    messages: [],
    topicTree: {},
    topicHistory: {},
    selectedTopic: null,
    selectedMessageId: null,
    historySelectedId: null,
    totalReceived: 0,
    totalSent: 0,
    searchText: '',
    topicFilter: '',

    addMessage: (msg) => {
      set((s) => {
        // 1) Mesajı listeye ekle
        s.messages.push(msg);
        if (s.messages.length > MAX_MESSAGES) {
          s.messages = s.messages.slice(-MAX_MESSAGES);
        }

        // 2) İstatistik
        if (msg.direction === 'inbound') s.totalReceived++;
        else s.totalSent++;

        // 3) Topic ağacını güncelle
        const parts = msg.topic.split('/');
        let current = s.topicTree;
        let fullPath = '';

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          fullPath = fullPath ? `${fullPath}/${part}` : part;

          if (!current[part]) {
            current[part] = {
              name: part,
              fullPath,
              children: {},
              lastMessage: null,
              messageCount: 0,
              isExpanded: true,
            };
          }

          if (i === parts.length - 1) {
            current[part].lastMessage = msg;
            current[part].messageCount++;
          }

          current = current[part].children;
        }

        // 4) Topic history güncelle (FIFO, MAX_MESSAGES_PER_TOPIC)
        if (!s.topicHistory[msg.topic]) {
          s.topicHistory[msg.topic] = [];
        }
        s.topicHistory[msg.topic].push(msg);
        if (s.topicHistory[msg.topic].length > MAX_MESSAGES_PER_TOPIC) {
          s.topicHistory[msg.topic] = s.topicHistory[msg.topic].slice(-MAX_MESSAGES_PER_TOPIC);
        }
      });
    },

    selectTopic: (topic) => set((s) => { s.selectedTopic = topic; }),
    selectMessage: (id) => set((s) => { s.selectedMessageId = id; }),
    selectHistoryMessage: (id) => set((s) => { s.historySelectedId = id; }),
    clearTopicHistory: (topic) => set((s) => { s.topicHistory[topic] = []; }),
    setSearchText: (text) => set((s) => { s.searchText = text; }),
    setTopicFilter: (filter) => set((s) => { s.topicFilter = filter; }),

    clearAll: () => set((s) => {
      s.messages = [];
      s.topicTree = {};
      s.topicHistory = {};
      s.totalReceived = 0;
      s.totalSent = 0;
    }),

    toggleExpand: (path) => {
      set((s) => {
        const parts = path.split('/');
        let current = s.topicTree;
        for (let i = 0; i < parts.length; i++) {
          const node = current[parts[i]];
          if (!node) return;
          if (i === parts.length - 1) {
            node.isExpanded = !node.isExpanded;
          }
          current = node.children;
        }
      });
    },
  }))
);