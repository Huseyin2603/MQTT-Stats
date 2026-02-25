// ===== MQTT Protocol Versions =====
export type MqttProtocolVersion = '3.1' | '3.1.1' | '5.0';
export type QoS = 0 | 1 | 2;
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type TransportProtocol = 'tcp' | 'tls' | 'ws' | 'wss';
export type PayloadFormat = 'raw' | 'json' | 'xml' | 'hex' | 'base64';

// ===== Bağlantı Profili =====
export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: TransportProtocol;
  mqttVersion: MqttProtocolVersion;
  clientId: string;
  autoGenerateClientId: boolean;

  // Kimlik Doğrulama
  username: string;
  password: string;

  // TLS/SSL
  useTls: boolean;
  caCertPath: string;
  clientCertPath: string;
  clientKeyPath: string;
  rejectUnauthorized: boolean;

  // Oturum
  cleanSession: boolean;
  keepAlive: number;

  // LWT (Vasiyetname Mesajı)
  lwt: {
    enabled: boolean;
    topic: string;
    payload: string;
    qos: QoS;
    retain: boolean;
  };

  // Yeniden Bağlanma
  autoReconnect: boolean;
  reconnectInterval: number;

  // Meta
  color: string;
  createdAt: string;
  updatedAt: string;
}

// ===== MQTT Mesaj =====
export interface MqttMessage {
  id: string;
  connectionId: string;
  topic: string;
  payload: string;
  payloadBytes: number;
  payloadFormat: PayloadFormat;
  qos: QoS;
  retain: boolean;
  duplicate: boolean;
  timestamp: number;
  direction: 'inbound' | 'outbound';
}

// ===== Topic Ağaç Düğümü =====
export interface TopicNode {
  name: string;
  fullPath: string;
  children: Record<string, TopicNode>;
  lastMessage: MqttMessage | null;
  messageCount: number;
  isExpanded: boolean;
}

// ===== Varsayılan Profil =====
export const DEFAULT_PROFILE: Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'New Connection',
  host: 'localhost',
  port: 1883,
  protocol: 'tcp',
  mqttVersion: '3.1.1',
  clientId: '',
  autoGenerateClientId: true,
  username: '',
  password: '',
  useTls: false,
  caCertPath: '',
  clientCertPath: '',
  clientKeyPath: '',
  rejectUnauthorized: true,
  cleanSession: true,
  keepAlive: 60,
  lwt: { enabled: false, topic: '', payload: '', qos: 0, retain: false },
  autoReconnect: true,
  reconnectInterval: 5000,
  color: '#58a6ff',
};