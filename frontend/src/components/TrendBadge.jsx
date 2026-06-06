/**
 * TrendBadge Component
 * ──────────────────────
 * Displays the temperature trend: Rising, Stable, or Falling.
 * With animated arrow icon and delta value.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function TrendBadge({ trend = 'Stable', trendDelta = 0 }) {
  const config = {
    Rising: {
      Icon:      TrendingUp,
      className: 'trend-badge--rising',
      label:     'Rising',
      color:     '#fca5a5',
    },
    Falling: {
      Icon:      TrendingDown,
      className: 'trend-badge--falling',
      label:     'Falling',
      color:     'var(--purple-bright)',
    },
    Stable: {
      Icon:      Minus,
      className: 'trend-badge--stable',
      label:     'Stable',
      color:     'var(--cyan)',
    },
  };

  const { Icon, className, label, color } = config[trend] || config.Stable;
  const deltaStr = trendDelta != null
    ? `${trendDelta > 0 ? '+' : ''}${trendDelta.toFixed(2)}°C/reading`
    : '';

  return (
    <motion.div
      key={trend}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}
    >
      <span
        className={`trend-badge ${className}`}
        style={{ fontSize: '0.75rem' }}
      >
        <Icon size={13} strokeWidth={2.5} />
        {label}
      </span>
      {deltaStr && (
        <span style={{
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          {deltaStr}
        </span>
      )}
    </motion.div>
  );
}

export default TrendBadge;
