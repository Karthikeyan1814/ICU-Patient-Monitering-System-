/**
 * CriticalOverlay Component
 * ──────────────────────────
 * Full-screen red warning overlay triggered when EWS hits critical threshold.
 * Flashes with animated border and glowing background.
 * Displays exact deterioration timestamp, EWS score, and alert messages.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

function CriticalOverlay({ criticalEvent, onDismiss }) {
  if (!criticalEvent) return null;

  const timeStr = criticalEvent.criticalAt
    ? new Date(criticalEvent.criticalAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : new Date().toLocaleString('en-IN');

  return (
    <AnimatePresence>
      {criticalEvent && (
        <motion.div
          className="critical-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Flashing border overlay */}
          <motion.div
            className="critical-overlay__bg"
            animate={{
              borderColor: [
                'rgba(239,68,68,0.3)',
                'rgba(239,68,68,0.8)',
                'rgba(239,68,68,0.3)',
              ],
            }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Radial pulse */}
          <motion.div
            className="critical-overlay__pulse"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Alert Card */}
          <motion.div
            className="critical-overlay__card"
            initial={{ scale: 0.85, y: -30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              aria-label="Dismiss critical alert"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '50%',
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--red)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            >
              <X size={14} />
            </button>

            {/* Animated warning icon */}
            <motion.div
              animate={{ rotate: [-4, 4, -4] }}
              transition={{ duration: 0.4, repeat: Infinity }}
              style={{ marginBottom: '1rem' }}
            >
              <AlertTriangle
                size={48}
                color="var(--red)"
                strokeWidth={2}
                style={{ filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.8))' }}
              />
            </motion.div>

            <h2 className="critical-overlay__title">
              PATIENT DETERIORATION
            </h2>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
              Early Warning Score
            </p>

            {/* EWS Score — large animated number */}
            <motion.div
              className="critical-overlay__ews"
              animate={{ textShadow: [
                '0 0 20px rgba(239,68,68,0.5)',
                '0 0 60px rgba(239,68,68,0.9)',
                '0 0 20px rgba(239,68,68,0.5)',
              ]}}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              {criticalEvent.ewsScore}
            </motion.div>

            {/* Alert messages */}
            {criticalEvent.alertBody && (
              <p className="critical-overlay__message">
                {criticalEvent.alertBody.split(' | ').map((msg, i) => (
                  <span key={i} style={{ display: 'block', marginBottom: '0.25rem' }}>
                    • {msg}
                  </span>
                ))}
              </p>
            )}

            {/* Timestamp */}
            <p className="critical-overlay__time">
              ⚠️ Deterioration detected at: {timeStr}
            </p>

            {/* Patient Info */}
            {criticalEvent.patientId && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Patient: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {criticalEvent.patientId}
                </span>
              </p>
            )}

            <button className="btn-dismiss" onClick={onDismiss}>
              Acknowledge & Dismiss
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CriticalOverlay;
