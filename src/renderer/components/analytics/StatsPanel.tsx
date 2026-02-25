import React, { useEffect, useState, useRef } from 'react';
import { Activity, ArrowDown, ArrowUp, Zap, BarChart3 } from 'lucide-react';
import { useMessageStore } from '@/stores/messageStore';

export const StatsPanel: React.FC = () => {
  const { totalReceived, totalSent, messages } = useMessageStore();
  const [msgPerSec, setMsgPerSec] = useState(0);
  const lastCountRef = useRef(0);

  // Saniyedeki mesaj sayısını hesapla
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTotal = totalReceived + totalSent;
      setMsgPerSec(currentTotal - lastCountRef.current);
      lastCountRef.current = currentTotal;
    }, 1000);
    return () => clearInterval(interval);
  }, [totalReceived, totalSent]);

  // Son 60 saniyenin mesaj sayıları (mini grafik için)
  const [history, setHistory] = useState<number[]>(new Array(60).fill(0));

  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        const newHistory = [...prev.slice(1), msgPerSec];
        return newHistory;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [msgPerSec]);

  const maxHistory = Math.max(...history, 1);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Statistics
        </span>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {/* Stat Kartları */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={<ArrowDown size={14} className="text-green" />}
            label="Received"
            value={totalReceived.toLocaleString()}
            color="green"
          />
          <StatCard
            icon={<ArrowUp size={14} className="text-blue" />}
            label="Sent"
            value={totalSent.toLocaleString()}
            color="blue"
          />
          <StatCard
            icon={<Zap size={14} className="text-yellow" />}
            label="Msg/sec"
            value={msgPerSec.toString()}
            color="yellow"
          />
          <StatCard
            icon={<Activity size={14} className="text-purple" />}
            label="Total"
            value={(totalReceived + totalSent).toLocaleString()}
            color="purple"
          />
        </div>

        {/* Mini Throughput Grafiği */}
        <div className="p-3 rounded-md bg-bg-tertiary border border-border">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={12} className="text-text-muted" />
            <span className="text-xs text-text-secondary">Throughput (last 60s)</span>
          </div>
          <div className="flex items-end gap-0.5 h-15">
            {history.map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-blue/60 transition-all duration-300"
                style={{
                  height: `${Math.max((val / maxHistory) * 100, 2)}%`,
                  opacity: i > 50 ? 1 : 0.3 + (i / 60) * 0.7,
                }}
              />
            ))}
          </div>
        </div>

        {/* Top Topics */}
        <TopTopics />
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className={`p-2.5 rounded-md bg-bg-tertiary border border-border`}>
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[10px] text-text-muted uppercase">{label}</span>
    </div>
    <div className="text-lg font-bold text-text-primary font-mono">{value}</div>
  </div>
);

const TopTopics: React.FC = () => {
  const { topicTree } = useMessageStore();

  // Topic'leri mesaj sayısına göre sırala
  const topics: { path: string; count: number }[] = [];

  function collectTopics(tree: Record<string, any>) {
    for (const node of Object.values(tree)) {
      if (node.messageCount > 0) {
        topics.push({ path: node.fullPath, count: node.messageCount });
      }
      if (node.children) collectTopics(node.children);
    }
  }
  collectTopics(topicTree);
  topics.sort((a, b) => b.count - a.count);

  const top5 = topics.slice(0, 5);
  const maxCount = top5[0]?.count || 1;

  return (
    <div className="p-3 rounded-md bg-bg-tertiary border border-border">
      <span className="text-xs text-text-secondary">Top Topics</span>
      <div className="mt-2 space-y-1.5">
        {top5.length === 0 ? (
          <div className="text-xs text-text-muted">No data yet</div>
        ) : (
          top5.map((t) => (
            <div key={t.path}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="font-mono text-text-primary truncate mr-2">{t.path}</span>
                <span className="text-text-muted shrink-0">{t.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-primary overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue transition-all duration-500"
                  style={{ width: `${(t.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};