'use client';
import { useState, useRef } from 'react';
import { Upload, X, FileText, Loader2, AlertTriangle, CheckCircle2, AlertCircle, ShieldCheck, ShieldAlert, Shield, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CVFraudAgentProps {
  systemPrompt: string;
}

interface AttachedFile {
  name: string;
  mimeType: string;
  data?: string;
  text?: string;
  type: 'cv' | 'certificate';
}

interface ParsedResult {
  docName: string;
  docType: string;
  riskScore: 'Low' | 'Medium' | 'High' | string;
  raw: string;
}

const RISK_STYLE: Record<string, { color: string; bg: string; border: string; icon: typeof Shield }> = {
  Low:    { color: '#16a34a', bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.25)',  icon: ShieldCheck },
  Medium: { color: '#d97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.25)',  icon: Shield },
  High:   { color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.25)',  icon: ShieldAlert },
};

function parseResults(text: string): ParsedResult[] {
  const blocks = text.split(/\n---\n/).filter(b => b.trim());
  return blocks.map(block => {
    const docName = block.match(/\*\*Document:\*\*\s*(.+)/i)?.[1]?.trim() || 'Document';
    const docType = block.match(/\*\*Document Type:\*\*\s*(.+)/i)?.[1]?.trim() || '';
    const riskRaw = block.match(/\*\*Risk Score:\*\*\s*(.+)/i)?.[1]?.trim() || 'Medium';
    const riskScore = riskRaw.includes('High') ? 'High' : riskRaw.includes('Low') ? 'Low' : 'Medium';
    return { docName, docType, riskScore, raw: block.trim() };
  });
}

function ResultCard({ result }: { result: ParsedResult }) {
  const [expanded, setExpanded] = useState(true);
  const style = RISK_STYLE[result.riskScore] || RISK_STYLE.Medium;
  const Icon = style.icon;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: 'white' }}>
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
        style={{ background: '#1a1a2e', borderBottom: expanded ? '3px solid #f59e0b' : 'none' }}
      >
        <div className="flex items-center gap-3">
          <FileText size={15} color="rgba(255,255,255,0.6)" />
          <div>
            <p className="text-white font-semibold text-sm">{result.docName}</p>
            {result.docType && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{result.docType}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
            <Icon size={12} />
            {result.riskScore} Risk
          </div>
          {expanded ? <ChevronUp size={14} color="rgba(255,255,255,0.5)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.5)" />}
        </div>
      </button>

      {expanded && (
        <div className="px-6 py-5">
          <div className="prose prose-sm max-w-none text-sm leading-relaxed" style={{ color: '#374151' }}>
            <ReactMarkdown
              components={{
                strong: ({ children }) => <strong style={{ color: '#1a1a2e' }}>{children}</strong>,
                li: ({ children }) => <li style={{ marginBottom: '0.35rem' }}>{children}</li>,
                p: ({ children }) => <p style={{ marginBottom: '0.6rem' }}>{children}</p>,
                ul: ({ children }) => <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.6rem' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: '1.25rem', marginBottom: '0.6rem' }}>{children}</ol>,
                h2: ({ children }) => <h2 style={{ color: '#1a1a2e', fontSize: '0.8rem', fontWeight: 700, marginTop: '1rem', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</h2>,
              }}
            >
              {/* Strip the header lines already shown in the card header */}
              {result.raw
                .replace(/\*\*Document:\*\*.*\n?/, '')
                .replace(/\*\*Document Type:\*\*.*\n?/, '')
                .replace(/\*\*Risk Score:\*\*.*\n?/, '')
                .trim()}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function FileChip({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
  const isCv = file.type === 'cv';
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isCv ? 'rgba(245,158,11,0.1)' : 'rgba(26,26,46,0.07)', border: `1px solid ${isCv ? 'rgba(245,158,11,0.3)' : 'rgba(26,26,46,0.15)'}` }}>
      <FileText size={13} color={isCv ? '#f59e0b' : '#1a1a2e'} />
      <div className="min-w-0">
        <p className="text-xs font-medium truncate max-w-[140px]" style={{ color: '#1a1a2e' }}>{file.name}</p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>{isCv ? 'CV / Resume' : 'Certificate'}</p>
      </div>
      <button onClick={onRemove} className="ml-1 p-0.5 rounded hover:bg-gray-100">
        <X size={12} color="#9ca3af" />
      </button>
    </div>
  );
}

export default function CVFraudAgent({ systemPrompt }: CVFraudAgentProps) {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [results, setResults] = useState<ParsedResult[] | null>(null);
  const [rawResult, setRawResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<'cv' | 'cert' | null>(null);

  const cvRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File, type: 'cv' | 'certificate') => {
    const mimeType = file.type || 'application/octet-stream';
    const name = file.name;
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
          setFiles(prev => [...prev, { name, mimeType, text, type }]);
        } catch {
          setFiles(prev => [...prev, { name, mimeType, data: base64, type }]);
        }
      } else {
        setFiles(prev => [...prev, { name, mimeType, data: base64, type }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, type: 'cv' | 'certificate') => {
    e.preventDefault();
    setDragOver(null);
    Array.from(e.dataTransfer.files).forEach(f => processFile(f, type));
  };

  const analyze = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);

    const cvFiles = files.filter(f => f.type === 'cv');
    const certFiles = files.filter(f => f.type === 'certificate');
    let message = `Please analyze the following documents for authenticity and fraud risk.\n`;
    if (cvFiles.length) message += `\nCV/Resume files: ${cvFiles.map(f => f.name).join(', ')}`;
    if (certFiles.length) message += `\nCertificate files: ${certFiles.map(f => f.name).join(', ')}`;
    message += `\n\nFor each document, check: work history timeline integrity, employer credibility, skills plausibility, certificate authenticity indicators, and AI-generated content signals.`;

    const apiFiles = files.map(f => ({ name: f.name, mimeType: f.mimeType, data: f.data, text: f.text }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          systemPrompt,
          files: apiFiles,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setRawResult(data.content);
      setResults(parseResults(data.content));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFiles([]); setResults(null); setRawResult(null); setError(null); };

  const cvFiles = files.filter(f => f.type === 'cv');
  const certFiles = files.filter(f => f.type === 'certificate');

  const overallRisk = results
    ? results.some(r => r.riskScore === 'High') ? 'High'
    : results.some(r => r.riskScore === 'Medium') ? 'Medium' : 'Low'
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f4f5f7' }}>
      {/* Header */}
      <div style={{ background: '#1a1a2e', borderBottom: '3px solid #f59e0b' }}>
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs" style={{ background: '#f59e0b', color: '#1a1a2e', letterSpacing: '-0.03em' }}>PW</div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide">PERSOWERK DEUTSCHLAND</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>GmbH · Credential Verification</p>
              </div>
            </div>
            <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.12)' }} />
            <p className="text-white text-sm font-medium">CV & Certificate Fraud Detection</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
            Powered by Orion AI
          </div>
        </div>
      </div>

      {!results && !loading && (
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Upload zones */}
            <div className="grid grid-cols-2 gap-4">
              {/* CV drop zone */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#1a1a2e' }}>CV / Resume</p>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver('cv'); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => handleDrop(e, 'cv')}
                  onClick={() => cvRef.current?.click()}
                  className="rounded-2xl p-5 text-center cursor-pointer transition-all"
                  style={{
                    background: dragOver === 'cv' ? 'rgba(245,158,11,0.08)' : 'white',
                    border: `2px dashed ${dragOver === 'cv' ? '#f59e0b' : '#d1d5db'}`,
                    minHeight: '120px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <Upload size={20} color={dragOver === 'cv' ? '#f59e0b' : '#9ca3af'} />
                  <p className="text-sm text-gray-500">Drop CV here</p>
                  <p className="text-xs text-gray-400">PDF, DOCX, TXT</p>
                  <input ref={cvRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg" multiple className="hidden"
                    onChange={e => Array.from(e.target.files || []).forEach(f => processFile(f, 'cv'))} />
                </div>
                <div className="mt-2 space-y-1">
                  {cvFiles.map((f, i) => <FileChip key={i} file={f} onRemove={() => setFiles(prev => prev.filter((_, j) => j !== files.indexOf(f)))} />)}
                </div>
              </div>

              {/* Certificate drop zone */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#1a1a2e' }}>Certificates</p>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver('cert'); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => handleDrop(e, 'certificate')}
                  onClick={() => certRef.current?.click()}
                  className="rounded-2xl p-5 text-center cursor-pointer transition-all"
                  style={{
                    background: dragOver === 'cert' ? 'rgba(26,26,46,0.05)' : 'white',
                    border: `2px dashed ${dragOver === 'cert' ? '#1a1a2e' : '#d1d5db'}`,
                    minHeight: '120px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <ShieldCheck size={20} color={dragOver === 'cert' ? '#1a1a2e' : '#9ca3af'} />
                  <p className="text-sm text-gray-500">Drop certificates here</p>
                  <p className="text-xs text-gray-400">PDF, PNG, JPG — multiple ok</p>
                  <input ref={certRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.txt" multiple className="hidden"
                    onChange={e => Array.from(e.target.files || []).forEach(f => processFile(f, 'certificate'))} />
                </div>
                <div className="mt-2 space-y-1">
                  {certFiles.map((f, i) => <FileChip key={i} file={f} onRemove={() => setFiles(prev => prev.filter((_, j) => j !== files.indexOf(f)))} />)}
                </div>
              </div>
            </div>

            {/* What we check */}
            <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#1a1a2e' }}>What this agent checks</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: '🕐', label: 'Timeline integrity', desc: 'Gaps, overlaps, implausible jumps' },
                  { icon: '🏢', label: 'Employer credibility', desc: 'Unverifiable or vague companies' },
                  { icon: '📈', label: 'Role progression', desc: 'Is seniority logically earned?' },
                  { icon: '🤖', label: 'AI-generated content', desc: 'Synthetic text patterns in CV' },
                  { icon: '📜', label: 'Certificate authenticity', desc: 'Format, issuer, serial, expiry' },
                  { icon: '🎯', label: 'Skills plausibility', desc: 'Claims vs. supporting evidence' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: '#f9fafb' }}>
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#1a1a2e' }}>{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
                <AlertTriangle size={15} />{error}
              </div>
            )}

            <button
              onClick={analyze}
              disabled={files.length === 0}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: files.length > 0 ? '#1a1a2e' : '#9ca3af' }}
            >
              Analyze {files.length > 0 ? `${files.length} Document${files.length > 1 ? 's' : ''}` : 'Documents'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#1a1a2e' }} />
            <p className="text-sm font-medium" style={{ color: '#1a1a2e' }}>Analysing documents...</p>
            <p className="text-xs text-gray-400 mt-1">Checking timelines, certificates, and authenticity signals</p>
          </div>
        </div>
      )}

      {results && (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Summary banner */}
            {overallRisk && (
              <div className="rounded-2xl px-5 py-4 flex items-center justify-between" style={{ background: '#1a1a2e' }}>
                <div>
                  <p className="text-white font-bold text-sm">Verification Complete</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {results.length} document{results.length > 1 ? 's' : ''} analysed · {results.filter(r => r.riskScore === 'High').length} high risk · {results.filter(r => r.riskScore === 'Medium').length} medium risk
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: RISK_STYLE[overallRisk].bg, color: RISK_STYLE[overallRisk].color, border: `1px solid ${RISK_STYLE[overallRisk].border}` }}>
                  {overallRisk === 'High' ? <ShieldAlert size={15} /> : overallRisk === 'Low' ? <ShieldCheck size={15} /> : <Shield size={15} />}
                  Overall: {overallRisk} Risk
                </div>
              </div>
            )}

            {results.map((r, i) => <ResultCard key={i} result={r} />)}

            <button onClick={reset} className="w-full rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2" style={{ background: 'white', border: '1px solid #e5e7eb', color: '#374151' }}>
              <RotateCcw size={14} />
              Analyse New Documents
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
