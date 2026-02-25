import React, { useState } from 'react';
import {
  Plug, Send, BarChart3, ScrollText,
} from 'lucide-react';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { ConnectionForm } from '@/components/connection/ConnectionForm';
import { SubscribePanel } from '@/components/subscribe/SubscribePanel';
import { TopicTree } from '@/components/subscribe/TopicTree';
import { PublishPanel } from '@/components/publish/PublishPanel';
import { MessageList } from '@/components/messages/MessageList';
import { MessageDetail } from '@/components/messages/MessageDetail';
import { StatsPanel } from '@/components/analytics/StatsPanel';
import { LogPanel } from '@/components/connection/LogPanel';
import { useConnectionStore } from '@/stores/connectionStore';

type Tab = 'connection' | 'publish' | 'stats' | 'log';

export const MainLayout: React.FC = () => {
  const { activeProfileId } = useConnectionStore();
  const [tab, setTab] = useState<Tab>('connection');
  const [selectedView, setSelectedView] = useState<'messages' | 'detail'>('messages');

  const hasProfile = !!activeProfileId;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      backgroundColor: '#0d1117', color: '#e6edf3',
      overflow: 'hidden',
    }}>

      {/* ══════ TITLE BAR ══════ */}
      <TitleBar />

      {/* ══════ ANA İÇERİK ══════ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ▌ SOL SIDEBAR — Bağlantı Listesi (sabit 240px) */}
        <div style={{
          width: 240, flexShrink: 0,
          borderRight: '1px solid #30363d',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <Sidebar />
        </div>

        {/* ▌ SAĞ TARAF — Tüm içerik */}
        {hasProfile ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

            {/* ── ÜST TAB BAR ── */}
            <div style={{
              display: 'flex', alignItems: 'center',
              height: 40, flexShrink: 0,
              backgroundColor: '#161b22',
              borderBottom: '1px solid #30363d',
              paddingLeft: 8,
            }}>
              <TabButton active={tab === 'connection'} onClick={() => setTab('connection')} icon={<Plug size={14} />} label="Connection" />
              <TabButton active={tab === 'publish'} onClick={() => setTab('publish')} icon={<Send size={14} />} label="Publish" />
              <TabButton active={tab === 'stats'} onClick={() => setTab('stats')} icon={<BarChart3 size={14} />} label="Stats" />
              <TabButton active={tab === 'log'} onClick={() => setTab('log')} icon={<ScrollText size={14} />} label="Log" />

              {/* Sağ taraf: Messages / Detail toggle */}
              <div style={{ marginLeft: 'auto', display: 'flex', paddingRight: 8 }}>
                <TabButton active={selectedView === 'messages'} onClick={() => setSelectedView('messages')} label="Messages" />
                <TabButton active={selectedView === 'detail'} onClick={() => setSelectedView('detail')} label="Detail" />
              </div>
            </div>

            {/* ── İÇERİK ALANI — Yatay 3 sütun ── */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

              {/* SÜTUN 1: Topics + Subscriptions (250px) */}
              <div style={{
                width: 250, flexShrink: 0,
                borderRight: '1px solid #30363d',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}>
                <div style={{ flex: 1, overflow: 'auto', borderBottom: '1px solid #30363d' }}>
                  <TopicTree />
                </div>
                <div style={{ height: 260, flexShrink: 0, overflow: 'auto' }}>
                  <SubscribePanel />
                </div>
              </div>

              {/* SÜTUN 2: Mesaj Listesi VEYA Detay (flex:1) */}
              <div style={{
                flex: 1, minWidth: 0,
                borderRight: '1px solid #30363d',
                overflow: 'hidden',
              }}>
                {selectedView === 'messages' ? <MessageList /> : <MessageDetail />}
              </div>

              {/* SÜTUN 3: Seçili Tab İçeriği (380px) */}
              <div style={{
                width: 420, flexShrink: 0,
                overflow: 'hidden',
              }}>
                {tab === 'connection' && <ConnectionForm />}
                {tab === 'publish' && <PublishPanel />}
                {tab === 'stats' && <StatsPanel />}
                {tab === 'log' && <LogPanel />}
              </div>

            </div>
          </div>
        ) : (
          /* Profil seçilmemiş */
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12,
          }}>
            <Plug size={48} style={{ opacity: 0.2, color: '#8b949e' }} />
            <p style={{ fontSize: 16, fontWeight: 500, color: '#8b949e' }}>No Connection Selected</p>
            <p style={{ fontSize: 13, color: '#6e7681' }}>Create or select a connection from the sidebar</p>
          </div>
        )}

      </div>

      {/* ══════ STATUS BAR ══════ */}
      <StatusBar />
    </div>
  );
};

// ══════ TAB BUTTON ══════
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', height: '100%',
      background: 'none', border: 'none', cursor: 'pointer',
      borderBottom: active ? '2px solid #58a6ff' : '2px solid transparent',
      color: active ? '#58a6ff' : '#8b949e',
      fontSize: 12, fontWeight: 500,
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#e6edf3'; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#8b949e'; }}
  >
    {icon}
    {label}
  </button>
);