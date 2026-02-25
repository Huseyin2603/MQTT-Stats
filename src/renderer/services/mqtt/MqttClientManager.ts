import { MqttClientService, MqttCallbacks } from './MqttClient';
import { ConnectionProfile, QoS } from './MqttTypes';

/**
 * Birden fazla broker bağlantısını aynı anda yönetir.
 * Her profil için ayrı bir MqttClientService oluşturur.
 */
class MqttClientManager {
  private clients: Map<string, MqttClientService> = new Map();
  private callbacks: MqttCallbacks | null = null;

  // Callback'leri ayarla (store'lardan gelecek)
  setCallbacks(callbacks: MqttCallbacks): void {
    this.callbacks = callbacks;
  }

  // Bağlan
  async connect(profile: ConnectionProfile): Promise<void> {
    if (!this.callbacks) throw new Error('Callbacks not set');

    // Zaten varsa önce kapat
    if (this.clients.has(profile.id)) {
      await this.disconnect(profile.id);
    }

    const client = new MqttClientService(profile, this.callbacks);
    this.clients.set(profile.id, client);
    await client.connect();
  }

  // Bağlantıyı kes
  async disconnect(profileId: string): Promise<void> {
    const client = this.clients.get(profileId);
    if (client) {
      await client.disconnect();
      this.clients.delete(profileId);
    }
  }

  // Abone ol
  async subscribe(profileId: string, topic: string, qos: QoS): Promise<void> {
    const client = this.clients.get(profileId);
    if (!client) throw new Error('Client not found');
    await client.subscribe(topic, qos);
  }

  // Aboneliği kaldır
  async unsubscribe(profileId: string, topic: string): Promise<void> {
    const client = this.clients.get(profileId);
    if (!client) throw new Error('Client not found');
    await client.unsubscribe(topic);
  }

  // Mesaj gönder
  async publish(
    profileId: string,
    topic: string,
    payload: string,
    qos: QoS,
    retain: boolean
  ): Promise<void> {
    const client = this.clients.get(profileId);
    if (!client) throw new Error('Client not found');
    await client.publish(topic, payload, qos, retain);
  }

  // Tüm bağlantıları kapat
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.keys()).map((id) =>
      this.disconnect(id)
    );
    await Promise.all(promises);
  }

  // Client al
  getClient(profileId: string): MqttClientService | undefined {
    return this.clients.get(profileId);
  }

  // Bağlı client sayısı
  getConnectedCount(): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.isConnected()) count++;
    });
    return count;
  }
}

// Singleton — tüm uygulamada tek bir instance
export const mqttManager = new MqttClientManager();