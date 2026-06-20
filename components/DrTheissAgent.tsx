'use client';
import { useState } from 'react';
import { Agent } from '@/lib/agents';
import { Film, BarChart2, TrendingUp, Target, Send, Loader2, AlertTriangle, Sparkles, Mountain, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DrTheissAgentProps {
  groupAgents: Agent[];
  initialAgentId: string;
}

const ICONS: Record<string, typeof Film> = {
  Film, BarChart2, TrendingUp, Target,
};

// Quick-start prompt chips per tool
const SUGGESTIONS: Record<string, string[]> = {
  'marketing-content': [
    'Make a 15s post-workout recovery reel for Mobil Eisspray akut',
    'ASMR foot-bath ritual reel for Sole Fußbad',
    'Before/after reel for Hornhaut Entferner Maske',
    'Summer "heavy legs after a shift" hook for 5 in 1 Beinlotion',
  ],
  'customer-analytics': [
    'Who should we target for callus SKUs and when?',
    'Build targeting signals for the summer leg-care range',
    'Cross-sell opportunities for Mobil Gel buyers',
    'Plan a lift-measurement test for a winter foot-care campaign',
  ],
  'dynamic-pricing': [
    'Heatwave forecast next week — adjust leg & cooling gels',
    'Bundesliga matchday near our top venue — price Mobil Eisspray',
    'Christmas gifting season — wellness foot-care bundles',
    'Supply shortage on urea active — protect margin on ALK-FB-05',
  ],
  'competitive-analysis': [
    'Run a full portfolio white-space analysis',
    'Where are we absent in foot care vs Scholl & Gehwol?',
    'Find gaps in the muscle & joint category',
    'Evaluate a men-targeted recovery line opportunity',
  ],
};

// Brand palette — Allgäuer Latschenkiefer (alpine pine)
const PINE = '#14432f';
const PINE_DARK = '#0d2e20';
const MOSS = '#4a7c59';
const FRESH = '#7cb342';
const CREAM = '#f5f3ec';

function parseStoryboardPrompts(text: string): string[] {
  const section = text.match(/\*\*Storyboard Prompts[:\*]*\*?\*?\n([\s\S]*?)(?=\n\*\*[A-Z]|\n---|\n##|$)/i)?.[1] || '';
  return section
    .split('\n')
    .filter(l => /^[-*•]\s*Frame\s*\d/i.test(l.trim()))
    .slice(0, 3)
    .map(l => l.replace(/^[-*•]\s*Frame\s*\d+:\s*/i, '').trim());
}

export default function DrTheissAgent({ groupAgents, initialAgentId }: DrTheissAgentProps) {
  const [activeId, setActiveId] = useState(initialAgentId);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [storyboard, setStoryboard] = useState<(string | null)[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = groupAgents.find(a => a.id === activeId) || groupAgents[0];

  const generateImages = async (prompts: string[]) => {
    if (prompts.length === 0) return;
    setImagesLoading(true);
    setStoryboard(prompts.map(() => null));
    await Promise.all(prompts.map(async (prompt, i) => {
      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (data.image) {
          setStoryboard(prev => { const next = [...prev]; next[i] = data.image; return next; });
        }
      } catch { /* silently skip failed frames */ }
    }));
    setImagesLoading(false);
  };

  const submit = async (customInput?: string) => {
    const message = (customInput ?? input).trim();
    if (!message) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStoryboard([]);
    if (customInput) setInput(customInput);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          systemPrompt: active.systemPrompt,
          files: [],
          temperature: 0.9,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResult(data.content);
      if (active.id === 'marketing-content') {
        const prompts = parseStoryboardPrompts(data.content);
        if (prompts.length > 0) generateImages(prompts);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (id: string) => {
    setActiveId(id);
    setResult(null);
    setStoryboard([]);
    setError(null);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: CREAM }}>
      {/* Brand header */}
      <div style={{ background: PINE, borderBottom: `3px solid ${FRESH}` }}>
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Mountain size={20} color={FRESH} />
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-wide">ALLGÄUER LATSCHENKIEFER</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Dr. Theiss Naturwaren GmbH · Brand Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(124,179,66,0.15)', border: '1px solid rgba(124,179,66,0.35)', color: '#aed581' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: FRESH }} />
            Powered by Orion AI
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 flex gap-1">
          {groupAgents.map(a => {
            const Icon = ICONS[a.icon] || Sparkles;
            const isActive = a.id === activeId;
            return (
              <button
                key={a.id}
                onClick={() => switchTab(a.id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative"
                style={{
                  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  borderBottom: isActive ? `2px solid ${FRESH}` : '2px solid transparent',
                }}
              >
                <Icon size={15} color={isActive ? FRESH : 'rgba(255,255,255,0.55)'} />
                {a.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-7">
          {/* Tool intro */}
          <div className="mb-5">
            <h2 className="text-xl font-bold mb-1" style={{ color: PINE }}>{active.name}</h2>
            <p className="text-sm" style={{ color: '#6b7280' }}>{active.tagline}</p>
          </div>

          {/* Input card */}
          <div className="rounded-2xl overflow-hidden mb-4" style={{ background: 'white', border: '1px solid #e3e0d6' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Ask the ${active.name} agent...`}
              rows={3}
              className="w-full text-sm outline-none resize-none p-4"
              style={{ background: 'transparent', color: '#1f2937' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            />
            <div className="flex justify-end px-3 pb-3">
              <button
                onClick={() => submit()}
                disabled={!input.trim() || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
                style={{ background: PINE }}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {loading ? 'Working...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Suggestion chips */}
          {!result && !loading && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MOSS }}>Try one of these</p>
              <div className="flex flex-wrap gap-2">
                {(SUGGESTIONS[active.id] || []).map(s => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="text-left text-xs px-3 py-2 rounded-xl transition-all"
                    style={{ background: 'white', border: '1px solid #e3e0d6', color: '#374151' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = MOSS; (e.currentTarget as HTMLElement).style.background = 'rgba(124,179,66,0.06)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e3e0d6'; (e.currentTarget as HTMLElement).style.background = 'white'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
              <AlertTriangle size={15} />{error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 size={30} className="animate-spin mx-auto mb-3" style={{ color: PINE }} />
                <p className="text-sm font-medium" style={{ color: PINE }}>Generating with Orion AI...</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div>
              {/* Storyboard frames — only for marketing-content */}
              {active.id === 'marketing-content' && (storyboard.length > 0 || imagesLoading) && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MOSS }}>Storyboard Preview</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(storyboard.length > 0 ? storyboard : [null, null, null]).map((img, i) => (
                      <div key={i} className="rounded-xl overflow-hidden" style={{ background: '#e8e4da', border: '1px solid #d6d1c7', aspectRatio: '9/16' }}>
                        {img ? (
                          <img src={`data:image/png;base64,${img}`} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <Loader2 size={18} className="animate-spin" style={{ color: MOSS }} />
                            <p className="text-xs" style={{ color: MOSS }}>Frame {i + 1}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e3e0d6' }}>
                <div className="prose prose-sm max-w-none text-sm leading-relaxed" style={{ color: '#374151' }}>
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => <h2 style={{ color: PINE, fontSize: '0.85rem', fontWeight: 700, marginTop: '1rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</h2>,
                      strong: ({ children }) => <strong style={{ color: PINE }}>{children}</strong>,
                      em: ({ children }) => <em style={{ color: '#6b7280' }}>{children}</em>,
                      li: ({ children }) => <li style={{ marginBottom: '0.35rem' }}>{children}</li>,
                      p: ({ children }) => <p style={{ marginBottom: '0.6rem' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.6rem' }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ paddingLeft: '1.25rem', marginBottom: '0.6rem' }}>{children}</ol>,
                      table: ({ children }) => <div style={{ overflowX: 'auto', margin: '0.6rem 0' }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>{children}</table></div>,
                      th: ({ children }) => <th style={{ background: 'rgba(20,67,47,0.06)', color: PINE, padding: '6px 10px', textAlign: 'left', border: '1px solid #e3e0d6', fontWeight: 600 }}>{children}</th>,
                      td: ({ children }) => <td style={{ padding: '6px 10px', border: '1px solid #e3e0d6' }}>{children}</td>,
                    }}
                  >
                    {result}
                  </ReactMarkdown>
                </div>
              </div>
              <button
                onClick={() => { setResult(null); setInput(''); setStoryboard([]); }}
                className="w-full mt-4 rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: 'white', border: '1px solid #e3e0d6', color: '#374151' }}
              >
                <RotateCcw size={14} /> New Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
