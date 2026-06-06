/**
 * AlertPanel Component
 * ─────────────────────
 * Displays a scrollable list of alert cards.
 * New alerts slide in from the right with spring animation.
 * Each card is color-coded: critical (red), warning (amber), info (cyan).
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, Bell } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: {
    color:     'var(--red)',
    bg:        'rgba(239,68,68,0.08)',
    border:    'rgba(239,68,68,0.5)',
    Icon:      AlertTriangle,
    label:     'CRITICAL',
  },
  warning: {
    color:     'var(--amber)',
    bg:        'rgba(251,191,36,0.07)',
    border:    'rgba(251,191,36,0.35)',
    Icon:      AlertCircle,
    label:     'WARNING',
  },
  info: {
    color:     'var(--cyan)',
    bg:        'rgba(34,211,238,0.07)',
    border:    'rgba(34,211,238,0.3)',
    Icon:      Info,
    label:     'INFO',
  },
};

function AlertCard({ alert }) {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const { Icon } = config;

  const timeStr = alert.timestamp
    ? new Date(alert.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '--:--:--';

  return (
    <motion.div
      layout
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0, height: 0, marginBottom: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        opacity: { duration: 0.2 },
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius)',
        borderLeft: `3px solid ${config.border}`,
        background: config.bg,
        marginBottom: '0.5rem',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Severity icon */}
      <div style={{ flexShrink: 0, marginTop: '0.1rem' }}>
        <Icon size={15} color={config.color} strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}>
          {alert.message}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <span style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            color: config.color,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {config.label}
          </span>
          {alert.ewsScore != null && (
            <span style={{
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              EWS: {alert.ewsScore}
            </span>
          )}
          <span style={{
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginLeft: 'auto',
          }}>
            {timeStr}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function AlertPanel({ alerts = [] }) {
  return (
    <div>
      <p className="section-label">
        <Bell size={12} />
        Active Alerts
        {alerts.length > 0 && (
          <motion.span
            key={alerts.length}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            style={{
              background: 'var(--red)',
              color: '#fff',
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              marginLeft: '0.25rem',
            }}
          >
            {alerts.length}
          </motion.span>
        )}
      </p>

      <div className="alert-panel">
        <AnimatePresence mode="popLayout" initial={false}>
          {alerts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                padding: '2rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Bell size={24} color="var(--text-muted)" strokeWidth={1.5} />
              <span>All vitals within normal range</span>
            </motion.div>
          ) : (
            alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AlertPanel;
