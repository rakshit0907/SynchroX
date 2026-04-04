'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Analysis {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  media_type: string;
  verdict: string;
  confidence_score: number;
  analysis_details: {
    artifactScore: number;
    consistencyScore: number;
    metadataScore: number;
    patternScore: number;
    summary: string;
  };
  status: string;
  created_at: string;
}

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  ai_generated: { label: 'Likely AI-Generated', color: '#f87171', bg: 'rgba(239,68,68,0.12)', icon: '🤖' },
  authentic: { label: 'Likely Authentic', color: '#34d399', bg: 'rgba(16,185,129,0.12)', icon: '✅' },
  inconclusive: { label: 'Inconclusive', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', icon: '❓' },
};

function ConfidenceGauge({ score, size = 140 }: { score: number; size?: number }) {
  const pct = Math.round(score * 100);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * circumference);
  const color = score >= 0.75 ? '#34d399' : score >= 0.5 ? '#fbbf24' : '#f87171';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="50%" y="46%" textAnchor="middle" fill="white" fontSize="24" fontWeight="800">{pct}%</text>
      <text x="50%" y="62%" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="500">CONFIDENCE</text>
    </svg>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{Math.round(score * 100)}%</span>
      </div>
      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ width: `${score * 100}%`, height: '100%', background: color, borderRadius: '10px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export default function TrustShieldPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selected, setSelected] = useState<Analysis | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnalyses = useCallback(async () => {
    try {
      const res = await fetch('/api/trust-shield');
      const data = await res.json();
      setAnalyses(data.analyses || []);
    } catch { /* demo data handled by API */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      formData.append('fileType', file.type);
      formData.append('fileSize', file.size.toString());

      const res = await fetch('/api/trust-shield', { method: 'POST', body: formData });
      const data = await res.json();
      const analysis = data.analysis;

      setAnalyses((prev) => [analysis, ...prev]);
      setSelected(analysis);

      const v = VERDICT_CONFIG[analysis.verdict];
      setToast(`${v?.icon} ${v?.label} — ${Math.round(analysis.confidence_score * 100)}% confidence`);
      setTimeout(() => setToast(null), 4000);
    } catch {
      setToast('❌ Analysis failed');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      handleUpload(file);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} /></div>;
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🛡️ Trust Shield</h1>
        <p className="page-subtitle">AI Content Detection — Upload photos or videos to verify authenticity</p>
      </div>

      {/* Upload Zone */}
      <div
        className="glass-card"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '48px', textAlign: 'center', cursor: 'pointer', marginBottom: '24px',
          border: dragOver ? '2px dashed var(--accent-blue)' : '1px solid var(--border-glass)',
          background: dragOver ? 'rgba(59,130,246,0.05)' : 'var(--bg-card)',
          transition: 'all 0.3s ease',
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
        {uploading ? (
          <div>
            <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Analyzing media...</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>🔍</div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Drop a photo or video here, or click to browse
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Supports JPG, PNG, WebP, MP4, WebM • Max 50MB
            </p>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Analysis History */}
        <div className="glass-card" style={{ overflow: 'hidden', maxHeight: 'calc(100vh - 360px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Analysis History</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{analyses.length} scans</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {analyses.map((a) => {
              const v = VERDICT_CONFIG[a.verdict] || VERDICT_CONFIG.inconclusive;
              return (
                <div key={a.id} onClick={() => setSelected(a)} style={{
                  padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer',
                  background: selected?.id === a.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {a	.media_type === 'video' ? '🎬' : '📷'} {a.file_name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(a.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: v.color, background: v.bg, padding: '2px 10px', borderRadius: '100px' }}>
                      {v.icon} {v.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{Math.round(a.confidence_score * 100)}%</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSize(a.file_size)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analysis Result Detail */}
        <div className="glass-card" style={{ overflow: 'hidden', maxHeight: 'calc(100vh - 360px)', display: 'flex', flexDirection: 'column' }}>
          {selected ? (() => {
            const v = VERDICT_CONFIG[selected.verdict] || VERDICT_CONFIG.inconclusive;
            const d = selected.analysis_details;
            return (
              <>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{selected.file_name}</h3>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: v.color, background: v.bg, padding: '6px 16px', borderRadius: '100px', border: `1px solid ${v.color}30` }}>
                      {v.icon} {v.label}
                    </span>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <ConfidenceGauge score={selected.confidence_score} />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                      Detection Breakdown
                    </h4>
                    <ScoreBar label="Artifact Detection" score={d.artifactScore} color="var(--accent-red)" />
                    <ScoreBar label="Consistency Analysis" score={d.consistencyScore} color="var(--accent-amber)" />
                    <ScoreBar label="Metadata Integrity" score={d.metadataScore} color="var(--accent-green)" />
                    <ScoreBar label="Pattern Recognition" score={d.patternScore} color="var(--accent-purple)" />
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Analysis Summary</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>{d.summary}</p>
                  </div>
                  <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                    <span>Type: {selected	.file_type}</span>
                    <span>Size: {formatSize(selected.file_size)}</span>
                    <span>Media: {selected	.media_type}</span>
                  </div>
                </div>
              </>
            );
          })() : (
            <div className="empty-state" style={{ height: '100%' }}>
              <div className="empty-state-icon">🛡️</div>
              <div className="empty-state-text">Upload media to analyze</div>
              <div className="empty-state-sub">Select a scan from history or upload a new file</div>
            </div>
          )}
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
