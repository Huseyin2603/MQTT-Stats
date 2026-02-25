import { create } from 'zustand';
import { ConnectionProfile } from '@/services/mqtt/MqttTypes';
import { v4 as uuidv4 } from 'uuid';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface ConnectionStore {
  profiles: ConnectionProfile[];
  states: Record<string, ConnectionState>;
  activeProfileId: string | null;

  addProfile: (profile?: Partial<ConnectionProfile>) => string;
  removeProfile: (id: string) => void;
  updateProfile: (id: string, updates: Partial<ConnectionProfile>) => void;
  setActiveProfile: (id: string | null) => void;
  connect: (profileId: string) => Promise<void>;
  disconnect: (profileId: string) => Promise<void>;
  setState: (profileId: string, state: ConnectionState) => void;
}

const defaultProfile = (): ConnectionProfile => ({
  id: uuidv4(),
  name: 'New Connection',
  host: 'localhost',
  port: 1883,
  protocol: 'tcp',
  mqttVersion: '3.1.1',
  clientId: `mqtt-explorer-${Math.random().toString(16).slice(2, 10)}`,
  autoGenerateClientId: true,
  username: '',
  password: '',
  cleanSession: true,
  keepAlive: 60,
  autoReconnect: true,
  reconnectInterval: 5000,
  useTls: false,
  rejectUnauthorized: true,
  caCertPath: '',
  clientCertPath: '',
  clientKeyPath: '',
  lwt: {
    enabled: false,
    topic: '',
    payload: '',
    qos: 0,
    retain: false,
  },
  color: '#58a6ff',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  profiles: [],
  states: {},
  activeProfileId: null,

  addProfile: (partial) => {
    const profile = { ...defaultProfile(), ...partial };
    set((state) => ({
      profiles: [...state.profiles, profile],
      activeProfileId: profile.id,
    }));
    return profile.id;
  },

  removeProfile: (id) => {
    // Önce bağlantıyı kes
    const api = (window as any).electronAPI;
    if (api) api.mqttDisconnect(id);

    set((state) => {
      const profiles = state.profiles.filter((p) => p.id !== id);
      const { [id]: _, ...states } = state.states;
      return {
        profiles,
        states,
        activeProfileId: state.activeProfileId === id
          ? (profiles[0]?.id || null)
          : state.activeProfileId,
      };
    });
  },

  updateProfile: (id, updates) => {
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  setActiveProfile: (id) => {
    set({ activeProfileId: id });
  },

  connect: async (profileId: string) => {
    const profile = get().profiles.find((p) => p.id === profileId);
    if (!profile) return;

    set((state) => ({
      states: { ...state.states, [profileId]: 'connecting' },
    }));

    try {
      const api = (window as any).electronAPI;
      if (api) {
        // Electron — IPC üzerinden main process'e gönder
        const result = await api.mqttConnect(profileId, {
          host: profile.host,
          port: profile.port,
          protocol: profile.protocol,
          username: profile.username,
          password: profile.password,
          clientId: profile.autoGenerateClientId
            ? `mqtt-explorer-${Math.random().toString(16).slice(2, 10)}`
            : profile.clientId,
          cleanSession: profile.cleanSession,
          keepAlive: profile.keepAlive,
          mqttVersion: profile.mqttVersion,
        });

        if (!result.success) {
          console.error('[MQTT] Connect failed:', result.error);
          set((state) => ({
            states: { ...state.states, [profileId]: 'error' },
          }));
        }
      } else {
        console.error('[MQTT] electronAPI not available');
        set((state) => ({
          states: { ...state.states, [profileId]: 'error' },
        }));
      }
    } catch (err: any) {
      console.error('[MQTT] Connect error:', err);
      set((state) => ({
        states: { ...state.states, [profileId]: 'error' },
      }));
    }
  },

  disconnect: async (profileId: string) => {
    try {
      const api = (window as any).electronAPI;
      if (api) {
        await api.mqttDisconnect(profileId);
      }
    } catch (err) {
      console.error('[MQTT] Disconnect error:', err);
    }
    set((state) => ({
      states: { ...state.states, [profileId]: 'disconnected' },
    }));
  },

  setState: (profileId: string, newState: ConnectionState) => {
    set((state) => ({
      states: { ...state.states, [profileId]: newState },
    }));
  },
}));