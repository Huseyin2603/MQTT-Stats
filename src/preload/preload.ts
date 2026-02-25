import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // MQTT bağlantı işlemleri
  mqttConnect: (profileId: string, options: any) =>
    ipcRenderer.invoke('mqtt:connect', profileId, options),

  mqttDisconnect: (profileId: string) =>
    ipcRenderer.invoke('mqtt:disconnect', profileId),

  mqttPublish: (profileId: string, topic: string, payload: string, qos: number, retain: boolean) =>
    ipcRenderer.invoke('mqtt:publish', profileId, topic, payload, qos, retain),

  mqttSubscribe: (profileId: string, topic: string, qos: number) =>
    ipcRenderer.invoke('mqtt:subscribe', profileId, topic, qos),

  mqttUnsubscribe: (profileId: string, topic: string) =>
    ipcRenderer.invoke('mqtt:unsubscribe', profileId, topic),

  // MQTT event dinleyiciler
  onMqttMessage: (callback: (data: any) => void) => {
    ipcRenderer.on('mqtt:message', (_event, data) => callback(data));
  },

  onMqttStatus: (callback: (data: any) => void) => {
    ipcRenderer.on('mqtt:status', (_event, data) => callback(data));
  },

  onMqttError: (callback: (data: any) => void) => {
    ipcRenderer.on('mqtt:error', (_event, data) => callback(data));
  },

  // Dosya seçici
  openFileDialog: (options: any) =>
    ipcRenderer.invoke('dialog:openFile', options),

  // Pencere kontrolü
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
});