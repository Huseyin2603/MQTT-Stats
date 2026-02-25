import mqtt, { MqttClient as MqttJsClient, IClientOptions } from 'mqtt';
import { v4 as uuid } from 'uuid';
import {
  ConnectionProfile,
  ConnectionState,
  MqttMessage,
  PayloadFormat,
  QoS,
} from './MqttTypes';

// ===== Callback Tanımları =====
export interface MqttCallbacks {
  onStateChange: (profileId: string, state: ConnectionState) => void;
  onMessage: (message: MqttMessage) => void;
  onError: (profileId: string, error: string) => void;
  onLog: (profileId: string, level: string, text: string) => void;
}

// ===== MQTT Client Wrapper =====
export class MqttClientService {
  private client: MqttJsClient | null = null;
  private profile: ConnectionProfile;
  private callbacks: MqttCallbacks;
  private subscribedTopics: Map<string, QoS> = new Map();

  constructor(profile: ConnectionProfile, callbacks: MqttCallbacks) {
    this.profile = profile;
    this.callbacks = callbacks;
  }

  // ────────────────────────────────
  //  URL OLUŞTUR
  // ────────────────────────────────
private buildUrl(): string {
  const { host, port, protocol } = this.profile;
  const schemes: Record<string, string> = {
    tcp: 'mqtt',
    tls: 'mqtts',
    ws: 'ws',
    wss: 'wss',
  };
  return `${schemes[protocol] || 'mqtt'}://${host}:${port}`;
}

  // ────────────────────────────────
  //  BAĞLANTI AYARLARINI OLUŞTUR
  // ────────────────────────────────
  private buildOptions(): IClientOptions {
    const p = this.profile;

    const opts: IClientOptions = {
      clientId: p.autoGenerateClientId
        ? `mqtt-explorer-${uuid().slice(0, 8)}`
        : p.clientId,
      clean: p.cleanSession,
      keepalive: p.keepAlive,
      reconnectPeriod: p.autoReconnect ? p.reconnectInterval : 0,
      connectTimeout: 30_000,
    };

    // Protokol versiyonu
    const versionMap: Record<string, 3 | 4 | 5> = {
      '3.1': 3, '3.1.1': 4, '5.0': 5,
    };
    opts.protocolVersion = versionMap[p.mqttVersion] ?? 4;

    // Kimlik bilgileri
    if (p.username) opts.username = p.username;
    if (p.password) opts.password = p.password;

    // TLS ayarları
    if (p.useTls) {
      opts.rejectUnauthorized = p.rejectUnauthorized;
    }

    // LWT (Last Will & Testament)
    if (p.lwt.enabled && p.lwt.topic) {
      opts.will = {
        topic: p.lwt.topic,
        payload: Buffer.from(p.lwt.payload),
        qos: p.lwt.qos,
        retain: p.lwt.retain,
      };
    }

    return opts;
  }

  // ────────────────────────────────
  //  BAĞLAN
  // ────────────────────────────────
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client) this.disconnect();

      this.setState('connecting');
      this.log('info', `Connecting to ${this.buildUrl()}...`);

      try {
        this.client = mqtt.connect(this.buildUrl(), this.buildOptions());

        // ✅ Bağlantı başarılı
        this.client.on('connect', () => {
          this.setState('connected');
          this.log('info', '✅ Connected!');
          this.resubscribeAll();
          resolve();
        });

        // 📨 Mesaj geldi
        this.client.on('message', (topic, payload, packet) => {
          const msg: MqttMessage = {
            id: uuid(),
            connectionId: this.profile.id,
            topic,
            payload: payload.toString('utf-8'),
            payloadBytes: payload.byteLength,
            payloadFormat: this.detectFormat(payload.toString('utf-8')),
            qos: packet.qos as QoS,
            retain: packet.retain,
            duplicate: packet.dup,
            timestamp: Date.now(),
            direction: 'inbound',
          };
          this.callbacks.onMessage(msg);
        });

        // 🔄 Yeniden bağlanıyor
        this.client.on('reconnect', () => {
          this.setState('reconnecting');
          this.log('warn', '🔄 Reconnecting...');
        });

        // ❌ Hata
        this.client.on('error', (err) => {
          this.log('error', `❌ ${err.message}`);
          this.callbacks.onError(this.profile.id, err.message);
        });

        // 🔌 Bağlantı kapandı
        this.client.on('close', () => {
          this.setState('disconnected');
          this.log('info', '🔌 Connection closed');
        });

        // Timeout
        setTimeout(() => {
          if (!this.client?.connected) {
            this.setState('error');
            reject(new Error('Connection timeout (30s)'));
          }
        }, 10_000);

      } catch (err: any) {
        this.setState('error');
        reject(err);
      }
    });
  }

  // ────────────────────────────────
  //  BAĞLANTIYI KES
  // ────────────────────────────────
  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) {
        this.setState('disconnected');
        return resolve();
      }
      this.client.end(false, {}, () => {
        this.client = null;
        this.setState('disconnected');
        resolve();
      });
    });
  }

  // ────────────────────────────────
  //  SUBSCRIBE (ABONE OL)
  // ────────────────────────────────
  subscribe(topic: string, qos: QoS = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client?.connected) return reject(new Error('Not connected'));

      this.client.subscribe(topic, { qos }, (err) => {
        if (err) return reject(err);
        this.subscribedTopics.set(topic, qos);
        this.log('info', `📡 Subscribed: ${topic} (QoS ${qos})`);
        resolve();
      });
    });
  }

  // ────────────────────────────────
  //  UNSUBSCRIBE (ABONELİĞİ KALDIR)
  // ────────────────────────────────
  unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client?.connected) return reject(new Error('Not connected'));

      this.client.unsubscribe(topic, {}, (err) => {
        if (err) return reject(err);
        this.subscribedTopics.delete(topic);
        this.log('info', `🚫 Unsubscribed: ${topic}`);
        resolve();
      });
    });
  }

  // ─────────────────────────��──────
  //  PUBLISH (MESAJ GÖNDER)
  // ────────────────────────────────
  publish(topic: string, payload: string, qos: QoS = 0, retain = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client?.connected) return reject(new Error('Not connected'));

      this.client.publish(topic, payload, { qos, retain }, (err) => {
        if (err) return reject(err);
        this.log('info', `📤 Published: ${topic} (QoS ${qos})`);
        resolve();
      });
    });
  }

  // ────────────────────────────────
  //  YENİDEN ABONE OL (reconnect sonrası)
  // ────────────────────────────────
  private resubscribeAll(): void {
    this.subscribedTopics.forEach((qos, topic) => {
      this.client?.subscribe(topic, { qos });
      this.log('info', `🔄 Re-subscribed: ${topic}`);
    });
  }

  // ────────────────────────────────
  //  PAYLOAD FORMAT ALGILAMA
  // ────────────────────────────────
  private detectFormat(payload: string): PayloadFormat {
    const t = payload.trim();

    // JSON?
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
      try { JSON.parse(t); return 'json'; } catch { /* değil */ }
    }

    // XML?
    if (t.startsWith('<') && t.endsWith('>')) return 'xml';

    // HEX?
    if (/^([0-9a-fA-F]{2}\s?)+$/.test(t)) return 'hex';

    // Base64?
    if (/^[A-Za-z0-9+/]+=*$/.test(t) && t.length > 8) return 'base64';

    return 'raw';
  }

  // ────────────────────────────────
  //  YARDIMCILAR
  // ────────────────────────────────
  private setState(s: ConnectionState) {
    this.callbacks.onStateChange(this.profile.id, s);
  }

  private log(level: string, text: string) {
    this.callbacks.onLog(this.profile.id, level, text);
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  getSubscribedTopics(): Map<string, QoS> {
    return new Map(this.subscribedTopics);
  }
}