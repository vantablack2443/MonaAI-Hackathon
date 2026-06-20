'use client';
import { agents, Agent } from '@/lib/agents';
import { FileText, Calendar, ShieldCheck, Search, MessageSquare, Film, BarChart2, TrendingUp, Target, Lock, Sparkles, LucideProps } from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

const iconMap: Record<string, LucideIcon> = {
  FileText, Calendar, ShieldCheck, Search, MessageSquare, Film, BarChart2, TrendingUp, Target, Lock,
};

interface SidebarProps {
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
}

export default function Sidebar({ selectedAgent, onSelectAgent }: SidebarProps) {
  return (
    <div className="glass w-72 flex flex-col h-full overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm tracking-wide">MONA AI</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Hackathon 2026</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-1">
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>Agents</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {agents.map((agent) => {
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
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{agent.company}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>MONA AI GmbH · 2026</p>
      </div>
    </div>
  );
}
