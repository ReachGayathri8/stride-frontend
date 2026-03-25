import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initDetector } from '../ai/poseDetection';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { getRulesForExercise, getVoiceCommands } from '../ai/exerciseLogic';
import { sessionApi, exerciseApi } from '../services/workoutApi';
import './WorkoutSession.css';

// ── YouTube tutorial IDs per exercise name ────────────────────────────────────
const TUTORIAL_IDS = {
  'squat':              'aclHkVaku9U',
  'barbell squat':      'aclHkVaku9U',
  'goblet squat':       'CWIQMlSqyMs',
  'front squat':        'uYumuL_G_V0',
  'push up':            'IODxDxX7oi4',
  'push-up':            'IODxDxX7oi4',
  'bicep curl':         'ykJmrZ5v0Oo',
  'hammer curl':        'zC3nLlEvin4',
  'lunge':              '3XDriUn0udo',
  'bulgarian split squat':'2C-uNgKwPLE',
  'deadlift':           'op9kVnSso6Q',
  'romanian deadlift':  'JCXUYuzwNrM',
  'overhead press':     'QAQ64hK4d00',
  'shoulder press':     'qEwKCR5JCog',
  'lat pulldown':       'CAwf7n6Luuc',
  'pull up':            'eGo4IYlbE5g',
  'barbell row':        'G8l_8chR5BE',
  'seated cable row':   'GZbfZ033f74',
  'plank':              'ASdvSXt_9JI',
  'crunch':             'Xyd_fa5zoEU',
  'hanging leg raise':  'hdng3Nm1x_E',
  'russian twist':      '3l5DbJbOGQA',
  'jumping jack':       'c4DAnQ6DtF8',
  'burpee':             'TU8QYVW0gDU',
  'mountain climber':   'nmwgirgXLYM',
  'leg press':          'IZxyjW7SKSA',
  'leg curl':           'Orxowest56U',
  'tricep pushdown':    'vB5OHsJ3EME',
  'skull crusher':      'NIBDMBBwFBQ',
  'dip':                'wjUmnZH528Y',
  'kettlebell swing':   'YSxHifyI6s8',
  'box jump':           'NBY9-kTuHEk',
};

function getTutorialId(exerciseName) {
  const key = (exerciseName || '').toLowerCase().trim();
  if (TUTORIAL_IDS[key]) return TUTORIAL_IDS[key];
  const partialKey = Object.keys(TUTORIAL_IDS).find(k => key.includes(k) || k.includes(key));
  return partialKey ? TUTORIAL_IDS[partialKey] : null;
}

// ── Camera helpers ────────────────────────────────────────────────────────────
async function listCameras() {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(s => s.getTracks().forEach(t => t.stop()));
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter(d => d.kind === 'videoinput');
  } catch { return []; }
}

async function startStream(deviceId) {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId }, width:{ideal:640}, height:{ideal:480} }
      : { facingMode:'user', width:{ideal:640}, height:{ideal:480} },
  });
}

export default function WorkoutSession() {
  const { state }  = useLocation();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);

  const [exercise, setExercise]         = useState(state?.exercise ?? null);
  const [rules,    setRules]            = useState(null);
  const [camReady, setCamReady]         = useState(false);
  const [camError, setCamError]         = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [active,   setActive]           = useState(false);
  const [sessionId, setSessionId]       = useState(null);
  const [sets,     setSets]             = useState([]);
  const [targetReps, setTargetReps]     = useState(12);
  const [voiceOn,  setVoiceOn]          = useState(true);
  const [showVideo, setShowVideo]       = useState(false);

  // Camera selection
  const [cameras,       setCameras]       = useState([]);
  const [selectedCam,   setSelectedCam]   = useState('');
  const [showCamPicker, setShowCamPicker] = useState(false);

  const { reps, accuracy, feedback, poseReady, resetReps } =
    usePoseDetection(videoRef, canvasRef, active ? rules : null, active);

  const tutorialId = exercise ? getTutorialId(exercise.name) : null;
  const voiceCmds  = exercise ? getVoiceCommands(exercise.name) : null;

  // Auto-select first exercise for beginner mode
  useEffect(() => {
    if (!exercise && user?.beginnerMode) {
      exerciseApi.getAll({ difficulty: 'Beginner' })
        .then(r => {
          const first = r.data?.[0];
          if (first) setExercise(first);
        })
        .catch(() => {});
    }
  }, [user]);

  // Load cameras
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

  // Start camera
  const startCamera = useCallback(async (deviceId) => {
    setCamError(''); setCamReady(false);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Browser does not support camera. Please use Chrome or Firefox.'); return;
    }
    try {
      const stream = await startStream(deviceId || undefined);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play()
          .then(() => setCamReady(true)).catch(() => setCamReady(true));
      }
    } catch (err) {
      const msgs = {
        NotAllowedError:     'Camera permission denied.\n\n➊ Click the 🎥 icon in the address bar.\n➋ Choose "Allow".\n➌ Click Retry Camera.',
        NotFoundError:       'No camera found. Please connect a webcam and click Retry.',
        NotReadableError:    'Camera in use by another app (Zoom, Teams…). Close it and Retry.',
        OverconstrainedError:'Selected camera failed. Try a different one.',
      };
      setCamError(msgs[err.name] ?? `Camera error: ${err.message}. Click Retry.`);
    }
  }, []);

  useEffect(() => {
    startCamera(selectedCam);
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  // Exercise-specific voice cues
  const speak = useCallback((text) => {
    if (!voiceOn || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1; u.pitch = 1.0; u.volume = 0.9;
    window.speechSynthesis.speak(u);
  }, [voiceOn]);

  // Speak voice commands on rep completion
  const prevReps = useRef(0);
  useEffect(() => {
    if (!voiceCmds || !active) return;
    if (reps > prevReps.current) {
      const phase = reps % 2 === 0 ? voiceCmds.up : voiceCmds.down;
      speak(phase);
    }
    prevReps.current = reps;
  }, [reps, voiceCmds, active, speak]);

  const handleStart = useCallback(async () => {
    if (!camReady || !rules) return;
    setModelLoading(true);
    try { await initDetector(); } catch (_) {}
    try {
      const res = await sessionApi.start({ exerciseId: exercise?.id });
      setSessionId(res.data?.id ?? 'local');
    } catch { setSessionId('local'); }
    setActive(true); setModelLoading(false); resetReps(); prevReps.current = 0;
    if (voiceCmds) speak(voiceCmds.start);
  }, [camReady, rules, exercise, resetReps, voiceCmds, speak]);

  const handleLogSet = useCallback(async () => {
    if (!active) return;
    const setData = { reps, accuracyScore: accuracy, exerciseId: exercise?.id };
    setSets(prev => [...prev, setData]);
    if (sessionId && sessionId !== 'local') sessionApi.logSet(sessionId, setData).catch(() => {});
    resetReps(); prevReps.current = 0;
    speak(voiceCmds?.setDone ?? 'Set logged!');
  }, [active, reps, accuracy, exercise, sessionId, resetReps, speak, voiceCmds]);

  const handleFinish = useCallback(async () => {
    setActive(false);
    const summary = {
      totalReps: sets.reduce((a, s) => a + s.reps, 0) + reps,
      avgAccuracy: sets.length ? Math.round(sets.reduce((a, s) => a + s.accuracyScore, 0) / sets.length) : accuracy,
      status: 'COMPLETED',
    };
    if (sessionId && sessionId !== 'local') await sessionApi.complete(sessionId, summary).catch(() => {});
    speak(voiceCmds?.finish ?? 'Workout complete. Great job!');
    navigate('/history', { state: { summary } });
  }, [sets, reps, accuracy, sessionId, navigate, speak, voiceCmds]);

  const accColor = a => a >= 80 ? 'var(--success)' : a >= 55 ? 'var(--warning)' : 'var(--danger)';
  const accLabel = a => a >= 80 ? 'Great form!' : a >= 55 ? 'Almost there' : 'Fix your form';

  if (!exercise) return (
    <div className="workout-page">
      {user?.beginnerMode ? (
        <><h1 className="page-title">Loading your recommended exercise…</h1>
          <div className="spinner" style={{ margin:'40px auto' }} /></>
      ) : (
        <><h1 className="page-title">No exercise selected</h1>
          <p className="page-subtitle">Go to the Exercise Library and pick a movement.</p>
          <button className="btn btn-primary" onClick={() => navigate('/exercises')}>Browse Exercises</button></>
      )}
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
          {/* Tutorial video toggle */}
          {tutorialId && (
            <button className="btn btn-outline" onClick={() => setShowVideo(v => !v)}>
              {showVideo ? '📷 Hide Tutorial' : '▶ Tutorial Video'}
            </button>
          )}
          <label className="voice-toggle">
            <input type="checkbox" checked={voiceOn} onChange={e => setVoiceOn(e.target.checked)} />
            <span>Voice coach</span>
          </label>
          {/* Camera picker */}
          <div className="cam-selector-wrap">
            <button className="btn btn-outline cam-sel-btn" onClick={() => setShowCamPicker(p => !p)}>
              📷 {cameras.length > 1 ? 'Change Camera' : 'Camera'}
            </button>
            {showCamPicker && (
              <div className="cam-picker-dropdown">
                <div className="cpd-title">Select Camera</div>
                {cameras.map((cam, i) => (
                  <button key={cam.deviceId}
                    className={`cpd-item ${selectedCam === cam.deviceId ? 'active' : ''}`}
                    onClick={() => { setSelectedCam(cam.deviceId); setShowCamPicker(false); startCamera(cam.deviceId); }}>
                    <span>🎥</span>
                    <div>
                      <div className="cpd-name">{cam.label || `Camera ${i + 1}`}</div>
                    </div>
                    {selectedCam === cam.deviceId && <span style={{ marginLeft:'auto', color:'var(--accent)' }}>✓</span>}
                  </button>
                ))}
                <div className="cpd-tip">
                  Use DroidCam / IP Webcam (Android) or EpocCam (iPhone) to connect your phone camera over Wi-Fi.
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/exercises')}>← Change</button>
        </div>
      </div>

      {/* Tutorial video embed */}
      {showVideo && tutorialId && (
        <div className="tutorial-video-wrap">
          <iframe
            src={`https://www.youtube.com/embed/${tutorialId}?autoplay=0&rel=0&modestbranding=1`}
            title={`${exercise.name} tutorial`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Voice command hints */}
      {voiceCmds && (
        <div className="voice-hints">
          <span className="vh-label">Voice cues:</span>
          <span className="vh-item">Down: <em>"{voiceCmds.down}"</em></span>
          <span className="vh-item">Up: <em>"{voiceCmds.up}"</em></span>
        </div>
      )}

      <div className="workout-layout">
        {/* Camera */}
        <div className="cam-wrap">
          <video ref={videoRef} className="cam-video" playsInline muted />
          <canvas ref={canvasRef} className="cam-canvas" width={640} height={480} />
          {!camReady && !camError && (
            <div className="cam-overlay"><div className="spinner" /><p>Starting camera…</p></div>
          )}
          {camReady && !active && !modelLoading && (
            <div className="cam-overlay cam-overlay-ready">
              <p className="cam-hint">Camera ready — press Start Set</p>
            </div>
          )}
          {modelLoading && (
            <div className="cam-overlay"><div className="spinner" /><p>Loading AI model…</p></div>
          )}
          {active && !poseReady && (
            <div className="cam-no-pose">Step into frame — no pose detected</div>
          )}
          {active && poseReady && (
            <div className="cam-live-overlay">
              <div className="clo-badge" style={{ color: accColor(accuracy), borderColor: accColor(accuracy) + '66' }}>
                {accuracy}% form
              </div>
            </div>
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
              ? feedback.map((f, i) => <div key={i} className="fb-item"><span>⚠</span> {f}</div>)
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
                {modelLoading ? 'Loading AI…' : '▶ Start Set'}
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
                Avg: {Math.round(sets.reduce((a, s) => a + s.accuracyScore, 0) / sets.length)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}