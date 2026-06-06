/**
 * VitalsChart Component
 * ──────────────────────
 * Interactive Recharts AreaChart displaying:
 *   - Body Temperature (°C) — purple area
 *   - Heart Rate (BPM)      — orange area
 * Over the last 60 readings, updating smoothly as WebSocket data arrives.
 */

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={{
      background: 'rgba(13,13,20,0.97)',
      border: '1px solid rgba(168,85,247,0.3)',
      borderRadius: '10px',
      padding: '0.875rem 1rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.75rem',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'var(--font-sans)' }}>
        {label}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.25rem',
          color: p.color,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: p.color, flexShrink: 0,
          }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: p.color }}>
            {p.value?.toFixed(p.dataKey === 'bodyTemp' ? 1 : 0)}
            {p.dataKey === 'bodyTemp' ? '°C' : ' bpm'}
          </span>
        </div>
      ))}
    </div>
  );
}

// Custom legend renderer
function CustomLegend({ payload }) {
  return (
    <div className="chart-legend" style={{ justifyContent: 'flex-end' }}>
      {payload?.map(entry => (
        <div key={entry.value} className="legend-item">
          <div
            className="legend-dot"
            style={{ background: entry.color }}
          />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

function VitalsChart({ chartData = [], type = 'bpm' }) {
  // Only show every Nth label on x-axis to avoid crowding
  const tickInterval = Math.max(1, Math.floor(chartData.length / 8));

  // Compute dynamic domains with some padding
  const tempValues = chartData.map(d => d.bodyTemp).filter(Boolean);
  const bpmValues = chartData.map(d => d.bpm).filter(Boolean);

  const tempMin = tempValues.length ? Math.floor(Math.min(...tempValues) - 0.5) : 35;
  const tempMax = tempValues.length ? Math.ceil(Math.max(...tempValues) + 0.5) : 40;
  const bpmMin = bpmValues.length ? Math.floor(Math.min(...bpmValues) - 5) : 40;
  const bpmMax = bpmValues.length ? Math.ceil(Math.max(...bpmValues) + 5) : 130;

  return (
    <div>
      <div className="chart-header">
        <h3 className="chart-title" style={{ color: type === 'bpm' ? '#f97316' : '#a855f7' }}>
          {type === 'bpm' ? 'Heart Rate Timeline' : 'Body Temp Timeline'}
        </h3>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Last {chartData.length} readings
        </div>
      </div>

      <div className="chart-container">
        {chartData.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}>
            <div style={{
              width: 40, height: 40,
              border: '2px solid rgba(168,85,247,0.3)',
              borderRadius: '50%',
              borderTopColor: 'var(--purple)',
              animation: 'spin 1s linear infinite',
            }} />
            <span>Waiting for sensor data...</span>
          </div>
        ) : (
          <div style={{ height: '300px', position: 'relative' }}>
            {type === 'bpm' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bpmGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval={tickInterval} />
                  <YAxis domain={[bpmMin, bpmMax]} tick={{ fill: '#f97316', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={100} stroke="rgba(249,115,22,0.15)" strokeDasharray="4 4" />
                  <ReferenceLine y={60} stroke="rgba(249,115,22,0.15)" strokeDasharray="4 4" />
                  <Area type="monotoneX" dataKey="bpm" name="Heart Rate" stroke="#f97316" strokeWidth={2.5} fill="url(#bpmGradient)" dot={false} activeDot={{ r: 5, fill: '#f97316', strokeWidth: 2, stroke: '#0d0d14' }} animationDuration={600} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {type === 'temp' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval={tickInterval} />
                  <YAxis domain={[tempMin, tempMax]} tick={{ fill: '#a855f7', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={v => `${v}°`} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={37.2} stroke="rgba(34,211,238,0.2)" strokeDasharray="4 4" label={{ value: 'Normal Max', position: 'insideTopLeft', fontSize: 9, fill: 'rgba(34,211,238,0.5)' }} />
                  <ReferenceLine y={36.1} stroke="rgba(34,211,238,0.2)" strokeDasharray="4 4" />
                  <Area type="monotoneX" dataKey="bodyTemp" name="Body Temp" stroke="#a855f7" strokeWidth={2.5} fill="url(#tempGradient)" dot={false} activeDot={{ r: 5, fill: '#a855f7', strokeWidth: 2, stroke: '#0d0d14' }} animationDuration={600} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default VitalsChart;
