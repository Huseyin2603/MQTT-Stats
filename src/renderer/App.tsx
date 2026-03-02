import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { useConnectionStore } from '@/stores/connectionStore';
import { useMessageStore, detectPayloadFormat } from '@/stores/messageStore';
import { useProtobufStore } from '@/stores/protobufStore';

export const App: React.FC = () => {
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    api.onMqttStatus((data: { profileId: string; status: string }) => {
      useConnectionStore.getState().setState(data.profileId, data.status as any);
      useConnectionStore.getState().addLog(data.profileId, 'info', `Status: ${data.status}`);
    });

    api.onMqttMessage(async (data: any) => {
      try {
        const msg: any = {
          id: crypto.randomUUID(),
          connectionId: data.profileId,
          topic: data.topic,
          payload: data.payload,
          payloadBytes: new TextEncoder().encode(data.payload).length,
          payloadFormat: detectPayloadFormat(data.payload),
          qos: data.qos,
          retain: data.retain,
          duplicate: false,
          timestamp: data.timestamp,
          direction: 'inbound' as const,
        };

        // Try protobuf decoding if a mapping exists
        if (data.payloadBase64) {
          try {
            const result = await useProtobufStore.getState().decodePayload(data.topic, data.payloadBase64);
            if (result) {
              msg.payloadFormat = 'protobuf';
              msg.payload = JSON.stringify(result.decoded, null, 2);
              msg.decodedPayload = result.decoded;
              msg.protoMessageType = result.messageType;
            }
          } catch (err: any) {
            console.error(`[Protobuf] Message decode error:`, err.message);
          }
        }

        useMessageStore.getState().addMessage(msg);
      } catch (err: any) {
        console.error(`[MQTT] onMqttMessage handler error:`, err.message);
      }
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