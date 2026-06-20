'use client';
import { useState } from 'react';
import { agents, Agent } from '@/lib/agents';
import { FileText, Calendar, ShieldCheck, Search, MessageSquare, Film, BarChart2, TrendingUp, Target, Lock, Sparkles, Mountain, ChevronDown, ChevronRight, LucideProps } from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

const iconMap: Record<string, LucideIcon> = {
  FileText, Calendar, ShieldCheck, Search, MessageSquare, Film, BarChart2, TrendingUp, Target, Lock,
};

interface SidebarProps {
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
}

interface SidebarItem {
  type: 'agent' | 'group';
  agent?: Agent;
  groupName?: string;
  groupAgents?: Agent[];
}

// Build a flat list of items where grouped agents collapse into a single group entry
function buildItems(): SidebarItem[] {
  const items: SidebarItem[] = [];
  const seenGroups = new Set<string>();
  for (const agent of agents) {
    if (agent.group) {
      if (!seenGroups.has(agent.group)) {
        seenGroups.add(agent.group);
        items.push({
          type: 'group',
          groupName: agent.group,
          groupAgents: agents.filter(a => a.group === agent.group),
        });
      }
    } else {
      items.push({ type: 'agent', agent });
    }
  }
  return items;
}

export default function Sidebar({ selectedAgent, onSelectAgent }: SidebarProps) {
  const items = buildItems();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const renderAgentButton = (agent: Agent, nested = false) => {
    const Icon = iconMap[agent.icon] || FileText;
    const isActive = selectedAgent?.id === agent.id;
    return (
      <button
        key={agent.id}
        onClick={() => onSelectAgent(agent)}
        className="w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200"
        style={{
          background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
          border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
          marginLeft: nested ? '0.5rem' : 0,
          width: nested ? 'calc(100% - 0.5rem)' : '100%',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: isActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)' }}>
            <Icon size={13} style={{ color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.5)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.75)' }}>{agent.name}</p>
            {!nested && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{agent.company}</p>}
            {nested && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{agent.tagline}</p>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="glass w-72 flex flex-col h-full overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm tracking-wide">Orion</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Agent Platform</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-1">
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Agents</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {items.map((item, idx) => {
          if (item.type === 'agent' && item.agent) {
            return renderAgentButton(item.agent);
          }
          // Group entry
          const name = item.groupName!;
          const groupAgents = item.groupAgents!;
          const isExpanded = expandedGroups[name];
          const containsActive = groupAgents.some(a => a.id === selectedAgent?.id);
          return (
            <div key={name}>
              <button
                onClick={() => toggleGroup(name)}
                className="w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: containsActive && !isExpanded ? 'rgba(124,179,66,0.12)' : 'transparent',
                  border: containsActive && !isExpanded ? '1px solid rgba(124,179,66,0.3)' : '1px solid transparent',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = containsActive && !isExpanded ? 'rgba(124,179,66,0.12)' : 'transparent'; }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(124,179,66,0.18)' }}>
                    <Mountain size={13} style={{ color: '#aed581' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>Dr. Theiss Naturwaren</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{groupAgents.length} brand agents</p>
                  </div>
                  {isExpanded ? <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)' }} /> : <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                </div>
              </button>
              {isExpanded && (
                <div className="mt-0.5 space-y-0.5" style={{ borderLeft: '1px solid rgba(124,179,66,0.2)', marginLeft: '1.25rem' }}>
                  {groupAgents.map(a => renderAgentButton(a, true))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>Orion · Intelligent Agents</p>
      </div>
    </div>
  );
}
