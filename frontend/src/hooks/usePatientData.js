/**
 * ============================================================
 * Custom Hook: usePatientData
 * ============================================================
 * Manages the Socket.io connection and all patient state.
 * - Connects to the backend WebSocket server
 * - Listens for patient:update and patient:critical events
 * - Maintains rolling chart history (last 60 data points)
 * - Fetches initial data from REST API on mount
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const CHART_HISTORY_LIMIT = 60;

// ── Default state structure ───────────────────────────────────
const DEFAULT_SENSORS = {
  bpm: 0,
  bodyTemp: 0,
  roomTemp: 0,
  humidity: 0,
};

const DEFAULT_ANALYTICS = {
  healthScore: 0,
  healthGrade: 'FAIR',
  ewsScore: 0,
  ewsCategory: 'LOW',
  trend: 'Stable',
  trendDelta: 0,
  isCritical: false,
  alertMessages: [],
};

/**
 * @returns {{
 *   connectionStatus: 'connected'|'disconnected'|'connecting',
 *   sensors: object,
 *   analytics: object,
 *   alerts: Array,
 *   chartData: Array,
 *   criticalEvent: object|null,
 *   lastUpdated: Date|null,
 *   dismissCritical: function,
 *   connectedClients: number,
 * }}
 */
function usePatientData(patientId = 'PAT-2024-001') {
  const socketRef = useRef(null);

  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [sensors, setSensors]                   = useState(DEFAULT_SENSORS);
  const [analytics, setAnalytics]               = useState(DEFAULT_ANALYTICS);
  const [alerts, setAlerts]                     = useState([]);
  const [chartData, setChartData]               = useState([]);
  const [criticalEvent, setCriticalEvent]        = useState(null);
  const [lastUpdated, setLastUpdated]            = useState(null);
  const [connectedClients, setConnectedClients]  = useState(0);

  // ── Fetch Initial Data from REST API ─────────────────────
  const fetchInitialData = useCallback(async () => {
    try {
      // Latest reading
      const latestRes = await fetch(
        `/api/readings/latest?patientId=${patientId}`
      );
      if (latestRes.ok) {
        const { data } = await latestRes.json();
        if (data) {
          setSensors(data.sensors);
          setAnalytics(data.analytics);
          setLastUpdated(new Date(data.createdAt));
        }
      }

      // Chart history
      const chartRes = await fetch(
        `/api/readings/history/chart?patientId=${patientId}&limit=60`
      );
      if (chartRes.ok) {
        const { data } = await chartRes.json();
        if (data && data.length > 0) {
          setChartData(data);
        }
      }
    } catch (err) {
      console.warn('[usePatientData] Could not fetch initial data:', err.message);
      // Continue — WebSocket will provide live data
    }
  }, [patientId]);

  // ── Socket Connection ─────────────────────────────────────
  useEffect(() => {
    fetchInitialData();

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socketRef.current = socket;

    // ── Connection Events ──────────────────────────────────
    socket.on('connect', () => {
      console.log('[WS] Connected to ICU Monitor server.');
      setConnectionStatus('connected');

      // Request latest data upon (re)connect
      socket.emit('client:requestLatest', { patientId });
    });

    socket.on('disconnect', (reason) => {
      console.warn('[WS] Disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      setConnectionStatus('connecting');
    });

    socket.on('reconnect', () => {
      console.log('[WS] Reconnected.');
      setConnectionStatus('connected');
    });

    socket.on('reconnect_attempt', () => {
      setConnectionStatus('connecting');
    });

    // ── Server Welcome ────────────────────────────────────
    socket.on('server:welcome', (data) => {
      console.log('[WS] Server welcome:', data.message);
    });

    socket.on('server:clientCount', ({ count }) => {
      setConnectedClients(count);
    });

    // ── Main Patient Update Event ────────────────────────
    socket.on('patient:update', (data) => {
      if (data.patientId !== patientId) return;  // Filter by patient

      setSensors(data.sensors);
      setAnalytics(data.analytics);
      setLastUpdated(new Date(data.timestamp));

      // Add new alerts from this reading
      if (data.analytics.alertMessages && data.analytics.alertMessages.length > 0) {
        const newAlerts = data.analytics.alertMessages.map((msg, i) => ({
          id: `${Date.now()}-${i}`,
          message: msg,
          severity: msg.startsWith('CRITICAL') ? 'critical' : 'warning',
          timestamp: new Date(),
        }));

        setAlerts(prev => {
          const combined = [...newAlerts, ...prev];
          return combined.slice(0, 20);  // Keep last 20 alerts
        });
      }

      // Append to chart data
      setChartData(prev => {
        const newPoint = {
          time:        new Date(data.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          bpm:         data.sensors.bpm,
          bodyTemp:    data.sensors.bodyTemp,
          roomTemp:    data.sensors.roomTemp,
          humidity:    data.sensors.humidity,
          healthScore: data.analytics.healthScore,
          ewsScore:    data.analytics.ewsScore,
        };
        const updated = [...prev, newPoint];
        // Keep rolling window of CHART_HISTORY_LIMIT points
        if (updated.length > CHART_HISTORY_LIMIT) {
          return updated.slice(updated.length - CHART_HISTORY_LIMIT);
        }
        return updated;
      });
    });

    // ── Critical Alert Event (high-priority) ─────────────
    socket.on('patient:critical', (data) => {
      if (data.patientId !== patientId) return;

      console.warn('[WS] 🚨 CRITICAL ALERT received!', data.ewsScore);
      setCriticalEvent(data);

      // Also add to alerts list
      setAlerts(prev => [{
        id: `critical-${Date.now()}`,
        message: data.alertTitle || 'CRITICAL: Patient deterioration detected',
        severity: 'critical',
        timestamp: new Date(data.criticalAt),
        ewsScore: data.ewsScore,
      }, ...prev].slice(0, 20));
    });

    // ── Latest Data Response ──────────────────────────────
    socket.on('patient:latest', ({ success, data }) => {
      if (success && data) {
        setSensors(data.sensors);
        setAnalytics(data.analytics);
        setLastUpdated(new Date(data.createdAt));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [patientId, fetchInitialData]);

  // ── Dismiss Critical Alert ────────────────────────────────
  const dismissCritical = useCallback(() => {
    setCriticalEvent(null);
  }, []);

  return {
    connectionStatus,
    sensors,
    analytics,
    alerts,
    chartData,
    criticalEvent,
    lastUpdated,
    dismissCritical,
    connectedClients,
  };
}

export default usePatientData;
