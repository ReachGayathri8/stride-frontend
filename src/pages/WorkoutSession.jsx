import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { initDetector } from '../ai/poseDetection';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { getRulesForExercise } from '../ai/exerciseLogic';
import { sessionApi, exerciseApi } from '../services/workoutApi';
import './WorkoutSession.css';

// ─── Camera helpers ──────────────────────────────────────────────────────────
async function listCameras() {
  try {
    // Must request permission first to get labels
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(s => s.getTracks().forEach(t => t.stop()));
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
  } catch {
    return [];
  }
}

async function startStream(deviceId, facingMode = 'user') {
  const constraints = {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
      : { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function WorkoutSession() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);

  const [exercise, setExercise]         = useState(state?.exercise ?? null);
  const [rules, setRules]               = useState(null);
  const [camReady, setCamReady]         = useState(false);
  const [camError, setCamError]         = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [active, setActive]             = useState(false);
  const [sessionId, setSessionId]       = useState(null);
  const [sets, setSets]                 = useState([]);
  const [targetReps, setTargetReps]     = useState(12);
  const [voiceOn, setVoiceOn]           = useState(true);

  // Camera selection
  const [cameras, setCameras]           = useState([]);
  const [selectedCam, setSelectedCam]   = useState('');
  const [showCamPicker, setShowCamPicker] = useState(false);
  const [ipCamUrl, setIpCamUrl]         = useState('');
  const [useIpCam, setUseIpCam]         = useState(false);

  const { reps, accuracy, feedback, poseReady, resetReps } =
    usePoseDetection(videoRef, canvasRef, active ? rules : null, active);

  // Fetch available cameras on mount
  useEffect(() => {
    listCameras().then(devs => {
      setCameras(devs);
      if (devs.length) setSelectedCam(devs[0].deviceId);
    });
  }, []);

  // Load exercise rules
  useEffect(() => {
    if (!exercise) return;
    exerciseApi.getRules(exercise.id)
      .then(r => setRules(r.data))
      .catch(() => setRules(getRulesForExercise(exercise)));
  }, [exercise]);

  // ── Start camera stream ──
  const startCamera = useCallback(async (deviceId, ipUrl = '') => {
    setCamError('');
    setCamReady(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Your browser does not support camera access. Please use Chrome or Firefox.');
      return;
    }

    // IP camera mode
    if (ipUrl) {
      if (videoRef.current) {
        videoRef.current.src = ipUrl;
        videoRef.current.oncanplay = () => setCamReady(true);
        videoRef.current.onerror   = () => setCamError('Cannot connect to IP camera. Check the URL and make sure the camera is running.');
        videoRef.current.play();
      }
      return;
    }

    try {
      const stream = await startStream(deviceId || undefined);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.src = '';
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => setCamReady(true))
            .catch(() => setCamReady(true));
        };
      }
    } catch (err) {
      console.error('Camera error:', err.name, err.message);
      const msgs = {
        NotAllowedError:      'Camera permission denied.\n\n➊ Click the camera icon 🎥 in your browser address bar.\n➋ Choose "Allow".\n➌ Click Retry Camera.',
        PermissionDeniedError:'Camera permission denied.\n\nClick the 🎥 icon in the address bar → Allow → Retry Camera.',
        NotFoundError:        'No camera found. Please connect a webcam and click Retry.',
        DevicesNotFoundError: 'No camera found. Please connect a webcam and click Retry.',
        NotReadableError:     'Camera is in use by another app (Zoom, Teams…). Close it and click Retry.',
        OverconstrainedError: 'Selected camera could not start. Try a different camera from the list.',
      };
      setCamError(msgs[err.name] ?? `Camera error: ${err.message}. Click Retry Camera.`);
    }
  }, []);

  // Auto-start on mount
  useEffect(() => {
    startCamera(selectedCam);
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const switchCamera = async (deviceId) => {
    setSelectedCam(deviceId);
    setShowCamPicker(false);
    await startCamera(deviceId);
  };

  const connectIpCam = () => {
    if (!ipCamUrl) return;
    setUseIpCam(true);
    setShowCamPicker(false);
    startCamera('', ipCamUrl);
  };

  // ── Session controls ──
  const handleStart = useCallback(async () => {
    if (!camReady || !rules) return;
    setModelLoading(true);
    try { await initDetector(); } catch (_) {}
    try {
      const res = await sessionApi.start({ exerciseId: exercise?.id });
      setSessionId(res.data?.id ?? 'local');
    } catch { setSessionId('local'); }
    setActive(true);
    setModelLoading(false);
    resetReps();
  }, [camReady, rules, exercise, resetReps]);

  const handleLogSet = useCallback(async () => {
    if (!active) return;
    const setData = { reps, accuracyScore: accuracy, exerciseId: exercise?.id };
    setSets(prev => [...prev, setData]);
    if (sessionId && sessionId !== 'local') sessionApi.logSet(sessionId, setData).catch(() => {});
    resetReps();
  }, [active, reps, accuracy, exercise, sessionId, resetReps]);

  const handleFinish = useCallback(async () => {
    setActive(false);
    const summary = {
      totalReps: sets.reduce((a, s) => a + s.reps, 0) + reps,
      avgAccuracy: sets.length ? Math.round(sets.reduce((a, s) => a + s.accuracyScore, 0) / sets.length) : accuracy,
      status: 'COMPLETED',
    };
    if (sessionId && sessionId !== 'local') await sessionApi.complete(sessionId, summary).catch(() => {});
    navigate('/history', { state: { summary } });
  }, [sets, reps, accuracy, sessionId, navigate]);

  const accColor = a => a >= 80 ? 'var(--success)' : a >= 55 ? 'var(--warning)' : 'var(--danger)';
  const accLabel = a => a >= 80 ? 'Great form!' : a >= 55 ? 'Almost there' : 'Fix your form';

  if (!exercise) return (
    <div className="workout-page">
      <h1 className="page-title">No exercise selected</h1>
      <p className="page-subtitle">Go to the Exercise Library and pick a movement first.</p>
      <button className="btn btn-primary" onClick={() => navigate('/exercises')}>Browse Exercises</button>
    </div>
  );

  return (
    <div className="workout-page">
      <div className="workout-header">
        <div>
          <h1 className="page-title">{exercise.name}</h1>
          <p className="page-subtitle">{exercise.muscleGroup} · {exercise.difficulty}</p>
        </div>
        <div className="workout-controls-top">
          <label className="voice-toggle">
            <input type="checkbox" checked={voiceOn} onChange={e => setVoiceOn(e.target.checked)} />
            <span>Voice coach</span>
          </label>
          {/* Camera selector */}
          <div className="cam-selector-wrap">
            <button className="btn btn-outline cam-sel-btn" onClick={() => setShowCamPicker(p => !p)}>
              📷 {cameras.length > 1 ? 'Change Camera' : 'Camera'}
            </button>
            {showCamPicker && (
              <div className="cam-picker-dropdown">
                <div className="cpd-title">Select Camera Source</div>

                {cameras.length > 0 && (
                  <>
                    <div className="cpd-section">Device cameras</div>
                    {cameras.map((cam, i) => (
                      <button key={cam.deviceId}
                        className={`cpd-item ${selectedCam === cam.deviceId && !useIpCam ? 'active' : ''}`}
                        onClick={() => { setUseIpCam(false); switchCamera(cam.deviceId); }}>
                        <span className="cpd-icon">🎥</span>
                        <div>
                          <div className="cpd-name">{cam.label || `Camera ${i + 1}`}</div>
                          <div className="cpd-sub">{cam.deviceId.slice(0, 20)}…</div>
                        </div>
                        {selectedCam === cam.deviceId && !useIpCam && <span className="cpd-check">✓</span>}
                      </button>
                    ))}
                  </>
                )}

                <div className="cpd-section">IP / Phone camera</div>
                <div className="cpd-ip-row">
                  <input
                    type="url"
                    placeholder="http://192.168.x.x:8080/video"
                    value={ipCamUrl}
                    onChange={e => setIpCamUrl(e.target.value)}
                    className="cpd-ip-input"
                  />
                  <button className="btn btn-primary cpd-connect" onClick={connectIpCam} disabled={!ipCamUrl}>
                    Connect
                  </button>
                </div>
                <div className="cpd-tip">
                  Use an app like <strong>DroidCam</strong> or <strong>IP Webcam</strong> (Android) or
                  <strong> EpocCam</strong> (iPhone) on your phone, then paste the stream URL above.
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/exercises')}>← Change</button>
        </div>
      </div>

      <div className="workout-layout">
        {/* Camera feed */}
        <div className="cam-wrap">
          <video ref={videoRef} className="cam-video" playsInline muted />
          <canvas ref={canvasRef} className="cam-canvas" width={640} height={480} />

          {!camReady && !camError && (
            <div className="cam-overlay">
              <div className="spinner" />
              <p>Starting camera…</p>
            </div>
          )}
          {camReady && !active && !modelLoading && (
            <div className="cam-overlay cam-overlay-ready">
              <p className="cam-hint">Camera ready — press Start Set</p>
            </div>
          )}
          {modelLoading && (
            <div className="cam-overlay">
              <div className="spinner" />
              <p>Loading AI pose model…</p>
            </div>
          )}
          {active && !poseReady && (
            <div className="cam-no-pose">Step into frame — no pose detected</div>
          )}
          {camError && (
            <div className="cam-error-overlay">
              <div className="cam-error-box">
                <div className="cam-error-icon">📷</div>
                <div className="cam-error-title">Camera Unavailable</div>
                <pre className="cam-error-msg">{camError}</pre>
                <div style={{ display:'flex', gap:10, marginTop:16, justifyContent:'center', flexWrap:'wrap' }}>
                  <button className="btn btn-primary" onClick={() => startCamera(selectedCam)}>Retry Camera</button>
                  <button className="btn btn-outline" onClick={() => setShowCamPicker(true)}>Change Camera</button>
                </div>
              </div>
            </div>
          )}

          {/* Live pose metrics overlay (only when active) */}
          {active && poseReady && (
            <div className="cam-live-overlay">
              <div className="clo-badge" style={{ color: accColor(accuracy), borderColor: accColor(accuracy) + '66' }}>
                {accuracy}% form
              </div>
            </div>
          )}
        </div>

        {/* Stats panel */}
        <div className="stats-panel">
          <div className="rep-counter">
            <div className="rep-num" style={{ color:'var(--accent)' }}>{reps}</div>
            <div className="rep-label">reps</div>
            <div className="rep-target">/ {targetReps} target</div>
            {reps >= targetReps && reps > 0 && (
              <div className="rep-done-badge">Target reached! 🎯</div>
            )}
          </div>

          <div className="accuracy-ring-wrap">
            <svg viewBox="0 0 120 120" className="accuracy-ring">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none"
                stroke={accColor(accuracy)} strokeWidth="10"
                strokeDasharray={`${(accuracy / 100) * 314} 314`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{ transition:'stroke-dasharray 0.35s, stroke 0.35s', filter:`drop-shadow(0 0 8px ${accColor(accuracy)})` }}
              />
              <text x="60" y="56" textAnchor="middle" fill={accColor(accuracy)} fontSize="22" fontWeight="800">{accuracy}%</text>
              <text x="60" y="73" textAnchor="middle" fill="var(--text-muted)" fontSize="11">accuracy</text>
            </svg>
            <div className="accuracy-label" style={{ color: accColor(accuracy) }}>
              {active && poseReady ? accLabel(accuracy) : '—'}
            </div>
          </div>

          <div className="feedback-box">
            <div className="fb-title">AI Feedback</div>
            {feedback.length > 0
              ? feedback.map((f, i) => (
                  <div key={i} className="fb-item">
                    <span className="fb-warn-icon">⚠</span> {f}
                  </div>
                ))
              : <div className="fb-empty">
                  {active && poseReady
                    ? <span style={{ color:'var(--success)' }}>✓ Form looks good — keep going!</span>
                    : 'Press Start Set to get AI form feedback'}
                </div>
            }
          </div>

          <div className="target-row">
            <label>Target reps</label>
            <div className="target-controls">
              <button onClick={() => setTargetReps(t => Math.max(1, t - 1))}>−</button>
              <span>{targetReps}</span>
              <button onClick={() => setTargetReps(t => t + 1)}>+</button>
            </div>
          </div>

          <div className="action-btns">
            {!active ? (
              <button className="btn btn-primary action-btn" onClick={handleStart}
                disabled={!camReady || !rules || modelLoading}>
                {modelLoading ? <><span className="btn-spinner" />Loading AI…</> : '▶ Start Set'}
              </button>
            ) : (
              <>
                <button className="btn btn-outline action-btn" onClick={handleLogSet} disabled={reps === 0}>
                  ✓ Log Set ({reps} reps)
                </button>
                <button className="btn btn-danger action-btn" onClick={handleFinish}>
                  ■ Finish Workout
                </button>
              </>
            )}
          </div>

          {sets.length > 0 && (
            <div className="sets-log">
              <div className="fb-title">Completed sets</div>
              {sets.map((s, i) => (
                <div key={i} className="set-row">
                  <span>Set {i + 1}</span>
                  <span>{s.reps} reps</span>
                  <span style={{ color: accColor(s.accuracyScore), fontWeight:700 }}>{s.accuracyScore}%</span>
                </div>
              ))}
              <div className="sets-summary">
                Total: {sets.reduce((a, s) => a + s.reps, 0)} reps ·
                Avg accuracy: {Math.round(sets.reduce((a, s) => a + s.accuracyScore, 0) / sets.length)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}