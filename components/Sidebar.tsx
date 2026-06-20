'use client';
import { agents, Agent } from '@/lib/agents';
import { FileText, Calendar, ShieldCheck, Search, MessageSquare, Film, BarChart2, TrendingUp, Target, Lock, Bot, LucideProps } from 'lucide-react';
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
    <div className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-base">MONA AI</h1>
            <p className="text-gray-400 text-xs">Hackathon 2026</p>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-gray-500 text-xs uppercase tracking-wider px-2 py-2 font-medium">Agents</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {agents.map((agent) => {
          const Icon = iconMap[agent.icon] || FileText;
          const isActive = selectedAgent?.id === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className={`w-full text-left px-3 py-3 rounded-lg transition-colors group ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded-md flex-shrink-0 ${isActive ? 'bg-blue-600' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                  <Icon size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-gray-500 truncate">{agent.company}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="p-4 border-t border-gray-700">
        <p className="text-gray-600 text-xs text-center">MONA AI GmbH · 2026</p>
      </div>
    </div>
  );
}
