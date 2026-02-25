// Renderer tarafında window.electronAPI'nin tiplerini tanımla
export interface ElectronAPI {
  // MQTT
  mqttConnect: (profileId: string, options: any) => Promise<{ success: boolean; error?: string }>;
  mqttDisconnect: (profileId: string) => Promise<{ success: boolean }>;
  mqttPublish: (profileId: string, topic: string, payload: string, qos: number, retain: boolean) => Promise<{ success: boolean; error?: string }>;
  mqttSubscribe: (profileId: string, topic: string, qos: number) => Promise<{ success: boolean; error?: string }>;
  mqttUnsubscribe: (profileId: string, topic: string) => Promise<{ success: boolean; error?: string }>;

  // MQTT Events
  onMqttMessage: (callback: (data: any) => void) => void;
  onMqttStatus: (callback: (data: any) => void) => void;
  onMqttError: (callback: (data: any) => void) => void;

  // File dialog
  openFileDialog: (options: any) => Promise<string | null>;

  // Window controls (match preload names)
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;

  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}