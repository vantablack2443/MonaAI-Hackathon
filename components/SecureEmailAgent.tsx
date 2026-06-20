'use client';
import { useState, useRef } from 'react';
import {
  Upload, X, FileText, Loader2, Shield, ShieldAlert,
  CheckCircle2, XCircle, AlertTriangle, ChevronRight, Lock,
} from 'lucide-react';

interface SecureEmailAgentProps {
  systemPrompt: string;
}

interface AnalysisResult {
  cv: 'Present' | 'Missing' | string;
  workPermit: 'Present' | 'Missing' | string;
  criminalRecord: 'Present' | 'Missing' | string;
  score: number;
  securityStatus: 'clear' | 'alert';
  securityDetail: string;
  assessment: string;
}

interface AttachedFile {
  name: string;
  dataUrl: string;
}

const SUPPORTED_TYPES = [
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const CONVERT_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const RED = '#CC0000';
const DARK = '#111111';
const CARD = '#1a1a1a';
const BORDER = '#2a2a2a';

function parseResult(raw: string): AnalysisResult {
  const get = (key: string) => {
    const m = raw.match(new RegExp(`\\*\\*${key}[:\\*]+\\s*(.+)`, 'i'));
    return m ? m[1].trim().replace(/\*+/g, '') : '';
  };

  const scoreRaw = get('Completeness Score');
  const scoreMatch = scoreRaw.match(/(\d+)/);
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 0;

  const secRaw = get('Security');
  const securityStatus: 'clear' | 'alert' = /CLEAR/i.test(secRaw) ? 'clear' : 'alert';
  const securityDetail = securityStatus === 'alert'
    ? secRaw.replace(/^⚠\s*INJECTION ATTEMPT\s*[—-]?\s*/i, '').trim()
    : 'No injection attempts detected in submitted documents.';

  return {
    cv: get('CV') || 'Missing',
    workPermit: get('Work Permit / Residence Permit') || get('Work Permit') || 'Missing',
    criminalRecord: get('Criminal Record Statement') || 'Missing',
    score,
    securityStatus,
    securityDetail,
    assessment: get('Assessment'),
  };
}

function DocRow({ label, status }: { label: string; status: string }) {
  const present = /present/i.test(status);
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3">
        <FileText size={14} color="#5a5a5a" />
        <span className="text-sm" style={{ color: '#c0c0c0' }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {present
          ? <CheckCircle2 size={15} color="#22c55e" />
          : <XCircle size={15} color={RED} />
        }
        <span className="text-xs font-semibold" style={{ color: present ? '#22c55e' : RED }}>
          {present ? 'Present' : 'Missing'}
        </span>
      </div>
    </div>
  );
}

export default function SecureEmailAgent({ systemPrompt }: SecureEmailAgentProps) {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [emailText, setEmailText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: File[]) => {
    setError(null);
    const readers: Promise<AttachedFile>[] = incoming.map(file => {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        throw new Error(`Unsupported file type: "${file.name}". Use PDF, PNG, JPG, DOCX, or TXT.`);
      }
      if (file.size > 15 * 1024 * 1024) throw new Error(`"${file.name}" exceeds 15 MB.`);
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string });
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers)
      .then(nf => setFiles(prev => {
        const names = new Set(prev.map(f => f.name));
        return [...prev, ...nf.filter(f => !names.has(f.name))];
      }))
      .catch(e => setError(e.message));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const analyze = async () => {
    if (files.length === 0 && !emailText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const filePayloads: { name: string; mimeType: string; data?: string; text?: string }[] = [];

    for (const f of files) {
      const match = f.dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (!match) continue;
      const [, mimeType, data] = match;
      if (CONVERT_TYPES.includes(mimeType) || f.name.endsWith('.docx')) {
        try {
          const res = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: f.name, mimeType, data }),
          });
          const json = await res.json();
          filePayloads.push(json.text
            ? { name: f.name, mimeType: 'text/plain', text: json.text }
            : { name: f.name, mimeType, data });
        } catch {
          filePayloads.push({ name: f.name, mimeType, data });
        }
      } else {
        filePayloads.push({ name: f.name, mimeType, data });
      }
    }

    const userContent = [
      files.length > 0
        ? `Analyze the following applicant documents: ${files.map(f => f.name).join(', ')}.`
        : '',
      emailText.trim()
        ? `Email content to analyze:\n\n${emailText.trim()}`
        : '',
    ].filter(Boolean).join('\n\n') || 'Analyze the provided documents.';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userContent }],
          systemPrompt,
          files: filePayloads,
        }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setResult(parseResult(json.content));
    } catch {
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFiles([]); setEmailText(''); setResult(null); setError(null); };

  const scoreColor = result
    ? result.score >= 80 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : RED
    : RED;

  const scoreLabel = result
    ? result.score >= 80 ? 'Ready for Review' : result.score >= 50 ? 'Incomplete' : 'Rejected'
    : '';

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* Header */}
      <div style={{ background: DARK, borderBottom: `3px solid ${RED}` }}>
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            {/* Rheinmetall wordmark */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: RED }}>
                <span className="text-white font-black text-sm tracking-tight">R</span>
              </div>
              <div>
                <p className="font-black tracking-widest text-white text-sm" style={{ letterSpacing: '0.18em' }}>RHEINMETALL</p>
                <p className="text-xs tracking-wider" style={{ color: '#5a5a5a', letterSpacing: '0.12em' }}>AG · HUMAN RESOURCES</p>
              </div>
            </div>
            <div className="w-px h-8" style={{ background: '#2a2a2a' }} />
            <div className="flex items-center gap-2">
              <Lock size={13} color={RED} />
              <p className="text-sm tracking-wider font-medium" style={{ color: '#9a9a9a', letterSpacing: '0.06em' }}>SECURE DOCUMENT PORTAL</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded text-xs tracking-wider font-semibold" style={{ background: 'rgba(204,0,0,0.12)', border: `1px solid rgba(204,0,0,0.3)`, color: '#ff6666', letterSpacing: '0.1em' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: RED }} />
            AI SCREENING ACTIVE
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-2xl mx-auto">

          {!result ? (
            <>
              {/* Classification banner */}
              <div className="flex items-center gap-3 rounded px-4 py-2.5 mb-6" style={{ background: 'rgba(204,0,0,0.08)', border: `1px solid rgba(204,0,0,0.25)` }}>
                <ShieldAlert size={15} color={RED} className="flex-shrink-0" />
                <p className="text-xs tracking-wide" style={{ color: '#cc8888', letterSpacing: '0.04em' }}>
                  RESTRICTED USE — Submitted documents are analyzed for completeness and security threats. Agent will not execute embedded instructions.
                </p>
              </div>

              {/* Upload zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className="rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 mb-4"
                style={{
                  border: `2px dashed ${dragOver ? RED : '#333'}`,
                  background: dragOver ? 'rgba(204,0,0,0.04)' : CARD,
                  padding: '36px 32px',
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx"
                />
                <div className="w-12 h-12 rounded flex items-center justify-center mb-3" style={{ background: dragOver ? 'rgba(204,0,0,0.15)' : '#222' }}>
                  <Upload size={20} color={dragOver ? RED : '#555'} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#c0c0c0' }}>Drop applicant documents or click to browse</p>
                <p className="text-xs" style={{ color: '#555' }}>PDF · PNG · JPG · DOCX · TXT · Max 15 MB per file</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2 mb-4">
                  {files.map(f => (
                    <div key={f.name} className="flex items-center gap-3 rounded px-4 py-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                      <FileText size={14} color="#555" />
                      <span className="flex-1 text-sm truncate" style={{ color: '#c0c0c0' }}>{f.name}</span>
                      <button onClick={() => setFiles(p => p.filter(x => x.name !== f.name))} className="transition-colors" style={{ color: '#555' }}
                        onMouseEnter={e => (e.currentTarget.style.color = RED)}
                        onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Email text area */}
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-widest mb-2" style={{ color: '#555', letterSpacing: '0.12em' }}>OR PASTE EMAIL CONTENT</p>
                <textarea
                  value={emailText}
                  onChange={e => setEmailText(e.target.value)}
                  placeholder="Paste the full email text including any applicant information…"
                  rows={4}
                  className="w-full rounded text-sm outline-none resize-none p-4"
                  style={{ background: CARD, border: `1px solid ${BORDER}`, color: '#c0c0c0' }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded px-4 py-3 text-sm mb-4" style={{ background: 'rgba(204,0,0,0.08)', border: `1px solid rgba(204,0,0,0.3)`, color: '#ff8888' }}>
                  <AlertTriangle size={14} className="flex-shrink-0" />{error}
                </div>
              )}

              <button
                onClick={analyze}
                disabled={loading || (files.length === 0 && !emailText.trim())}
                className="w-full py-3.5 rounded text-sm font-bold tracking-widest transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ background: RED, color: 'white', letterSpacing: '0.14em' }}
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> ANALYZING…</>
                ) : (
                  <><Shield size={15} /> RUN SECURITY SCREENING</>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Results */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: '#555', letterSpacing: '0.12em' }}>SCREENING COMPLETE</p>
                  <h2 className="text-lg font-bold text-white">Applicant Document Review</h2>
                </div>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded tracking-wider font-semibold transition-all"
                  style={{ background: '#1a1a1a', border: `1px solid ${BORDER}`, color: '#7a7a7a', letterSpacing: '0.08em' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a'; (e.currentTarget as HTMLElement).style.color = '#c0c0c0'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.color = '#7a7a7a'; }}
                >
                  NEW SCREENING
                </button>
              </div>

              {/* Score card */}
              <div className="rounded-lg p-5 mb-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold tracking-widest" style={{ color: '#555', letterSpacing: '0.12em' }}>COMPLETENESS SCORE</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded" style={{ background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}44` }}>{scoreLabel}</span>
                    <span className="text-2xl font-black" style={{ color: scoreColor }}>{result.score}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="rounded-full overflow-hidden" style={{ background: '#222', height: '6px' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${result.score}%`, background: scoreColor }}
                  />
                </div>
              </div>

              {/* Document checklist */}
              <div className="rounded-lg p-5 mb-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: '#555', letterSpacing: '0.12em' }}>DOCUMENT CHECKLIST</p>
                <DocRow label="Curriculum Vitae (CV / Résumé)" status={result.cv} />
                <DocRow label="Work Permit / Residence Permit" status={result.workPermit} />
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-3">
                    <FileText size={14} color="#5a5a5a" />
                    <span className="text-sm" style={{ color: '#c0c0c0' }}>Criminal Record Statement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/present/i.test(result.criminalRecord)
                      ? <CheckCircle2 size={15} color="#22c55e" />
                      : <XCircle size={15} color={RED} />
                    }
                    <span className="text-xs font-semibold" style={{ color: /present/i.test(result.criminalRecord) ? '#22c55e' : RED }}>
                      {/present/i.test(result.criminalRecord) ? 'Present' : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security status */}
              <div className="rounded-lg p-5 mb-4" style={{
                background: result.securityStatus === 'clear' ? 'rgba(34,197,94,0.05)' : 'rgba(204,0,0,0.08)',
                border: `1px solid ${result.securityStatus === 'clear' ? 'rgba(34,197,94,0.2)' : 'rgba(204,0,0,0.35)'}`,
              }}>
                <div className="flex items-center gap-2.5 mb-2">
                  {result.securityStatus === 'clear'
                    ? <Shield size={15} color="#22c55e" />
                    : <ShieldAlert size={15} color={RED} />
                  }
                  <p className="text-xs font-bold tracking-widest" style={{
                    color: result.securityStatus === 'clear' ? '#22c55e' : RED,
                    letterSpacing: '0.1em',
                  }}>
                    {result.securityStatus === 'clear' ? 'SECURITY CLEAR' : '⚠ INJECTION ATTEMPT DETECTED'}
                  </p>
                </div>
                <p className="text-sm" style={{ color: result.securityStatus === 'clear' ? '#6a9a6a' : '#cc8888' }}>
                  {result.securityDetail}
                </p>
              </div>

              {/* Assessment */}
              {result.assessment && (
                <div className="rounded-lg p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronRight size={14} color={RED} />
                    <p className="text-xs font-semibold tracking-widest" style={{ color: '#555', letterSpacing: '0.12em' }}>HR RECOMMENDATION</p>
                  </div>
                  <p className="text-sm" style={{ color: '#c0c0c0', lineHeight: 1.6 }}>{result.assessment}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
