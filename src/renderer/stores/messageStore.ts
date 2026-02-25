import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MqttMessage, TopicNode } from '@/services/mqtt/MqttTypes';

interface MessageStore {
  messages: MqttMessage[];
  topicTree: Record<string, TopicNode>;
  selectedTopic: string | null;
  selectedMessageId: string | null;

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
  setSearchText: (text: string) => void;
  setTopicFilter: (filter: string) => void;
  clearAll: () => void;
  toggleExpand: (path: string) => void;
}

const MAX_MESSAGES = 50_000;
const MAX_PER_TOPIC = 1_000;

export const useMessageStore = create<MessageStore>()(
  immer((set) => ({
    messages: [],
    topicTree: {},
    selectedTopic: null,
    selectedMessageId: null,
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
      });
    },

    selectTopic: (topic) => set((s) => { s.selectedTopic = topic; }),
    selectMessage: (id) => set((s) => { s.selectedMessageId = id; }),
    setSearchText: (text) => set((s) => { s.searchText = text; }),
    setTopicFilter: (filter) => set((s) => { s.topicFilter = filter; }),

    clearAll: () => set((s) => {
      s.messages = [];
      s.topicTree = {};
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