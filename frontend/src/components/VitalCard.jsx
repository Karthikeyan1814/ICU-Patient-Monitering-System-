/**
 * VitalCard Component
 * ─────────────────────
 * Displays a single vital sign with:
 *   - Animated rolling value counter
 *   - Visual range indicator bar
 *   - Color-coded status (normal/warning/critical)
 *   - Lucide icon
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './HealthScoreOrb';

// Determine status based on value and thresholds
function getStatus(value, thresholds) {
  const { criticalLow, low, high, criticalHigh } = thresholds;
  if (value <= criticalLow || value >= criticalHigh) return 'critical';
  if (value < low || value > high) return 'warning';
  return 'normal';
}

// Map status to color token
const STATUS_COLORS = {
  normal:   'var(--cyan)',
  warning:  'var(--amber)',
  critical: 'var(--red)',
};

const STATUS_BG = {
  normal:   'var(--cyan-dim)',
  warning:  'var(--amber-glow)',
  critical: 'rgba(239,68,68,0.1)',
};

function VitalCard({
  label,
  value,
  unit,
  icon: Icon,
  accentColor = 'var(--purple)',
  accentBg    = 'var(--purple-dim)',
  decimals    = 0,
  thresholds  = { criticalLow: -Infinity, low: -Infinity, high: Infinity, criticalHigh: Infinity },
  normalRange = [null, null],  // [min, max] for range bar
  rangeMin    = 0,
  rangeMax    = 100,
}) {
  const status       = getStatus(value, thresholds);
  const statusColor  = STATUS_COLORS[status];
  const statusBg     = STATUS_BG[status];

  // For range indicator bar: clamp percentage
  const pct = Math.min(100, Math.max(0, ((value - rangeMin) / (rangeMax - rangeMin)) * 100));

  // Normal range overlay positions
  const normalLowPct  = normalRange[0] != null
    ? Math.min(100, Math.max(0, ((normalRange[0] - rangeMin) / (rangeMax - rangeMin)) * 100))
    : 0;
  const normalHighPct = normalRange[1] != null
    ? Math.min(100, Math.max(0, ((normalRange[1] - rangeMin) / (rangeMax - rangeMin)) * 100))
    : 100;

  return (
    <motion.div
      className="card vital-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        borderColor: status !== 'normal'
          ? `${statusColor}40`
          : 'rgba(255,255,255,0.07)',
      }}
    >
      {/* Top row: label + icon */}
      <div className="vital-card__header">
        <span className="vital-card__label">{label}</span>
        <motion.div
          className="vital-card__icon"
          style={{ background: status !== 'normal' ? statusBg : accentBg }}
          animate={status === 'critical' ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.6, repeat: status === 'critical' ? Infinity : 0 }}
        >
          {Icon && (
            <Icon
              size={16}
              color={status !== 'normal' ? statusColor : accentColor}
              strokeWidth={2.5}
            />
          )}
        </motion.div>
      </div>

      {/* Animated value */}
      <div className="vital-card__value" style={{ color: statusColor }}>
        <AnimatedNumber value={value} decimals={decimals} />
        <span className="vital-card__unit">{unit}</span>
      </div>

      {/* Range bar */}
      <div>
        <div className="range-bar">
          {/* Normal range highlight */}
          <div
            style={{
              position: 'absolute',
              left: `${normalLowPct}%`,
              width: `${normalHighPct - normalLowPct}%`,
              height: '100%',
              background: 'rgba(34, 211, 238, 0.15)',
              borderRadius: '2px',
            }}
          />
          {/* Value fill */}
          <motion.div
            className="range-bar__fill"
            style={{
              background: `linear-gradient(90deg, ${accentColor}80, ${statusColor})`,
              width: `${pct}%`,
            }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
          {/* Marker dot */}
          <motion.div
            className="range-bar__marker"
            style={{
              left: `${pct}%`,
              background: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
            }}
            animate={{ left: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </div>
        <div className="vital-card__footer" style={{ marginTop: '0.6rem' }}>
          <span>Min: {rangeMin}{unit}</span>
          <span style={{
            color: statusColor,
            fontWeight: 600,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
          }}>
            {status}
          </span>
          <span>Max: {rangeMax}{unit}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default VitalCard;
