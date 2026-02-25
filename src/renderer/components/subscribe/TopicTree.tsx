import React from 'react';
import { ChevronRight, ChevronDown, MessageSquare, Hash } from 'lucide-react';
import { useMessageStore } from '@/stores/messageStore';
import { TopicNode } from '@/services/mqtt/MqttTypes';

export const TopicTree: React.FC = () => {
  const { topicTree, selectedTopic, selectTopic, toggleExpand } = useMessageStore();

  const treeEntries = Object.entries(topicTree);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Topics
        </span>
        <span className="text-[10px] text-text-muted">
          {countAllTopics(topicTree)} topics
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {treeEntries.length === 0 ? (
          <div className="px-3 py-8 text-center text-text-muted text-xs">
            No topics yet
          </div>
        ) : (
          treeEntries.map(([key, node]) => (
            <TopicTreeNodeItem
              key={key}
              node={node}
              depth={0}
              selectedTopic={selectedTopic}
              onSelect={selectTopic}
              onToggle={toggleExpand}
            />
          ))
        )}
      </div>
    </div>
  );
};

const TopicTreeNodeItem: React.FC<{
  node: TopicNode;
  depth: number;
  selectedTopic: string | null;
  onSelect: (topic: string | null) => void;
  onToggle: (path: string) => void;
}> = ({ node, depth, selectedTopic, onSelect, onToggle }) => {
  const hasChildren = Object.keys(node.children).length > 0;
  const isSelected = selectedTopic === node.fullPath;
  const hasMessage = node.lastMessage !== null;

  return (
    <>
      <div
        onClick={() => {
          if (isSelected) onSelect(null);
          else onSelect(node.fullPath);
        }}
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors
          ${isSelected ? 'bg-blue/15 text-blue' : 'hover:bg-bg-hover text-text-primary'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.fullPath); }}
            className="p-0.5 shrink-0"
          >
            {node.isExpanded
              ? <ChevronDown size={12} className="text-text-muted" />
              : <ChevronRight size={12} className="text-text-muted" />}
          </button>
        ) : (
          <span className="w-4.5 shrink-0" />
        )}

        <Hash size={11} className={`shrink-0 ${hasMessage ? 'text-green' : 'text-text-muted'}`} />

        <span className="text-xs font-mono truncate flex-1">{node.name}</span>

        {node.messageCount > 0 && (
          <span className="text-[10px] px-1.5 rounded-full bg-bg-tertiary text-text-muted shrink-0">
            {node.messageCount}
          </span>
        )}
      </div>

      {hasChildren && node.isExpanded &&
        Object.entries(node.children).map(([key, child]) => (
          <TopicTreeNodeItem
            key={key}
            node={child}
            depth={depth + 1}
            selectedTopic={selectedTopic}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))
      }
    </>
  );
};

function countAllTopics(tree: Record<string, TopicNode>): number {
  let count = 0;
  for (const node of Object.values(tree)) {
    if (node.lastMessage) count++;
    count += countAllTopics(node.children);
  }
  return count;
}