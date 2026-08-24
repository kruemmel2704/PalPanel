import React from 'react';

export default function MetricCard({ title, value, subtext, icon: Icon, color = 'cyan', progress = null }) {
  const colorMap = {
    cyan: {
      bg: 'rgba(6, 182, 212, 0.12)',
      text: '#22d3ee',
      bar: 'linear-gradient(90deg, #06b6d4, #38bdf8)',
      glow: 'rgba(6, 182, 212, 0.3)',
    },
    emerald: {
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#34d399',
      bar: 'linear-gradient(90deg, #10b981, #34d399)',
      glow: 'rgba(16, 185, 129, 0.3)',
    },
    amber: {
      bg: 'rgba(245, 158, 11, 0.12)',
      text: '#fbbf24',
      bar: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
      glow: 'rgba(245, 158, 11, 0.3)',
    },
    rose: {
      bg: 'rgba(244, 63, 94, 0.12)',
      text: '#fb7185',
      bar: 'linear-gradient(90deg, #f43f5e, #fb7185)',
      glow: 'rgba(244, 63, 94, 0.3)',
    },
    indigo: {
      bg: 'rgba(99, 102, 241, 0.12)',
      text: '#818cf8',
      bar: 'linear-gradient(90deg, #6366f1, #818cf8)',
      glow: 'rgba(99, 102, 241, 0.3)',
    },
  };

  const scheme = colorMap[color] || colorMap.cyan;

  return (
    <div className="glass-panel" style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: scheme.bg,
              color: scheme.text,
            }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: progress !== null ? '12px' : '4px' }}>
        <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: 'var(--font-main)' }}>
          {value}
        </span>
        {subtext && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {subtext}
          </span>
        )}
      </div>

      {progress !== null && (
        <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              background: scheme.bar,
              borderRadius: '3px',
              transition: 'width 0.4s ease-out',
              boxShadow: `0 0 10px ${scheme.glow}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
