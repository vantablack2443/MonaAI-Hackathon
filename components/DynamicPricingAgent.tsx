'use client';
import { useState, useRef, useEffect } from 'react';
import { Thermometer, CalendarDays, Trophy, Wrench, Send, Loader2, AlertTriangle, Mountain, RotateCcw, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DynamicPricingAgentProps { systemPrompt: string; }
interface Message { role: 'user' | 'assistant'; content: string; }
type SignalId = 'weather' | 'seasonal' | 'sports' | 'supply';
type ScopeId = 'all' | 'feet' | 'legs' | 'muscles';

const PINE = '#14432f';
const FRESH = '#7cb342';
const MOSS = '#4a7c59';
const CREAM = '#f5f3ec';

const SIGNALS: { id: SignalId; label: string; icon: typeof Thermometer; desc: string; color: string }[] = [
  { id: 'weather',   label: 'Weather',         icon: Thermometer, desc: 'Heat, cold, rain forecasts',         color: '#2563eb' },
  { id: 'seasonal',  label: 'Seasonal Event',   icon: CalendarDays, desc: 'Christmas, Ramadan, Father\'s Day', color: '#7c3aed' },
  { id: 'sports',    label: 'Sports Fixture',   icon: Trophy,      desc: 'Football matchdays, sport season',   color: '#dc2626' },
  { id: 'supply',    label: 'Supply Chain',     icon: Wrench,      desc: 'Active shortage, cost pressure',     color: '#d97706' },
];

const SCOPES: { id: ScopeId; label: string }[] = [
  { id: 'all', label: 'All SKUs' },
  { id: 'feet', label: 'Feet Care' },
  { id: 'legs', label: 'Legs' },
  { id: 'muscles', label: 'Muscles & Joints' },
];

const CHIPS: Record<SignalId, string[]> = {
  weather: [
    'Heatwave forecast next week — adjust leg & cooling gels',
    'Cold snap incoming — warm up bath and muscle SKUs',
    'Rainy July — push indoor foot-care bundles',
    'Summer heat spike — cooling Bein Frische Gel opportunity',
  ],
  seasonal: [
    'Christmas gifting season — wellness foot-care bundles',
    'Easter weekend — pharmacy traffic peak for leg-care',
    'Father\'s Day — men\'s sports recovery pricing',
    'Ramadan period — pharmacy foot-care category analysis',
  ],
  sports: [
    'Bundesliga matchday near our top venue — price Mobil Eisspray',
    'Marathon season kicks off — recovery product demand',
    'World Cup summer — Mobil Eisspray akut demand spike',
    'Pre-season training camps — bulk sports-team opportunity',
  ],
  supply: [
    'Urea active supply shortage — protect margin on ALK-FB-05',
    'Latschenkiefer oil cost +18% — review affected SKUs',
    'Packaging shortage on 100ml tubes — rationalize range',
    'Key competitor SKU out of stock — opportunistic pricing',
  ],
};

export default function DynamicPricingAgent({ systemPrompt }: DynamicPricingAgentProps) {
  const [signal, setSignal] = useState<SignalId>('weather');
  const [scope, setScope] = useState<ScopeId>('all');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const activeSignal = SIGNALS.find(s => s.id === signal)!;

  const buildMessage = (text: string) => {
    const scopeLabel = SCOPES.find(s => s.id === scope)!.label;
    return scope === 'all' ? text : `${text}\n\nScope: ${scopeLabel} only.`;
  };

  const send = async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || loading) return;
    const content = buildMessage(raw);
    setInput('');
    setError(null);
    const next: Message[] = [...messages, { role: 'user', content: raw }];
    setMessages(next);
    setLoading(true);
    try {
      const apiMessages = [...messages, { role: 'user', content }];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, systemPrompt, files: [] }),
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
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Dr. Theiss Naturwaren GmbH · Dynamic Pricing</p>
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

          {/* Signal type selector */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {SIGNALS.map(s => {
              const Icon = s.icon;
              const active = signal === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSignal(s.id)}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{
                    background: active ? PINE : 'white',
                    border: `2px solid ${active ? PINE : '#e3e0d6'}`,
                    boxShadow: active ? '0 4px 12px rgba(20,67,47,0.15)' : 'none',
                  }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: active ? `${s.color}22` : '#f5f3ec' }}>
                    <Icon size={14} color={active ? s.color : '#9ca3af'} />
                  </div>
                  <p className="text-xs font-bold mb-0.5" style={{ color: active ? 'white' : PINE }}>{s.label}</p>
                  <p className="text-xs leading-tight" style={{ color: active ? 'rgba(255,255,255,0.55)' : '#9ca3af' }}>{s.desc}</p>
                </button>
              );
            })}
          </div>

          {/* SKU scope toggle */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-semibold" style={{ color: MOSS }}>Scope:</span>
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'white', border: '1px solid #e3e0d6' }}>
              {SCOPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setScope(s.id)}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                  style={scope === s.id
                    ? { background: PINE, color: 'white' }
                    : { color: '#6b7280' }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation history */}
          {messages.length > 0 && (
            <div className="space-y-4 mb-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'user' ? (
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm text-white flex items-center gap-2" style={{ background: PINE }}>
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${activeSignal.color}33` }}>
                        {(() => { const Icon = activeSignal.icon; return <Icon size={11} color={activeSignal.color} />; })()}
                      </div>
                      {m.content}
                    </div>
                  ) : (
                    <div className="w-full rounded-2xl p-5" style={{ background: 'white', border: '1px solid #e3e0d6' }}>
                      <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '1px solid #e3e0d6' }}>
                        <TrendingUp size={13} color={MOSS} />
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: MOSS }}>Pricing Recommendation</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-sm leading-relaxed" style={{ color: '#374151' }}>
                        <ReactMarkdown
                          components={{
                            strong: ({ children }) => <strong style={{ color: PINE }}>{children}</strong>,
                            li: ({ children }) => <li style={{ marginBottom: '0.3rem' }}>{children}</li>,
                            p: ({ children }) => <p style={{ marginBottom: '0.5rem' }}>{children}</p>,
                            ul: ({ children }) => <ul style={{ paddingLeft: '1.2rem', marginBottom: '0.5rem' }}>{children}</ul>,
                            table: ({ children }) => (
                              <div style={{ overflowX: 'auto', margin: '0.75rem 0', borderRadius: '8px', border: '1px solid #e3e0d6' }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>{children}</table>
                              </div>
                            ),
                            th: ({ children }) => <th style={{ background: 'rgba(20,67,47,0.07)', color: PINE, padding: '8px 12px', textAlign: 'left', borderBottom: `2px solid ${FRESH}`, fontWeight: 600 }}>{children}</th>,
                            td: ({ children }) => {
                              const text = String(children);
                              const isUp = /^\+\d/.test(text);
                              const isDown = /^-\d/.test(text);
                              return (
                                <td style={{ padding: '7px 12px', borderBottom: '1px solid #f0ede6', verticalAlign: 'top' }}>
                                  {isUp || isDown ? (
                                    <span style={{
                                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                                      background: isUp ? 'rgba(22,163,74,0.1)' : 'rgba(37,99,235,0.1)',
                                      color: isUp ? '#16a34a' : '#2563eb',
                                    }}>
                                      {text}
                                    </span>
                                  ) : children}
                                </td>
                              );
                            },
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
                    <span className="text-sm" style={{ color: MOSS }}>Calculating pricing recommendations…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Suggestion chips */}
          {!loading && messages.filter(m => m.role === 'assistant').length === messages.filter(m => m.role === 'user').length && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MOSS }}>
                {messages.length === 0 ? 'Pick a scenario' : 'Follow-up scenarios'}
              </p>
              <div className="flex flex-wrap gap-2">
                {CHIPS[signal].map(c => (
                  <button
                    key={c}
                    onClick={() => send(c)}
                    className="text-left text-xs px-3 py-2 rounded-xl transition-all"
                    style={{ background: 'white', border: '1px solid #e3e0d6', color: '#374151' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = MOSS; (e.currentTarget as HTMLElement).style.background = 'rgba(74,124,89,0.06)'; }}
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
              placeholder={`Describe a ${activeSignal.label.toLowerCase()} signal — ${activeSignal.desc.toLowerCase()}…`}
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
                {loading ? 'Calculating…' : 'Get Pricing'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
