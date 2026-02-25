import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { useConnectionStore } from '@/stores/connectionStore';
import { useMessageStore } from '@/stores/messageStore';

export const App: React.FC = () => {
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    api.onMqttStatus((data: { profileId: string; status: string }) => {
      useConnectionStore.getState().setState(data.profileId, data.status as any);
      useConnectionStore.getState().addLog(data.profileId, 'info', `Status: ${data.status}`);
    });

    api.onMqttMessage((data: any) => {
      useMessageStore.getState().addMessage({
        id: crypto.randomUUID(),
        connectionId: data.profileId,
        topic: data.topic,
        payload: data.payload,
        payloadBytes: new TextEncoder().encode(data.payload).length,
        payloadFormat: 'raw',
        qos: data.qos,
        retain: data.retain,
        duplicate: false,
        timestamp: data.timestamp,
        direction: 'inbound',
      });
    });

    api.onMqttError((data: { profileId: string; error: string }) => {
      console.error(`[MQTT Error] ${data.profileId}: ${data.error}`);
      useConnectionStore.getState().addLog(data.profileId, 'error', data.error);
    });
  }, []);

  return (
    <>
      <MainLayout />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1c2333',
            color: '#e6edf3',
            border: '1px solid #30363d',
            fontSize: '13px',
          },
          duration: 3000,
        }}
      />
    </>
  );
};