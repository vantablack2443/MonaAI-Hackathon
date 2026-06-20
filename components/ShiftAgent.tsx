'use client';
import { useState } from 'react';
import { Send, AlertTriangle, Loader2, CheckCircle2, Clock, Phone, User, MessageSquare, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

interface StaffMember {
  name: string;
  role: string;
  phone: string;
  reason: string;
  messageSent: boolean;
}

interface ShiftResult {
  shift: string;
  roleNeeded: string;
  urgency: 'Critical' | 'High' | 'Medium' | string;
  gapReason: string;
  availableStaff: StaffMember[];
  outreachMessage: string;
  recommendedAction: string;
}

interface ShiftAgentProps {
  systemPrompt: string;
}

// Pre-populated schedule
const SCHEDULE = [
  { ward: 'Kardiologie',  date: '20.06.2026', time: '22:00–06:00', role: 'Krankenpfleger/in', status: 'gap' },
  { ward: 'Intensivstation', date: '21.06.2026', time: '06:00–14:00', role: 'Krankenpfleger/in (Intensiv)', status: 'covered' },
  { ward: 'Chirurgie',    date: '21.06.2026', time: '14:00–22:00', role: 'Krankenpfleger/in', status: 'covered' },
  { ward: 'Neurologie',   date: '22.06.2026', time: '22:00–06:00', role: 'Krankenpfleger/in', status: 'covered' },
  { ward: 'Notaufnahme',  date: '22.06.2026', time: '06:00–14:00', role: 'Notärztin/Notarzt', status: 'covered' },
  { ward: 'Anästhesie',   date: '23.06.2026', time: '14:00–22:00', role: 'Anästhesist/in', status: 'covered' },
];

const URGENCY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  Critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.25)' },
  High:     { color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)' },
  Medium:   { color: '#2563eb', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.25)' },
};

function parseResult(text: string): ShiftResult | null {
  const get = (key: string) => {
    const m = text.match(new RegExp(`\\*\\*${key}[:\\*]+\\s*(.+)`, 'i'));
    return m ? m[1].trim().replace(/\*+/g, '') : '';
  };

  const staffBlock = text.match(/\*\*Available Staff:\*\*\n([\s\S]*?)(?=\n\*\*Outreach|\n\*\*Recommended|$)/i);
  const staffLines = staffBlock ? staffBlock[1].trim().split('\n').filter(l => l.trim()) : [];

  const staff: StaffMember[] = staffLines.map(line => {
    const parts = line.replace(/^Staff\s*\d+\s*[—–-]\s*/i, '').split(/\s*[—–]\s*/);
    return {
      name: parts[0]?.trim() || 'Unknown',
      role: parts[1]?.trim() || '',
      phone: parts[2]?.trim() || '',
      reason: parts[3]?.trim() || '',
      messageSent: false,
    };
  });

  const msgBlock = text.match(/\*\*Outreach Message:\*\*\n([\s\S]*?)(?=\n\*\*Recommended|$)/i);
  const outreachMessage = msgBlock ? msgBlock[1].trim() : '';

  return {
    shift: get('Shift'),
    roleNeeded: get('Role Needed'),
    urgency: get('Urgency') || 'High',
    gapReason: get('Gap Reason'),
    availableStaff: staff,
    outreachMessage,
    recommendedAction: get('Recommended Action'),
  };
}

function StaffCard({ member, outreachMessage, index }: { member: StaffMember; outreachMessage: string; index: number }) {
  const [sent, setSent] = useState(false);
  const [showMsg, setShowMsg] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: 'white' }}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#006c6c' }}>
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{member.name}</p>
            <p className="text-xs text-gray-500">{member.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {member.phone && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Phone size={11} />
              {member.phone}
            </div>
          )}
          {sent ? (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
              <CheckCircle2 size={12} />
              Sent
            </div>
          ) : (
            <button
              onClick={() => setSent(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: '#006c6c' }}
            >
              <Send size={11} />
              Send
            </button>
          )}
          <button onClick={() => setShowMsg(p => !p)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#9ca3af' }}>
            {showMsg ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {member.reason && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400">✓ {member.reason}</p>
        </div>
      )}
      {showMsg && outreachMessage && (
        <div className="mx-4 mb-3 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
          {outreachMessage}
        </div>
      )}
    </div>
  );
}

export default function ShiftAgent({ systemPrompt }: ShiftAgentProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ShiftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<typeof SCHEDULE[0] | null>(null);

  const submit = async (customInput?: string) => {
    const message = customInput || input.trim();
    if (!message) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          systemPrompt,
          files: [],
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const parsed = parseResult(data.content);
      setResult(parsed);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGapClick = (shift: typeof SCHEDULE[0]) => {
    setSelectedShift(shift);
    const msg = `SHIFT GAP REPORTED: Ward ${shift.ward}, Date ${shift.date}, Time ${shift.time}, Role needed: ${shift.role}. Please find available qualified staff and prepare outreach messages.`;
    setInput(msg);
    submit(msg);
  };

  const reset = () => { setResult(null); setInput(''); setSelectedShift(null); setError(null); };

  const urgencyStyle = result ? (URGENCY_STYLE[result.urgency] || URGENCY_STYLE.High) : URGENCY_STYLE.High;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f0f4f4' }}>
      {/* Header */}
      <div style={{ background: '#004f4f', borderBottom: '3px solid #00a878' }}>
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-white text-xs" style={{ background: '#00a878' }}>UKS</div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide">UNIVERSITÄTSKLINIKUM</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>des Saarlandes · HR Leitstelle</p>
              </div>
            </div>
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <p className="text-white text-sm font-medium">Shift Replacement Agent</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(0,168,120,0.2)', border: '1px solid rgba(0,168,120,0.4)', color: '#6ee7c7' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00a878' }} />
            Powered by Orion AI
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left — schedule panel */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r" style={{ background: 'white', borderColor: '#e5e7eb' }}>
          <div className="p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#004f4f' }}>Current Schedule</p>
            <p className="text-xs text-gray-400 mt-0.5">Next 3 days · Click gap to fill</p>
          </div>
          <div className="p-3 space-y-2">
            {SCHEDULE.map((s, i) => (
              <button
                key={i}
                onClick={() => s.status === 'gap' ? handleGapClick(s) : undefined}
                className="w-full text-left rounded-xl p-3 transition-all"
                style={{
                  background: s.status === 'gap' ? 'rgba(220,38,38,0.05)' : 'rgba(0,79,79,0.03)',
                  border: s.status === 'gap' ? '1px solid rgba(220,38,38,0.25)' : '1px solid #f3f4f6',
                  cursor: s.status === 'gap' ? 'pointer' : 'default',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold" style={{ color: '#004f4f' }}>{s.ward}</p>
                  {s.status === 'gap' ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>GAP ⚠</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>✓ Covered</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{s.date}</p>
                <p className="text-xs text-gray-400">{s.time} · {s.role}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right — main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!result && !loading && (
            <div className="flex-1 overflow-y-auto px-8 py-8">
              <div className="max-w-lg mx-auto">
                <div className="mb-6 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#004f4f' }}>
                    <Calendar size={26} color="white" />
                  </div>
                  <h2 className="text-xl font-bold mb-1" style={{ color: '#004f4f' }}>Shift Gap Assistant</h2>
                  <p className="text-sm text-gray-500">Click a <span className="font-semibold text-red-600">GAP</span> shift in the schedule, or describe the gap below.</p>
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: 'white' }}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="e.g. Night shift gap in Kardiologie on 20.06, 22:00–06:00, need a Krankenpfleger..."
                    rows={4}
                    className="w-full text-sm text-gray-700 outline-none resize-none p-4"
                    style={{ background: 'transparent' }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                  />
                  <div className="flex justify-end px-3 pb-3">
                    <button
                      onClick={() => submit()}
                      disabled={!input.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                      style={{ background: '#004f4f' }}
                    >
                      <Send size={13} /> Find Staff
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mt-4" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
                    <AlertTriangle size={15} />{error}
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#004f4f' }} />
                <p className="text-sm font-medium" style={{ color: '#004f4f' }}>Scanning staff roster...</p>
                <p className="text-xs text-gray-400 mt-1">Finding qualified available personnel</p>
              </div>
            </div>
          )}

          {result && (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Shift summary */}
              <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid #e5e7eb', background: 'white' }}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#004f4f', borderBottom: '3px solid #00a878' }}>
                  <div className="flex items-center gap-3">
                    <Clock size={16} color="rgba(255,255,255,0.7)" />
                    <span className="text-white font-medium text-sm">{result.shift}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: urgencyStyle.bg, color: urgencyStyle.color, border: `1px solid ${urgencyStyle.border}` }}>
                      {result.urgency}
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Role Needed</p>
                    <p className="text-sm font-semibold" style={{ color: '#004f4f' }}>{result.roleNeeded}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Reason for Gap</p>
                    <p className="text-sm text-gray-700">{result.gapReason}</p>
                  </div>
                </div>
                {result.recommendedAction && (
                  <div className="mx-5 mb-4 rounded-xl p-3" style={{ background: 'rgba(0,79,79,0.05)', border: '1px solid rgba(0,79,79,0.15)' }}>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: '#004f4f' }}>Recommended Action</p>
                    <p className="text-xs text-gray-600">{result.recommendedAction}</p>
                  </div>
                )}
              </div>

              {/* Staff outreach */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: '#004f4f' }}>Available Staff ({result.availableStaff.length})</p>
                  <p className="text-xs text-gray-400">Click Send to dispatch message · Expand to preview</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: 'rgba(0,79,79,0.08)', color: '#004f4f', border: '1px solid rgba(0,79,79,0.15)' }}>
                  <MessageSquare size={11} />
                  {result.availableStaff.length} to contact
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {result.availableStaff.map((s, i) => (
                  <StaffCard key={i} member={s} outreachMessage={result.outreachMessage} index={i} />
                ))}
              </div>

              <button onClick={reset} className="w-full rounded-xl py-3 text-sm font-semibold transition-colors" style={{ background: 'white', border: '1px solid #e5e7eb', color: '#374151' }}>
                ← Back to Schedule
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
