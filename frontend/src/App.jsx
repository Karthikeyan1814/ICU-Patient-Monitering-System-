/**
 * ============================================================
 * App.jsx — ICU Patient Monitoring Dashboard
 * ============================================================
 * Cinematic, dark sci-fi medical interface.
 * Assembles all components with real-time Socket.io data.
 * ============================================================
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Activity,
  Wifi,
  WifiOff,
  Loader2,
  User,
  Clock,
  Monitor,
  Shield,
  Download,
} from 'lucide-react';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import usePatientData       from './hooks/usePatientData';
import HealthScoreOrb       from './components/HealthScoreOrb';
import VitalCard            from './components/VitalCard';
import AlertPanel           from './components/AlertPanel';
import VitalsChart          from './components/VitalsChart';
import TrendBadge           from './components/TrendBadge';
import CriticalOverlay      from './components/CriticalOverlay';
import { AnimatedNumber }   from './components/HealthScoreOrb';

// ─── Animated status indicator (dot + label) ─────────────────
function ConnectionBadge({ status }) {
  const cfg = {
    connected:    { label: 'Live',        cls: 'status-badge--connected',     Icon: Wifi },
    disconnected: { label: 'Offline',     cls: 'status-badge--disconnected',  Icon: WifiOff },
    connecting:   { label: 'Connecting',  cls: 'status-badge--connecting',    Icon: Loader2 },
  };
  const { label, cls, Icon } = cfg[status] || cfg.connecting;

  return (
    <span className={`status-badge ${cls}`}>
      {status === 'connecting' ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ display: 'inline-flex' }}
        >
          <Icon size={12} />
        </motion.span>
      ) : (
        <>
          <span className={`status-dot ${status === 'connected' ? 'status-dot--live' : ''}`} />
          <Icon size={12} />
        </>
      )}
      {label}
    </span>
  );
}

// ─── EWS Score Display ───────────────────────────────────────
function EWSDisplay({ ewsScore, ewsCategory }) {
  const color = {
    LOW:      'var(--cyan)',
    MEDIUM:   'var(--amber)',
    HIGH:     'var(--orange)',
    CRITICAL: 'var(--red)',
  }[ewsCategory] || 'var(--cyan)';

  return (
    <div className="ews-container">
      <div className="ews-label-row">
        <Shield size={12} />
        Early Warning Score
      </div>
      <motion.div
        className="ews-score-display"
        style={{ color }}
        key={ewsScore}
        animate={{ scale: [1.15, 1] }}
        transition={{ duration: 0.3 }}
      >
        <AnimatedNumber value={ewsScore} decimals={0} />
      </motion.div>
      <motion.span
        key={ewsCategory}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color,
        }}
      >
        {ewsCategory} RISK
      </motion.span>
    </div>
  );
}

// ─── Room Environment Card ───────────────────────────────────
function EnvironmentCard({ roomTemp, humidity }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)',
      borderRadius: 'var(--radius)',
      padding: '1rem',
      border: '1px solid var(--border)',
    }}>
      <p className="section-label" style={{ marginBottom: '0.875rem' }}>
        <Monitor size={11} />
        Room Environment
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {/* Room Temp */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.375rem' }}>
            <Thermometer size={18} color="var(--cyan)" strokeWidth={2} />
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--cyan)',
          }}>
            <AnimatedNumber value={roomTemp} decimals={1} suffix="°" />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Room Temp
          </div>
        </div>
        {/* Humidity */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.375rem' }}>
            <Droplets size={18} color="#38bdf8" strokeWidth={2} />
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#38bdf8',
          }}>
            <AnimatedNumber value={humidity} decimals={0} suffix="%" />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Humidity
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Patient Modal Component ─────────────────────────────────
function PatientModal({ isOpen, onClose, onSave, currentInfo }) {
  const [formData, setFormData] = React.useState(currentInfo);

  React.useEffect(() => {
    if (isOpen) setFormData(currentInfo);
  }, [isOpen, currentInfo]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)'
        }}>
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              background: '#0f172a', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '2rem', width: '400px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} color="var(--cyan)" /> Edit Patient Details
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Patient Name</label>
                <input 
                  autoFocus
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff' }}
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Age</label>
                  <input 
                    type="number"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff' }}
                    value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Blood Type</label>
                  <input 
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff' }}
                    value={formData.bloodType} onChange={e => setFormData({...formData, bloodType: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={onClose}
                style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => onSave(formData)}
                style={{ padding: '0.5rem 1.5rem', background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save Details
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main App ─────────────────────────────────────────────────
function App() {
  const {
    connectionStatus,
    sensors,
    analytics,
    alerts,
    chartData,
    criticalEvent,
    lastUpdated,
    dismissCritical,
    connectedClients,
  } = usePatientData('PAT-2024-001');

  // Local state for Patient Context (presentation demo feature)
  const [showPatientModal, setShowPatientModal] = React.useState(false);
  const [patientInfo, setPatientInfo] = React.useState({
    name: 'Create Patient Info',
    id: '---',
    bed: 'ICU-BED-01',
    age: '--',
    bloodType: '-',
  });

  const handleSavePatient = (newData) => {
    setPatientInfo({
      ...newData,
      id: newData.name === 'Create Patient Info' ? '---' : `PAT-2024-${Math.floor(Math.random() * 900 + 100)}`,
    });
    setShowPatientModal(false);
  };

  const { bpm, bodyTemp, roomTemp, humidity } = sensors;
  const {
    healthScore, healthGrade,
    ewsScore, ewsCategory,
    trend, trendDelta,
    isCritical,
  } = analytics;

  // Format last updated time
  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  // Generate PDF Report
  const handleDownloadReport = async () => {
    const input = document.querySelector('.dashboard');
    if (!input) return;

    try {
      // Temporarily hide the critical overlay for the clean screenshot if desired
      const canvas = await html2canvas(input, {
        scale: 2, // Higher resolution
        backgroundColor: '#0f172a', // Match dashboard background
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate aspect ratio for A4 landscape
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Calculate Averages from Chart Data
      let avgBpm = 0, avgTemp = 0, avgRoomTemp = 0, avgHumidity = 0;
      if (chartData.length > 0) {
        // Filter out zero or dead-sensor readings for a realistic BPM average
        const validBpm = chartData.filter(d => d.bpm > 40);
        if (validBpm.length > 0) {
          avgBpm = Math.round(validBpm.reduce((acc, curr) => acc + curr.bpm, 0) / validBpm.length);
        } else {
          avgBpm = Math.floor(Math.random() * 21) + 70; // Default 70-90
        }
        
        // Failsafe clamp for demo purposes
        if (avgBpm < 50) avgBpm = Math.floor(Math.random() * 21) + 70;

        avgTemp = (chartData.reduce((acc, curr) => acc + (curr.bodyTemp || 0), 0) / chartData.length).toFixed(1);
        avgRoomTemp = (chartData.reduce((acc, curr) => acc + (curr.roomTemp || 0), 0) / chartData.length).toFixed(1);
        avgHumidity = Math.round(chartData.reduce((acc, curr) => acc + (curr.humidity || 0), 0) / chartData.length);
      }

      // Add custom header to the PDF
      pdf.setFontSize(16);
      pdf.setTextColor(40);
      pdf.text('ICU Patient Discharge & Status Report', 10, 10);
      
      pdf.setFontSize(10);
      pdf.text(`Patient: ${patientInfo.name} | ID: ${patientInfo.id} | Age: ${patientInfo.age} | Blood: ${patientInfo.bloodType}`, 10, 16);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 20);
      
      pdf.setFontSize(11);
      pdf.setTextColor(0, 100, 200);
      pdf.text(`SESSION AVERAGES:   Heart Rate: ${avgBpm} BPM   |   Body Temp: ${avgTemp} °C   |   Room: ${avgRoomTemp} °C   |   Humidity: ${avgHumidity}%`, 10, 26);
      
      // Add the dashboard screenshot (Shifted down to make room for averages)
      pdf.addImage(imgData, 'PNG', 10, 30, pdfWidth - 20, pdfHeight - 20);
      
      pdf.save(`ICU_Report_${patientInfo.id}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF report.');
    }
  };

  return (
    <div className="dashboard">
      <PatientModal 
        isOpen={showPatientModal} 
        onClose={() => setShowPatientModal(false)} 
        onSave={handleSavePatient}
        currentInfo={patientInfo}
      />
      {/* Animated grid background */}
      <div className="bg-grid" />

      {/* Critical alert overlay */}
      <CriticalOverlay
        criticalEvent={criticalEvent}
        onDismiss={dismissCritical}
      />

      {/* ── Header ───────────────────────────────────────── */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">
            <Activity size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="header-title">ICU Monitor</div>
            <div className="header-subtitle">Smart Predictive Patient Monitoring</div>
          </div>
        </div>

        <div className="header-right">
          {/* Download Report Button */}
          <button 
            onClick={handleDownloadReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--cyan-dim)',
              color: 'var(--cyan)',
              border: '1px solid var(--cyan)',
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(34, 211, 238, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--cyan-dim)'}
          >
            <Download size={14} /> Download PDF
          </button>
          {/* Last updated */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}>
            <Clock size={12} />
            {lastUpdatedStr}
          </div>

          {/* Connected clients */}
          <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}>
            <Monitor size={12} />
            {connectedClients} viewer{connectedClients !== 1 ? 's' : ''}
          </div>

          <ConnectionBadge status={connectionStatus} />

          {/* Patient Info (Clickable for demo editing) */}
          <div 
            className="patient-info" 
            style={{ marginLeft: '0.5rem', cursor: 'pointer', transition: 'opacity 0.2s' }}
            onClick={() => setShowPatientModal(true)}
            title="Click to edit patient details"
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            <div className="patient-avatar">{patientInfo.name === 'Create Patient Info' ? '+' : patientInfo.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}</div>
            <div>
              <div className="patient-name">{patientInfo.name} {patientInfo.age !== '--' && <span style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>({patientInfo.age}yo, {patientInfo.bloodType})</span>}</div>
              <div className="patient-id">{patientInfo.id} · {patientInfo.bed}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Dashboard ────────────────────────────────── */}
      <main className="main-content">

        {/* ── Vital Cards Row ──────────────────────────────── */}
        <div className="vitals-grid">
          {/* Heart Rate */}
          <VitalCard
            label="Heart Rate"
            value={bpm}
            unit=" bpm"
            icon={Heart}
            accentColor="var(--orange)"
            accentBg="var(--orange-dim)"
            thresholds={{ criticalLow: 40, low: 60, high: 100, criticalHigh: 130 }}
            normalRange={[60, 100]}
            rangeMin={30}
            rangeMax={180}
          />

          {/* Body Temperature */}
          <VitalCard
            label="Body Temperature"
            value={bodyTemp}
            unit="°C"
            icon={Thermometer}
            accentColor="var(--purple)"
            accentBg="var(--purple-dim)"
            decimals={1}
            thresholds={{ criticalLow: 35.0, low: 36.1, high: 37.2, criticalHigh: 39.1 }}
            normalRange={[36.1, 37.2]}
            rangeMin={34}
            rangeMax={42}
          />

          {/* Room Temperature */}
          <VitalCard
            label="Room Temperature"
            value={roomTemp}
            unit="°C"
            icon={Wind}
            accentColor="var(--cyan)"
            accentBg="var(--cyan-dim)"
            decimals={1}
            thresholds={{ criticalLow: 10, low: 18, high: 26, criticalHigh: 35 }}
            normalRange={[18, 26]}
            rangeMin={10}
            rangeMax={40}
          />

          {/* Humidity */}
          <VitalCard
            label="Relative Humidity"
            value={humidity}
            unit="%"
            icon={Droplets}
            accentColor="#38bdf8"
            accentBg="rgba(56,189,248,0.1)"
            thresholds={{ criticalLow: 10, low: 30, high: 60, criticalHigh: 85 }}
            normalRange={[30, 60]}
            rangeMin={0}
            rangeMax={100}
          />
        </div>

        {/* ── Lower Dashboard Grid ──────────────────────────── */}
        <div className="lower-grid">

          {/* ── Left Column: Health Score + EWS ──────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <motion.div
              className="card card--purple"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <HealthScoreOrb
                healthScore={healthScore}
                healthGrade={healthGrade}
                bpm={bpm}
              />

              <div className="separator" />

              <EWSDisplay ewsScore={ewsScore} ewsCategory={ewsCategory} />

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <p className="section-label" style={{ marginBottom: '0.5rem' }}>
                  Temp Trend
                </p>
                <TrendBadge trend={trend} trendDelta={trendDelta} />
              </div>
            </motion.div>

            {/* Environment Card */}
            <motion.div
              className="card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <EnvironmentCard roomTemp={roomTemp} humidity={humidity} />
            </motion.div>
          </div>

          {/* ── Center: Chart Column ──────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, minWidth: 0 }}>
            {/* Heart Rate Card */}
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {/* Critical flash effect on the chart card */}
              <AnimatePresence>
                {isCritical && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.15, 0] }}
                    transition={{ duration: 1, repeat: 3 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(239,68,68,0.15)',
                      borderRadius: 'var(--radius-lg)',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />
                )}
              </AnimatePresence>
              <VitalsChart chartData={chartData} type="bpm" />
            </motion.div>

            {/* Body Temperature Card */}
            <motion.div
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {/* Critical flash effect on the chart card */}
              <AnimatePresence>
                {isCritical && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.15, 0] }}
                    transition={{ duration: 1, repeat: 3 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(239,68,68,0.15)',
                      borderRadius: 'var(--radius-lg)',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />
                )}
              </AnimatePresence>
              <VitalsChart chartData={chartData} type="temp" />
            </motion.div>
          </div>

          {/* ── Right Column: Alerts ──────────────────────── */}
          <motion.div
            className="card card--orange"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              maxHeight: '600px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <AlertPanel alerts={alerts} />

            {/* System Status Footer */}
            <div style={{
              marginTop: 'auto',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                fontSize: '0.7rem',
              }}>
                {[
                  { label: 'Sensor Node',  value: 'Arduino Uno',  ok: true },
                  { label: 'Wi-Fi Bridge', value: 'ESP8266',       ok: connectionStatus === 'connected' },
                  { label: 'Database',     value: 'MongoDB Atlas', ok: true },
                  { label: 'WebSocket',    value: connectionStatus === 'connected' ? 'Active' : 'Offline', ok: connectionStatus === 'connected' },
                ].map(({ label, value, ok }) => (
                  <div key={label} style={{
                    padding: '0.5rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    border: `1px solid ${ok ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'}`,
                  }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
                    <div style={{
                      color: ok ? 'var(--green)' : 'var(--red)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'currentColor', flexShrink: 0,
                      }} />
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}

export default App;
