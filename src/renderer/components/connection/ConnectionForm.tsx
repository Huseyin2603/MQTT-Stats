import React, { useState } from 'react';
import {
  Wifi, WifiOff, Shield, Settings2, FileText,
  RefreshCw, Plug, FolderOpen,
} from 'lucide-react';
import { useConnectionStore } from '@/stores/connectionStore';
import {
  ConnectionProfile,
  MqttProtocolVersion,
  TransportProtocol,
  QoS,
} from '@/services/mqtt/MqttTypes';

type TabId = 'general' | 'security' | 'advanced' | 'lwt';

export const ConnectionForm: React.FC = () => {
  const {
    profiles, states, activeProfileId,
    updateProfile, connect, disconnect,
  } = useConnectionStore();

  const [activeTab, setActiveTab] = useState<TabId>('general');

  const profile = profiles.find((p) => p.id === activeProfileId);
  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6e7681', fontSize: 13 }}>
        ← Select a connection or create a new one
      </div>
    );
  }

  const state = states[profile.id] || 'disconnected';
  const isConnected = state === 'connected';
  const isConnecting = state === 'connecting' || state === 'reconnecting';

  const update = (updates: Partial<ConnectionProfile>) => {
    updateProfile(profile.id, updates);
  };

  const handleConnectToggle = async () => {
    if (isConnected) await disconnect(profile.id);
    else await connect(profile.id);
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Plug size={14} /> },
    { id: 'security', label: 'Security', icon: <Shield size={14} /> },
    { id: 'advanced', label: 'Advanced', icon: <Settings2 size={14} /> },
    { id: 'lwt', label: 'Last Will', icon: <FileText size={14} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ÜST BAR */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderBottom: '1px solid #30363d', flexWrap: 'wrap',
      }}>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => update({ name: e.target.value })}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 16, fontWeight: 600, color: '#e6edf3',
            borderBottom: '1px solid transparent',
          }}
          onFocus={(e) => e.target.style.borderBottom = '1px solid #58a6ff'}
          onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
          placeholder="Connection Name"
        />

        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
          backgroundColor:
            state === 'connected' ? 'rgba(63,185,80,0.2)' :
            state === 'error' ? 'rgba(248,81,73,0.2)' :
            (state === 'connecting' || state === 'reconnecting') ? 'rgba(210,153,34,0.2)' :
            'rgba(110,118,129,0.2)',
          color:
            state === 'connected' ? '#3fb950' :
            state === 'error' ? '#f85149' :
            (state === 'connecting' || state === 'reconnecting') ? '#d29922' :
            '#6e7681',
        }}>
          {state.toUpperCase()}
        </span>

        <button
          onClick={handleConnectToggle}
          disabled={isConnecting}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', borderRadius: 6, whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500,
            border: 'none', cursor: isConnecting ? 'not-allowed' : 'pointer',
            opacity: isConnecting ? 0.5 : 1,
            backgroundColor: isConnected ? 'rgba(248,81,73,0.2)' : 'rgba(63,185,80,0.2)',
            color: isConnected ? '#f85149' : '#3fb950',
            transition: 'all 0.15s',
          }}
        >
          {isConnecting ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> :
           isConnected ? <WifiOff size={14} /> : <Wifi size={14} />}
          {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* SEKMELER */}
      <div style={{ display: 'flex', borderBottom: '1px solid #30363d', padding: '0 16px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', fontSize: 12, fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #58a6ff' : '2px solid transparent',
              color: activeTab === tab.id ? '#58a6ff' : '#8b949e',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEKME İÇERİKLERİ */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>

        {activeTab === 'general' && (
          <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Protocol">
                <select
                  value={profile.protocol}
                  onChange={(e) => {
                    const protocol = e.target.value as TransportProtocol;
                    const portMap: Record<string, number> = { tcp: 1883, tls: 8883, ws: 8080, wss: 8443 };
                    update({ protocol, port: portMap[protocol] || 1883 });
                  }}
                  className="form-select"
                >
                  <option value="tcp">TCP (mqtt://)</option>
                  <option value="tls">TLS/SSL (mqtts://)</option>
                  <option value="ws">WebSocket (ws://)</option>
                  <option value="wss">WebSocket Secure (wss://)</option>
                </select>
              </FormField>
              <FormField label="MQTT Version">
                <select
                  value={profile.mqttVersion}
                  onChange={(e) => update({ mqttVersion: e.target.value as MqttProtocolVersion })}
                  className="form-select"
                >
                  <option value="3.1">MQTT 3.1</option>
                  <option value="3.1.1">MQTT 3.1.1</option>
                  <option value="5.0">MQTT 5.0</option>
                </select>
              </FormField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <FormField label="Host">
                <input
                  type="text"
                  value={profile.host}
                  onChange={(e) => update({ host: e.target.value })}
                  className="form-input"
                  placeholder="localhost or broker.example.com"
                />
              </FormField>
              <FormField label="Port">
                <input
                  type="number"
                  value={profile.port}
                  onChange={(e) => update({ port: parseInt(e.target.value) || 1883 })}
                  className="form-input"
                  min={1} max={65535}
                />
              </FormField>
            </div>

            <FormField label="Client ID">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={profile.clientId}
                  onChange={(e) => update({ clientId: e.target.value })}
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder={profile.autoGenerateClientId ? 'Auto-generated on connect' : 'Enter client ID'}
                  disabled={profile.autoGenerateClientId}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8b949e', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.autoGenerateClientId}
                    onChange={(e) => update({ autoGenerateClientId: e.target.checked })}
                    className="form-checkbox"
                  />
                  Auto
                </label>
              </div>
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Username">
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => update({ username: e.target.value })}
                  className="form-input"
                  placeholder="Optional"
                />
              </FormField>
              <FormField label="Password">
                <input
                  type="password"
                  value={profile.password}
                  onChange={(e) => update({ password: e.target.value })}
                  className="form-input"
                  placeholder="Optional"
                />
              </FormField>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={profile.useTls}
                onChange={(e) => update({ useTls: e.target.checked })}
                className="form-checkbox"
              />
              <div>
                <div style={{ fontSize: 13, color: '#e6edf3' }}>Enable TLS/SSL</div>
                <div style={{ fontSize: 11, color: '#6e7681' }}>Encrypt connection with TLS</div>
              </div>
            </label>

            {profile.useTls && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.rejectUnauthorized}
                    onChange={(e) => update({ rejectUnauthorized: e.target.checked })}
                    className="form-checkbox"
                  />
                  <div>
                    <div style={{ fontSize: 13, color: '#e6edf3' }}>Verify server certificate</div>
                    <div style={{ fontSize: 11, color: '#6e7681' }}>Disable for self-signed certificates</div>
                  </div>
                </label>
                <FormField label="CA Certificate">
                  <input type="text" value={profile.caCertPath} onChange={(e) => update({ caCertPath: e.target.value })} className="form-input" placeholder="Path to CA cert file" />
                </FormField>
                <FormField label="Client Certificate">
                  <input type="text" value={profile.clientCertPath} onChange={(e) => update({ clientCertPath: e.target.value })} className="form-input" placeholder="Path to client cert file" />
                </FormField>
                <FormField label="Client Key">
                  <input type="text" value={profile.clientKeyPath} onChange={(e) => update({ clientKeyPath: e.target.value })} className="form-input" placeholder="Path to client key file" />
                </FormField>
              </>
            )}
          </div>
        )}

        {activeTab === 'advanced' && (
          <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={profile.cleanSession}
                onChange={(e) => update({ cleanSession: e.target.checked })}
                className="form-checkbox"
              />
              <div>
                <div style={{ fontSize: 13, color: '#e6edf3' }}>Clean Session</div>
                <div style={{ fontSize: 11, color: '#6e7681' }}>Start a fresh session on each connect</div>
              </div>
            </label>

            <FormField label={`Keep Alive: ${profile.keepAlive}s`}>
              <input
                type="range" min={0} max={300} step={5}
                value={profile.keepAlive}
                onChange={(e) => update({ keepAlive: parseInt(e.target.value) })}
                style={{ width: '100%', accentColor: '#58a6ff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6e7681', marginTop: 4 }}>
                <span>0s (disabled)</span><span>300s</span>
              </div>
            </FormField>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={profile.autoReconnect}
                onChange={(e) => update({ autoReconnect: e.target.checked })}
                className="form-checkbox"
              />
              <div>
                <div style={{ fontSize: 13, color: '#e6edf3' }}>Auto Reconnect</div>
                <div style={{ fontSize: 11, color: '#6e7681' }}>Automatically reconnect when connection is lost</div>
              </div>
            </label>

            {profile.autoReconnect && (
              <FormField label={`Reconnect Interval: ${profile.reconnectInterval / 1000}s`}>
                <input
                  type="range" min={1000} max={30000} step={1000}
                  value={profile.reconnectInterval}
                  onChange={(e) => update({ reconnectInterval: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: '#58a6ff' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6e7681', marginTop: 4 }}>
                  <span>1s</span><span>30s</span>
                </div>
              </FormField>
            )}
          </div>
        )}

        {activeTab === 'lwt' && (
          <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              padding: 12, borderRadius: 6,
              backgroundColor: '#1c2333', border: '1px solid #30363d',
              fontSize: 12, color: '#8b949e',
            }}>
              💡 <strong>Last Will & Testament (LWT)</strong> — Broker,
              client beklenmedik şekilde bağlantıyı kaybederse bu mesajı
              belirtilen topic'e otomatik olarak yayınlar.
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={profile.lwt.enabled}
                onChange={(e) => update({ lwt: { ...profile.lwt, enabled: e.target.checked } })}
                className="form-checkbox"
              />
              <div>
                <div style={{ fontSize: 13, color: '#e6edf3' }}>Enable Last Will</div>
                <div style={{ fontSize: 11, color: '#6e7681' }}>Send a message when this client disconnects unexpectedly</div>
              </div>
            </label>

            {profile.lwt.enabled && (
              <>
                <FormField label="Will Topic">
                  <input type="text" value={profile.lwt.topic}
                    onChange={(e) => update({ lwt: { ...profile.lwt, topic: e.target.value } })}
                    className="form-input" placeholder="e.g. clients/my-client/status" />
                </FormField>
                <FormField label="Will Message">
                  <textarea value={profile.lwt.payload}
                    onChange={(e) => update({ lwt: { ...profile.lwt, payload: e.target.value } })}
                    className="form-input"
                    style={{ minHeight: 80, resize: 'vertical', fontFamily: "'Cascadia Code', Consolas, monospace" }}
                    placeholder='e.g. {"status": "offline"}' />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Will QoS">
                    <select value={profile.lwt.qos}
                      onChange={(e) => update({ lwt: { ...profile.lwt, qos: parseInt(e.target.value) as QoS } })}
                      className="form-select">
                      <option value={0}>QoS 0 — At most once</option>
                      <option value={1}>QoS 1 — At least once</option>
                      <option value={2}>QoS 2 — Exactly once</option>
                    </select>
                  </FormField>
                  <FormField label="Retain">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: '100%', cursor: 'pointer' }}>
                      <input type="checkbox" checked={profile.lwt.retain}
                        onChange={(e) => update({ lwt: { ...profile.lwt, retain: e.target.checked } })}
                        className="form-checkbox" />
                      <span style={{ fontSize: 13, color: '#e6edf3' }}>Retain will message</span>
                    </label>
                  </FormField>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 11, fontWeight: 500, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </label>
    {children}
  </div>
);