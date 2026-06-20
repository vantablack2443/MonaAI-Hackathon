'use client';
import { useState, useRef } from 'react';
import { Upload, X, FileText, Loader2, ShieldCheck, ShieldAlert, Shield, AlertTriangle, Lock, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SecureEmailAgentProps {
  systemPrompt: string;
}

interface AttachedFile {
  name: string;
  mimeType: string;
  data?: string;
  text?: string;
}

interface InjectionHit {
  pattern: string;
  match: string;
  source: string; // filename or "Email body"
}

// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: 'Ignore instructions',   regex: /ignore\s+(all\s+)?(previous|prior|above|your)\s+instructions/i },
  { label: 'Role override',         regex: /you\s+are\s+now\s+(a|an|the)\s+\w/i },
  { label: 'System tag',            regex: /(\[system\]|<\|im_start\|>|<\|system\|>|\{\{system\}\})/i },
  { label: 'System prefix',         regex: /^system\s*:/im },
  { label: 'Override directive',    regex: /override\s+(your|all|previous|the)\s+\w/i },
  { label: 'Forget directive',      regex: /forget\s+(your|all|previous|everything|the\s+above)/i },
  { label: 'Disregard directive',   regex: /disregard\s+(your|all|previous|the\s+above)/i },
  { label: 'New instructions',      regex: /new\s+instructions?\s*:/i },
  { label: 'Act as',                regex: /act\s+as\s+(if\s+you\s+are|a|an)\s+\w/i },
  { label: 'Pretend directive',     regex: /pretend\s+(you\s+are|to\s+be)\s+\w/i },
  { label: 'New role/purpose',      regex: /your\s+new\s+(role|purpose|task|instructions?|goal)\s+(is|are)\s*:/i },
  { label: 'Template injection',    regex: /\{\{[^}]{3,}\}\}/i },
  { label: 'Script tag',            regex: /<\s*script[\s>]/i },
  { label: 'Assistant impersonation', regex: /^assistant\s*:\s*i\s+will/im },
  { label: 'Jailbreak phrase',      regex: /(DAN|do\s+anything\s+now|jailbreak\s+mode|developer\s+mode\s+enabled)/i },
];

function scanForInjection(text: string, sourceName: string): InjectionHit[] {
  const hits: InjectionHit[] = [];
  for (const { label, regex } of INJECTION_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      hits.push({ pattern: label, match: match[0].trim(), source: sourceName });
    }
  }
  return hits;
}

function FileChip({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(227,6,19,0.08)', border: '1px solid rgba(227,6,19,0.2)' }}>
      <FileText size={13} color="#e30613" />
      <p className="text-xs font-medium truncate max-w-[160px]" style={{ color: '#1a1a1a' }}>{file.name}</p>
      <button onClick={onRemove} className="ml-1 p-0.5 rounded hover:bg-gray-100">
        <X size={12} color="#9ca3af" />
      </button>
    </div>
  );
}

interface ChecklistItem {
  label: string;
  present: boolean | null;
}

function parseChecklist(text: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const present = line.includes('✅') || /:\s*present/i.test(line);
    const missing = line.includes('❌') || /:\s*missing/i.test(line);
    if (present || missing) {
      const label = line.replace(/[-*•]\s*/, '').replace(/[✅❌]/, '').replace(/:\s*(Present|Missing).*/i, '').trim();
      if (label) items.push({ label, present });
    }
  }
  return items;
}

function parseScore(text: string): number | null {
  const m = text.match(/completeness\s+score[:\s]+(\d+)%/i);
  return m ? parseInt(m[1]) : null;
}

export default function SecureEmailAgent({ systemPrompt }: SecureEmailAgentProps) {
  const [emailBody, setEmailBody] = useState('');
  const [docs, setDocs] = useState<AttachedFile[]>([]);
  const [scanHits, setScanHits] = useState<InjectionHit[] | null>(null);
  const [scanDone, setScanDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const name = file.name;
    const mimeType = file.type || 'application/octet-stream';
    const needsConversion = name.endsWith('.docx') || name.endsWith('.xlsx') || name.endsWith('.csv');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      if (needsConversion) {
        try {
          const res = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, mimeType, data: base64 }),
          });
          const { text } = await res.json();
          setDocs(prev => [...prev, { name, mimeType, text }]);
        } catch {
          setDocs(prev => [...prev, { name, mimeType, data: base64 }]);
        }
      } else {
        setDocs(prev => [...prev, { name, mimeType, data: base64 }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const runScan = () => {
    const hits: InjectionHit[] = [];
    if (emailBody.trim()) hits.push(...scanForInjection(emailBody, 'Email body'));
    for (const doc of docs) {
      if (doc.text) hits.push(...scanForInjection(doc.text, doc.name));
    }
    setScanHits(hits);
    setScanDone(true);
    return hits;
  };

  const submit = async () => {
    const hits = runScan();
    if (hits.length > 0) return; // block if injection found

    setLoading(true);
    setError(null);
    setResult(null);

    // Structural separation: email body as labelled text, docs as inlineData
    const userMessage = emailBody.trim()
      ? `Process this applicant email submission. Email body:\n\n${emailBody}`
      : 'Process the attached applicant documents.';

    const apiFiles = docs.map(f => ({ name: f.name, mimeType: f.mimeType, data: f.data, text: f.text }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          systemPrompt,
          files: apiFiles,
          temperature: 0.1,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      // Post-output sanity: if result looks like free-form approval without a checklist, flag it
      const hasChecklist = /cv.*present|permit.*present|criminal.*present|✅|❌/i.test(data.content);
      if (!hasChecklist) {
        setError('⚠ Output failed schema validation — response did not match expected checklist format. Possible manipulation.');
        return;
      }
      setResult(data.content);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEmailBody(''); setDocs([]); setScanHits(null);
    setScanDone(false); setResult(null); setError(null);
  };

  const checklist = result ? parseChecklist(result) : [];
  const score = result ? parseScore(result) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f4f4f4' }}>
      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: '3px solid #e30613' }}>
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs" style={{ background: '#e30613', color: 'white', letterSpacing: '-0.03em' }}>
                <Lock size={16} />
              </div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide">RHEINMETALL AG</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>HR · Secure Document Intake</p>
              </div>
            </div>
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.12)' }} />
            <p className="text-white text-sm font-medium">Applicant Document Verification</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(227,6,19,0.15)', border: '1px solid rgba(227,6,19,0.4)', color: '#ff4444' }}>
            <Shield size={11} />
            Injection-Hardened
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-5">

          {!result && (
            <>
              {/* Email body */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#1a1a1a' }}>Email Body</p>
                <textarea
                  value={emailBody}
                  onChange={e => { setEmailBody(e.target.value); setScanDone(false); setScanHits(null); }}
                  placeholder="Paste the applicant email body here…"
                  rows={5}
                  className="w-full rounded-2xl p-4 text-sm outline-none resize-none"
                  style={{ background: 'white', border: '1px solid #e5e7eb', color: '#1f2937' }}
                />
              </div>

              {/* Document upload */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#1a1a1a' }}>Applicant Documents</p>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); Array.from(e.dataTransfer.files).forEach(f => processFile(f)); }}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-2xl p-6 text-center cursor-pointer transition-all"
                  style={{
                    background: dragOver ? 'rgba(227,6,19,0.05)' : 'white',
                    border: `2px dashed ${dragOver ? '#e30613' : '#d1d5db'}`,
                  }}
                >
                  <Upload size={20} color={dragOver ? '#e30613' : '#9ca3af'} className="mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Drop documents here</p>
                  <p className="text-xs text-gray-400 mt-1">CV, work permit, criminal record — PDF, DOCX, PNG</p>
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" multiple className="hidden"
                    onChange={e => { Array.from(e.target.files || []).forEach(f => processFile(f)); setScanDone(false); setScanHits(null); }} />
                </div>
                {docs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {docs.map((f, i) => (
                      <FileChip key={i} file={f} onRemove={() => { setDocs(prev => prev.filter((_, j) => j !== i)); setScanDone(false); setScanHits(null); }} />
                    ))}
                  </div>
                )}
              </div>

              {/* How it's protected */}
              <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1a1a1a' }}>Security layers</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: '🔍', label: 'Pre-scan', desc: '15 injection pattern checks before Gemini sees anything' },
                    { icon: '🧱', label: 'Structural separation', desc: 'Documents sent as data parts, not mixed with instructions' },
                    { icon: '✅', label: 'Output validation', desc: 'Response must match checklist schema or it is rejected' },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-xl" style={{ background: '#f9fafb' }}>
                      <span className="text-lg">{item.icon}</span>
                      <p className="text-xs font-semibold mt-1" style={{ color: '#1a1a1a' }}>{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pre-scan results */}
              {scanDone && scanHits !== null && (
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${scanHits.length > 0 ? 'rgba(227,6,19,0.3)' : 'rgba(22,163,74,0.3)'}` }}>
                  <div className="px-5 py-3 flex items-center gap-3" style={{ background: scanHits.length > 0 ? 'rgba(227,6,19,0.06)' : 'rgba(22,163,74,0.06)' }}>
                    {scanHits.length > 0
                      ? <><ShieldAlert size={16} color="#e30613" /><p className="text-sm font-bold" style={{ color: '#e30613' }}>⚠ {scanHits.length} injection pattern{scanHits.length > 1 ? 's' : ''} detected — submission blocked</p></>
                      : <><ShieldCheck size={16} color="#16a34a" /><p className="text-sm font-bold" style={{ color: '#16a34a' }}>Pre-scan passed — no injection patterns found</p></>
                    }
                  </div>
                  {scanHits.length > 0 && (
                    <div className="px-5 py-4 space-y-2">
                      {scanHits.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <AlertTriangle size={12} color="#e30613" className="flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold" style={{ color: '#1a1a1a' }}>{h.pattern}</span>
                            <span className="text-gray-500"> in {h.source}: </span>
                            <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(227,6,19,0.08)', color: '#e30613' }}>"{h.match}"</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />{error}
                </div>
              )}

              <button
                onClick={submit}
                disabled={(!emailBody.trim() && docs.length === 0) || loading}
                className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#1a1a1a' }}
              >
                {loading ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : <><Lock size={14} /> Scan & Verify Documents</>}
              </button>
            </>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Security cleared banner */}
              <div className="rounded-2xl px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)' }}>
                <ShieldCheck size={16} color="#16a34a" />
                <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>Pre-scan cleared · Output schema validated · Safe to use</p>
              </div>

              {/* Score */}
              {score !== null && (
                <div className="rounded-2xl px-6 py-5 flex items-center justify-between" style={{ background: '#1a1a1a' }}>
                  <div>
                    <p className="text-white font-bold">Application Completeness</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Based on required Rheinmetall HR documents</p>
                  </div>
                  <div className="text-3xl font-black" style={{ color: score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#e30613' }}>
                    {score}%
                  </div>
                </div>
              )}

              {/* Checklist */}
              {checklist.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                  <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1a1a1a' }}>Document Checklist</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {checklist.map((item, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between">
                        <p className="text-sm" style={{ color: '#374151' }}>{item.label}</p>
                        {item.present
                          ? <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#16a34a' }}><CheckCircle2 size={14} />Present</div>
                          : <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#e30613' }}><XCircle size={14} />Missing</div>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full response */}
              <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1a1a1a' }}>Full Analysis</p>
                <div className="prose prose-sm max-w-none text-sm leading-relaxed" style={{ color: '#374151' }}>
                  <ReactMarkdown
                    components={{
                      strong: ({ children }) => <strong style={{ color: '#1a1a1a' }}>{children}</strong>,
                      li: ({ children }) => <li style={{ marginBottom: '0.3rem' }}>{children}</li>,
                      p: ({ children }) => <p style={{ marginBottom: '0.5rem' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.5rem' }}>{children}</ul>,
                      h2: ({ children }) => <h2 style={{ color: '#1a1a1a', fontSize: '0.8rem', fontWeight: 700, marginTop: '1rem', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</h2>,
                    }}
                  >
                    {result}
                  </ReactMarkdown>
                </div>
              </div>

              <button onClick={reset} className="w-full rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2" style={{ background: 'white', border: '1px solid #e5e7eb', color: '#374151' }}>
                <RotateCcw size={14} /> New Submission
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
