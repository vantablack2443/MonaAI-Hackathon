'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import WorkPermitAgent from '@/components/WorkPermitAgent';
import InvoiceAgent from '@/components/InvoiceAgent';
import ShiftAgent from '@/components/ShiftAgent';
import InterviewAgent from '@/components/InterviewAgent';
import CVFraudAgent from '@/components/CVFraudAgent';
import SecureEmailAgent from '@/components/SecureEmailAgent';
import CustomerAnalyticsAgent from '@/components/CustomerAnalyticsAgent';
import DynamicPricingAgent from '@/components/DynamicPricingAgent';
import DrTheissAgent from '@/components/DrTheissAgent';
import { agents, Agent } from '@/lib/agents';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
      <main className="flex-1 overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}>
        {selectedAgent ? (
          selectedAgent.id === 'work-permit'
            ? <WorkPermitAgent systemPrompt={selectedAgent.systemPrompt} />
            : selectedAgent.id === 'invoice-processing'
            ? <InvoiceAgent systemPrompt={selectedAgent.systemPrompt} />
            : selectedAgent.id === 'shift-replacement'
            ? <ShiftAgent systemPrompt={selectedAgent.systemPrompt} />
            : selectedAgent.id === 'interview-support'
            ? <InterviewAgent systemPrompt={selectedAgent.systemPrompt} />
            : selectedAgent.id === 'cv-fraud'
            ? <CVFraudAgent systemPrompt={selectedAgent.systemPrompt} />
            : selectedAgent.id === 'secure-email'
            ? <SecureEmailAgent systemPrompt={selectedAgent.systemPrompt} />
            : selectedAgent.id === 'customer-analytics'
            ? <CustomerAnalyticsAgent systemPrompt={selectedAgent.systemPrompt} />
            : selectedAgent.id === 'dynamic-pricing'
            ? <DynamicPricingAgent systemPrompt={selectedAgent.systemPrompt} />
            : selectedAgent.group
            ? <DrTheissAgent key={selectedAgent.id} groupAgents={agents.filter(a => a.group === selectedAgent.group)} initialAgentId={selectedAgent.id} />
            : <ChatArea agent={selectedAgent} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 60px rgba(99,102,241,0.4), 0 0 120px rgba(139,92,246,0.2)' }}
            >
              <Sparkles size={38} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3" style={{ letterSpacing: '-0.02em' }}>Orion</h1>
            <p className="text-lg mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Intelligent Agent Platform</p>
            <p className="text-sm max-w-sm mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Select an agent from the sidebar to begin. Each agent is purpose-built for a specific business workflow.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 max-w-sm text-left">
              {[
                { label: '10 Agents', desc: 'Business-specialized AI' },
                { label: 'Powered by Gemini', desc: 'Google AI at the core' },
                { label: 'File Upload', desc: 'PDFs, images & documents' },
                { label: 'Secure', desc: 'Prompt-injection protection' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
