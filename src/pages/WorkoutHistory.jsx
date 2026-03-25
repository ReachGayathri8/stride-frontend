import React, { useEffect, useState } from 'react';
import { sessionApi } from '../services/workoutApi';
import './WorkoutHistory.css';

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sort,     setSort]     = useState('newest');
  const [filter,   setFilter]   = useState('ALL');

  useEffect(() => {
    sessionApi.getHistory({ page: 0, size: 50 })
      .then(r => setSessions(r.data?.content ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = iso => !iso ? '—'
    : new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const fmtTime = iso => !iso ? ''
    : new Date(iso).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

  const accColor = a => {
    if (a == null) return 'var(--text-muted)';
    return a >= 80 ? 'var(--success)' : a >= 55 ? 'var(--warning)' : 'var(--danger)';
  };
  const accLabel = a => {
    if (a == null) return '—';
    return a >= 80 ? 'Excellent' : a >= 55 ? 'Good' : 'Needs work';
  };

  const sorted = [...sessions]
    .filter(s => filter === 'ALL' || s.status === filter)
    .sort((a, b) => {
      if (sort === 'newest')   return new Date(b.startedAt) - new Date(a.startedAt);
      if (sort === 'oldest')   return new Date(a.startedAt) - new Date(b.startedAt);
      if (sort === 'accuracy') return (b.avgAccuracy ?? 0) - (a.avgAccuracy ?? 0);
      if (sort === 'reps')     return (b.totalReps   ?? 0) - (a.totalReps   ?? 0);
      return 0;
    });

  const totalSessions = sessions.length;
  const totalReps     = sessions.reduce((s, x) => s + (x.totalReps   ?? 0), 0);
  const totalMins     = sessions.reduce((s, x) => s + (x.durationMin ?? 0), 0);
  const avgAcc        = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + (x.avgAccuracy ?? 0), 0) / sessions.length) : 0;
  const bestAcc       = sessions.length
    ? Math.max(...sessions.map(x => x.avgAccuracy ?? 0)) : 0;

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="history-page">
      <h1 className="page-title">Workout History</h1>
      <p className="page-subtitle">All your past sessions — sorted and filtered</p>

      <div className="history-stats">
        {[
          { label:'Sessions',     value: totalSessions, cls:'' },
          { label:'Total reps',   value: totalReps,     cls:'' },
          { label:'Total time',   value: `${totalMins}m`, cls:'' },
          { label:'Avg accuracy', value: `${avgAcc}%`,  cls:'accent' },
          { label:'Best accuracy',value: `${bestAcc}%`, cls:'blue' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="history-controls">
        <div className="hc-group">
          <span className="hc-label">Sort</span>
          <div className="filter-chips">
            {[['newest','Latest first'],['oldest','Oldest first'],['accuracy','Best accuracy'],['reps','Most reps']].map(([v, l]) => (
              <button key={v} className={`chip ${sort === v ? 'active' : ''}`} onClick={() => setSort(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="hc-group">
          <span className="hc-label">Filter</span>
          <div className="filter-chips">
            {[['ALL','All'],['COMPLETED','Completed'],['IN_PROGRESS','In progress']].map(([v, l]) => (
              <button key={v} className={`chip ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          {sessions.length === 0 ? 'No sessions yet — start your first workout!' : 'No sessions match this filter.'}
        </div>
      ) : (
        <div className="history-list">
          {sorted.map((s, idx) => (
            <div key={s.id ?? idx} className="session-card">
              <div className="session-number">#{idx + 1}</div>
              <div className="session-main">
                <div className="session-exercise">{s.exerciseName ?? 'Unknown'}</div>
                <div className="session-date">
                  {fmtDate(s.startedAt)}
                  {s.startedAt && <span className="session-time"> · {fmtTime(s.startedAt)}</span>}
                </div>
                {s.status && (
                  <span className={`status-pill ${s.status === 'COMPLETED' ? 'completed' : s.status === 'IN_PROGRESS' ? 'inprogress' : 'abandoned'}`}>
                    {s.status === 'COMPLETED' ? '✓ Completed' : s.status === 'IN_PROGRESS' ? '● In progress' : '✗ Abandoned'}
                  </span>
                )}
              </div>
              <div className="session-metrics">
                <div className="sm-item">
                  <div className="sm-val">{s.totalReps ?? '—'}</div>
                  <div className="sm-label">reps</div>
                </div>
                <div className="sm-item">
                  <div className="sm-val">{s.durationMin != null ? `${s.durationMin}m` : '—'}</div>
                  <div className="sm-label">duration</div>
                </div>
                <div className="sm-item">
                  <div className="sm-val" style={{ color: accColor(s.avgAccuracy) }}>
                    {s.avgAccuracy != null ? `${Math.round(s.avgAccuracy)}%` : '—'}
                  </div>
                  <div className="sm-label">accuracy</div>
                </div>
              </div>
              <div className="acc-badge"
                style={{ background: accColor(s.avgAccuracy) + '22', color: accColor(s.avgAccuracy), border:`1px solid ${accColor(s.avgAccuracy)}44` }}>
                {accLabel(s.avgAccuracy)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}