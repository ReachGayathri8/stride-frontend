import React, { useEffect, useState } from 'react';
import { sessionApi } from '../services/workoutApi';
import './WorkoutHistory.css';

const DEMO_HISTORY = [
  { id:'1', exerciseName:'Squat',      totalReps:48, avgAccuracy:84, startedAt:'2025-03-20T09:00:00', durationMin:22 },
  { id:'2', exerciseName:'Push Up',    totalReps:60, avgAccuracy:78, startedAt:'2025-03-19T17:30:00', durationMin:18 },
  { id:'3', exerciseName:'Bicep Curl', totalReps:36, avgAccuracy:91, startedAt:'2025-03-18T08:45:00', durationMin:15 },
  { id:'4', exerciseName:'Lunge',      totalReps:40, avgAccuracy:76, startedAt:'2025-03-16T10:00:00', durationMin:20 },
  { id:'5', exerciseName:'Squat',      totalReps:52, avgAccuracy:88, startedAt:'2025-03-15T09:15:00', durationMin:24 },
];

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    sessionApi.getHistory()
      .then(r => setSessions(r.data?.content?.length ? r.data.content : DEMO_HISTORY))
      .catch(() => setSessions(DEMO_HISTORY))
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = iso => new Date(iso).toLocaleDateString('en-IN',{ day:'numeric', month:'short', year:'numeric' });
  const fmtTime = iso => new Date(iso).toLocaleTimeString('en-IN',{ hour:'2-digit', minute:'2-digit' });
  const accColor = a => a >= 80 ? '#00ff87' : a >= 55 ? '#ffa502' : '#ff4757';

  const totalSessions = sessions.length;
  const totalReps     = sessions.reduce((a,s) => a + (s.totalReps||0), 0);
  const avgAcc        = sessions.length
    ? Math.round(sessions.reduce((a,s) => a + (s.avgAccuracy||0), 0) / sessions.length)
    : 0;

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner"/></div>;

  return (
    <div className="history-page">
      <h1 className="page-title">Workout History</h1>
      <p className="page-subtitle">Your past sessions and performance trends</p>

      <div className="history-stats">
        <div className="stat-card"><div className="stat-label">Total sessions</div><div className="stat-value">{totalSessions}</div></div>
        <div className="stat-card"><div className="stat-label">Total reps</div><div className="stat-value">{totalReps}</div></div>
        <div className="stat-card"><div className="stat-label">Avg accuracy</div><div className="stat-value accent">{avgAcc}%</div></div>
      </div>

      <div className="history-list">
        {sessions.map(s => (
          <div key={s.id} className="session-card">
            <div className="session-left">
              <div className="session-exercise">{s.exerciseName}</div>
              <div className="session-date">{fmtDate(s.startedAt)} · {fmtTime(s.startedAt)}</div>
            </div>
            <div className="session-right">
              <div className="session-stat">
                <div className="s-val">{s.totalReps}</div>
                <div className="s-label">reps</div>
              </div>
              <div className="session-stat">
                <div className="s-val">{s.durationMin}m</div>
                <div className="s-label">duration</div>
              </div>
              <div className="session-stat">
                <div className="s-val" style={{color: accColor(s.avgAccuracy)}}>{s.avgAccuracy}%</div>
                <div className="s-label">accuracy</div>
              </div>
              <div className="acc-badge" style={{ background: `${accColor(s.avgAccuracy)}22`, color: accColor(s.avgAccuracy), border:`1px solid ${accColor(s.avgAccuracy)}44` }}>
                {s.avgAccuracy >= 80 ? 'Excellent' : s.avgAccuracy >= 55 ? 'Good' : 'Needs work'}
              </div>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="empty-state">No sessions yet. Start your first workout! 💪</div>
        )}
      </div>
    </div>
  );
}
