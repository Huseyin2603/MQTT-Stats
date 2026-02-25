import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import * as mqtt from 'mqtt';

let mainWindow: BrowserWindow | null = null;

// Aktif MQTT bağlantıları
const clients: Map<string, mqtt.MqttClient> = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'MQTT Explorer',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Geliştirme modunda Vite dev server'a bağlan
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ══════ IPC HANDLERS ══════

// MQTT Connect
ipcMain.handle('mqtt:connect', async (_event, profileId: string, options: any) => {
  try {
    const existing = clients.get(profileId);
    if (existing) {
      existing.end(true);
      clients.delete(profileId);
    }

    const { host, port, protocol, username, password, clientId, cleanSession, keepAlive, mqttVersion } = options;

    const schemes: Record<string, string> = {
      tcp: 'mqtt',
      tls: 'mqtts',
      ws: 'ws',
      wss: 'wss',
    };
    const scheme = schemes[protocol] || 'mqtt';
    const url = `${scheme}://${host}:${port}`;

    console.log(`[MQTT] Connecting to ${url}...`);

    const protocolVersionMap: Record<string, number> = {
      '3.1': 3,
      '3.1.1': 4,
      '5.0': 5,
    };

    const client = mqtt.connect(url, {
      clientId: clientId || `mqtt-explorer-${Math.random().toString(16).slice(2, 10)}`,
      username: username || undefined,
      password: password || undefined,
      clean: cleanSession !== false,
      keepalive: keepAlive || 60,
      connectTimeout: 30000,
      protocolVersion: (protocolVersionMap[mqttVersion] || 4) as 3 | 4 | 5,
      rejectUnauthorized: false,
    });

    clients.set(profileId, client);

    client.on('connect', () => {
      console.log(`[MQTT] Connected to ${url}`);
      mainWindow?.webContents.send('mqtt:status', { profileId, status: 'connected' });
    });

    client.on('message', (topic: string, payload: Buffer, packet: any) => {
      mainWindow?.webContents.send('mqtt:message', {
        profileId,
        topic,
        payload: payload.toString(),
        qos: packet.qos,
        retain: packet.retain,
        timestamp: Date.now(),
      });
    });

    client.on('error', (err: Error) => {
      console.error(`[MQTT] Error:`, err.message);
      mainWindow?.webContents.send('mqtt:error', { profileId, error: err.message });
    });

    client.on('close', () => {
      console.log(`[MQTT] Connection closed`);
      mainWindow?.webContents.send('mqtt:status', { profileId, status: 'disconnected' });
    });

    client.on('reconnect', () => {
      mainWindow?.webContents.send('mqtt:status', { profileId, status: 'reconnecting' });
    });

    client.on('offline', () => {
      mainWindow?.webContents.send('mqtt:status', { profileId, status: 'disconnected' });
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// MQTT Disconnect
ipcMain.handle('mqtt:disconnect', async (_event, profileId: string) => {
  const client = clients.get(profileId);
  if (client) {
    client.end(true);
    clients.delete(profileId);
  }
  return { success: true };
});

// MQTT Publish
ipcMain.handle('mqtt:publish', async (_event, profileId: string, topic: string, payload: string, qos: number, retain: boolean) => {
  const client = clients.get(profileId);
  if (!client || !client.connected) {
    return { success: false, error: 'Not connected' };
  }
  return new Promise((resolve) => {
    client.publish(topic, payload, { qos: qos as 0 | 1 | 2, retain }, (err) => {
      if (err) resolve({ success: false, error: err.message });
      else resolve({ success: true });
    });
  });
});

// MQTT Subscribe
ipcMain.handle('mqtt:subscribe', async (_event, profileId: string, topic: string, qos: number) => {
  const client = clients.get(profileId);
  if (!client || !client.connected) {
    return { success: false, error: 'Not connected' };
  }
  return new Promise((resolve) => {
    client.subscribe(topic, { qos: qos as 0 | 1 | 2 }, (err) => {
      if (err) resolve({ success: false, error: err.message });
      else resolve({ success: true });
    });
  });
});

// MQTT Unsubscribe
ipcMain.handle('mqtt:unsubscribe', async (_event, profileId: string, topic: string) => {
  const client = clients.get(profileId);
  if (!client) {
    return { success: false, error: 'Not connected' };
  }
  return new Promise((resolve) => {
    client.unsubscribe(topic, {}, (err) => {
      if (err) resolve({ success: false, error: err.message });
      else resolve({ success: true });
    });
  });
});

// Pencere kontrolleri
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());

// ══════ APP LIFECYCLE ══════
app.whenReady().then(() => {
  // CSP'yi kaldır (geliştirme modunda Worker hataları için)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [''],
      },
    });
  });

  createWindow();
});

app.on('window-all-closed', () => {
  clients.forEach((client) => client.end(true));
  clients.clear();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});