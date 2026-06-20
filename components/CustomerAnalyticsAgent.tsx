'use client';
import { useState, useRef, useEffect } from 'react';
import { Users, Calendar, Shuffle, Search, Send, Loader2, AlertTriangle, Mountain, RotateCcw, BarChart2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CustomerAnalyticsAgentProps { systemPrompt: string; }
interface Message { role: 'user' | 'assistant'; content: string; }
type LensId = 'segment' | 'timing' | 'crosssell' | 'custom';

const PINE = '#14432f';
const FRESH = '#7cb342';
const MOSS = '#4a7c59';
const CREAM = '#f5f3ec';

const LENSES: { id: LensId; label: string; icon: typeof Users; desc: string }[] = [
  { id: 'segment',  label: 'Target Segment',  icon: Users,    desc: 'Who buys which SKUs and why' },
  { id: 'timing',   label: 'Timing Signals',   icon: Calendar, desc: 'When to run campaigns by season' },
  { id: 'crosssell',label: 'Cross-sell',       icon: Shuffle,  desc: 'Product affinity and bundles' },
  { id: 'custom',   label: 'Custom Query',     icon: Search,   desc: 'Ask your own analytics question' },
];

const CHIPS: Record<LensId, string[]> = {
  segment: [
    'Who should we target for callus SKUs and when?',
    'Profile the typical Mobil Gel buyer — age, need, frequency',
    'Which segment has the highest repeat purchase rate?',
    'Build targeting signals for the summer leg-care range',
  ],
  timing: [
    'Best send windows for foot-care campaigns (Mar–Jun)',
    'When should we activate for Wärmendes Intensiv Gel?',
    'Plan a winter bath season push for Sole Fußbad',
    'Optimal timing for Father\'s Day promo on men\'s SKUs',
  ],
  crosssell: [
    'Cross-sell opportunities for Mobil Gel buyers',
    'Which foot-care SKUs bundle naturally together?',
    'Affinity between leg-care and muscle-care SKUs',
    'Build a starter-pack bundle recommendation',
  ],
  custom: [
    'Plan a lift-measurement test for a winter foot-care campaign',
    'Which SKUs have the highest seasonal concentration?',
    'Compare callus and dry-skin buyer profiles',
    'Segment by pharmacy vs e-commerce purchase pattern',
  ],
};

export default function CustomerAnalyticsAgent({ systemPrompt }: CustomerAnalyticsAgentProps) {
  const [lens, setLens] = useState<LensId>('segment');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setError(null);
    const next: Message[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, systemPrompt, files: [] }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setMessages([...next, { role: 'assistant', content: data.content }]);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setMessages([]); setInput(''); setError(null); };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: CREAM }}>
      {/* Header */}
      <div style={{ background: PINE, borderBottom: `3px solid ${FRESH}` }}>
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Mountain size={20} color={FRESH} />
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-wide">ALLGÄUER LATSCHENKIEFER</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Dr. Theiss Naturwaren GmbH · Targeting Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button onClick={reset} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <RotateCcw size={11} /> Reset
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(124,179,66,0.15)', border: '1px solid rgba(124,179,66,0.35)', color: '#aed581' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: FRESH }} />
              Orion AI
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">

          {/* Lens selector */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {LENSES.map(l => {
              const Icon = l.icon;
              const active = lens === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setLens(l.id)}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{
                    background: active ? PINE : 'white',
                    border: `2px solid ${active ? PINE : '#e3e0d6'}`,
                    boxShadow: active ? `0 4px 12px rgba(20,67,47,0.15)` : 'none',
                  }}
                >
                  <Icon size={16} color={active ? FRESH : MOSS} className="mb-2" />
                  <p className="text-xs font-bold mb-0.5" style={{ color: active ? 'white' : PINE }}>{l.label}</p>
                  <p className="text-xs leading-tight" style={{ color: active ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>{l.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Conversation history */}
          {messages.length > 0 && (
            <div className="space-y-4 mb-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'user' ? (
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm text-white" style={{ background: PINE }}>
                      {m.content}
                    </div>
                  ) : (
                    <div className="w-full rounded-2xl p-5" style={{ background: 'white', border: '1px solid #e3e0d6' }}>
                      <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid #e3e0d6` }}>
                        <BarChart2 size={13} color={MOSS} />
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: MOSS }}>Analytics Output</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-sm leading-relaxed" style={{ color: '#374151' }}>
                        <ReactMarkdown
                          components={{
                            strong: ({ children }) => <strong style={{ color: PINE }}>{children}</strong>,
                            li: ({ children }) => <li style={{ marginBottom: '0.3rem' }}>{children}</li>,
                            p: ({ children }) => <p style={{ marginBottom: '0.5rem' }}>{children}</p>,
                            ul: ({ children }) => <ul style={{ paddingLeft: '1.2rem', marginBottom: '0.5rem' }}>{children}</ul>,
                            table: ({ children }) => (
                              <div style={{ overflowX: 'auto', margin: '0.75rem 0', borderRadius: '8px', border: `1px solid #e3e0d6` }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>{children}</table>
                              </div>
                            ),
                            th: ({ children }) => <th style={{ background: 'rgba(20,67,47,0.07)', color: PINE, padding: '8px 12px', textAlign: 'left', borderBottom: `2px solid ${FRESH}`, fontWeight: 600 }}>{children}</th>,
                            td: ({ children }) => <td style={{ padding: '7px 12px', borderBottom: '1px solid #f0ede6', verticalAlign: 'top' }}>{children}</td>,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'white', border: '1px solid #e3e0d6' }}>
                    <Loader2 size={16} className="animate-spin" style={{ color: PINE }} />
                    <span className="text-sm" style={{ color: MOSS }}>Analyzing…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Suggestion chips (show when no messages or after a response) */}
          {!loading && messages.filter(m => m.role === 'assistant').length === messages.filter(m => m.role === 'user').length && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MOSS }}>
                {messages.length === 0 ? 'Start with one of these' : 'Follow-up suggestions'}
              </p>
              <div className="flex flex-wrap gap-2">
                {CHIPS[lens].map(c => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    className="text-left text-xs px-3 py-2 rounded-xl transition-all"
                    style={{ background: 'white', border: '1px solid #e3e0d6', color: '#374151' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = MOSS; (e.currentTarget as HTMLElement).style.background = `rgba(74,124,89,0.06)`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e3e0d6'; (e.currentTarget as HTMLElement).style.background = 'white'; }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-4" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
              <AlertTriangle size={14} />{error}
            </div>
          )}

          {/* Input */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: `2px solid ${PINE}` }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Ask the Targeting Analytics agent… (${LENSES.find(l => l.id === lens)?.desc})`}
              rows={2}
              className="w-full text-sm outline-none resize-none px-4 pt-4 pb-2"
              style={{ background: 'transparent', color: '#1f2937' }}
            />
            <div className="flex justify-end px-3 pb-3">
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: PINE }}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {loading ? 'Analyzing…' : 'Analyze'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
