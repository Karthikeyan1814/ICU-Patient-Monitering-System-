/**
 * HealthScoreOrb Component
 * ─────────────────────────
 * Animated SVG circular progress indicator for the Health Score.
 * Pulses based on the current heart rate (BPM).
 * Uses framer-motion for smooth animations.
 */

import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';

// Animated number counter (rolls to new value smoothly)
function AnimatedNumber({ value, decimals = 0, suffix = '' }) {
  const nodeRef = useRef(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(prevValue.current, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate(v) {
        node.textContent = v.toFixed(decimals) + suffix;
      },
    });

    prevValue.current = value;
    return () => controls.stop();
  }, [value, decimals, suffix]);

  return <span ref={nodeRef}>{value.toFixed(decimals)}{suffix}</span>;
}

// Derive color from health score
function getScoreColor(score) {
  if (score >= 85) return '#4ade80';
  if (score >= 70) return '#22d3ee';
  if (score >= 50) return '#a855f7';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

function getGradeColor(grade) {
  const map = {
    EXCELLENT: '#4ade80',
    GOOD:      '#22d3ee',
    FAIR:      '#a855f7',
    POOR:      '#f97316',
    CRITICAL:  '#ef4444',
  };
  return map[grade] || '#a855f7';
}

function HealthScoreOrb({ healthScore = 0, healthGrade = 'FAIR', bpm = 72 }) {
  const SIZE   = 200;
  const RADIUS = 82;
  const STROKE = 10;
  const CIRCUM = 2 * Math.PI * RADIUS;

  const clampedScore = Math.max(0, Math.min(100, healthScore));
  const dashOffset   = CIRCUM * (1 - clampedScore / 100);
  const color        = getScoreColor(clampedScore);
  const gradeColor   = getGradeColor(healthGrade);

  // Pulse period derived from BPM: period = 60s / bpm
  const pulsePeriod  = bpm > 0 ? (60 / bpm) : 0.9;

  return (
    <div className="health-orb-container">
      <p className="section-label">Health Score</p>

      <div className="health-orb-wrapper">
        {/* Outer glow ring — pulses with heartbeat */}
        <motion.div
          animate={{
            boxShadow: [
              `0 0 20px ${color}30, 0 0 50px ${color}10`,
              `0 0 40px ${color}60, 0 0 80px ${color}20`,
              `0 0 20px ${color}30, 0 0 50px ${color}10`,
            ],
          }}
          transition={{
            duration: pulsePeriod,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            width: SIZE + 40,
            height: SIZE + 40,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        {/* SVG Progress Arc */}
        <svg
          className="health-orb-svg"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
        >
          {/* Defs for gradient */}
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={STROKE}
          />

          {/* Animated progress arc */}
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUM}
            filter="url(#glow)"
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            style={{ strokeDashoffset: dashOffset }}
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const angle = (pct / 100) * 360 - 90;
            const rad   = (angle * Math.PI) / 180;
            const x1    = SIZE / 2 + (RADIUS - STROKE / 2 - 8) * Math.cos(rad);
            const y1    = SIZE / 2 + (RADIUS - STROKE / 2 - 8) * Math.sin(rad);
            const x2    = SIZE / 2 + (RADIUS + STROKE / 2 + 2) * Math.cos(rad);
            const y2    = SIZE / 2 + (RADIUS + STROKE / 2 + 2) * Math.sin(rad);
            return (
              <line
                key={pct}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {/* Center text */}
        <div className="health-orb-center">
          <div className="health-orb-score" style={{ color }}>
            <AnimatedNumber value={clampedScore} decimals={0} />
          </div>
          <div className="health-orb-label">Health Score</div>
        </div>
      </div>

      {/* Grade badge */}
      <motion.div
        key={healthGrade}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="health-orb-grade"
        style={{ color: gradeColor }}
      >
        {healthGrade}
      </motion.div>
    </div>
  );
}

export { AnimatedNumber };
export default HealthScoreOrb;
