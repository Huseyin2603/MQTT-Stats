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

  // Protobuf
  protobufLoadSchema: (filePath: string) => Promise<{ success: boolean; schemaId?: string; messageTypes?: string[]; error?: string }>;
  protobufRemoveSchema: (schemaId: string) => Promise<{ success: boolean }>;
  protobufDecode: (schemaId: string, messageType: string, base64Payload: string) => Promise<{ success: boolean; decoded?: any; error?: string }>;

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