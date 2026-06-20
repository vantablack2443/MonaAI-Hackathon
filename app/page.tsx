'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { Agent } from '@/lib/agents';
import { Bot } from 'lucide-react';

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
      <main className="flex-1 bg-gray-950 overflow-hidden">
        {selectedAgent ? (
          <ChatArea agent={selectedAgent} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/40">
              <Bot size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">MONA AI Agent Hub</h1>
            <p className="text-gray-400 text-lg mb-2">Your intelligent automation platform</p>
            <p className="text-gray-500 text-sm max-w-md">Select an agent from the sidebar to get started. Each agent is specialized for a specific business workflow.</p>
            <div className="mt-10 grid grid-cols-2 gap-3 max-w-md text-left">
              {[
                { label: '10 Agents', desc: 'Specialized for your business' },
                { label: 'Powered by Gemini', desc: 'Google AI at the core' },
                { label: 'File Upload', desc: 'Analyze documents & invoices' },
                { label: 'Secure', desc: 'Prompt-injection protection' },
              ].map((item) => (
                <div key={item.label} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
