import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../services/workoutApi';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getDashboard()
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const goalLabel = { BULK: 'Bulking', CUT: 'Cutting', RECOMP: 'Recomping', GENERAL: 'General Fitness' };
  const goalColor = { BULK: 'var(--accent)', CUT: 'var(--accent-3)', RECOMP: 'var(--accent-2)', GENERAL: 'var(--success)' };

  // User BMI
  const bmi = user?.weightKg && user?.heightCm
    ? (user.weightKg / Math.pow(user.heightCm / 100, 2)).toFixed(1) : null;
  const bmiLabel = !bmi ? '' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';

  // Placeholder chart data when no real data yet
  const chartAccuracy = stats?.accuracyTrend ?? [
    { date: 'Mon', accuracy: 0 },{ date: 'Tue', accuracy: 0 },{ date: 'Wed', accuracy: 0 },
    { date: 'Thu', accuracy: 0 },{ date: 'Fri', accuracy: 0 },{ date: 'Sat', accuracy: 0 },
    { date: 'Sun', accuracy: 0 },
  ];
  const chartVolume = stats?.volumeTrend ?? [
    { week: 'W1', reps: 0 },{ week: 'W2', reps: 0 },{ week: 'W3', reps: 0 },{ week: 'W4', reps: 0 },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-accent)', borderRadius:8, padding:'8px 14px' }}>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--accent)' }}>
          {payload[0].value}{payload[0].name === 'accuracy' ? '%' : ' reps'}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0] ?? 'Athlete'} 👋</h1>
          <p className="page-subtitle">Here's your personal fitness overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/workout')}>
          ▶ Start Workout
        </button>
      </div>

      {/* Personal info banner */}
      <div className="profile-banner">
        <div className="banner-avatar">{user?.name?.[0]?.toUpperCase() ?? 'A'}</div>
        <div className="banner-info">
          <div className="banner-name">{user?.name}</div>
          <div className="banner-meta">
            {user?.age && <span>{user.age} yrs</span>}
            {user?.weightKg && <span>{user.weightKg} kg</span>}
            {user?.heightCm && <span>{user.heightCm} cm</span>}
            {bmi && <span>BMI {bmi} · {bmiLabel}</span>}
          </div>
        </div>
        <div className="banner-goal" style={{ color: goalColor[user?.fitnessGoal] ?? 'var(--accent)' }}>
          <div className="banner-goal-val">{goalLabel[user?.fitnessGoal] ?? 'Fitness'}</div>
          <div className="banner-goal-label">Current Goal</div>
        </div>
        <div className="banner-goal">
          <div className="banner-goal-val" style={{ color: 'var(--accent-2)' }}>{user?.dietPref ?? 'None'}</div>
          <div className="banner-goal-label">Diet Pref</div>
        </div>
        <div className="banner-goal">
          <div className="banner-goal-val" style={{ color: 'var(--accent-3)' }}>{user?.budgetTier ?? '—'}</div>
          <div className="banner-goal-label">Budget</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        {[
          { label: 'Total Workouts', value: stats?.totalSessions ?? '0',        cls: '' },
          { label: 'Total Reps',     value: stats?.totalReps     ?? '0',        cls: '' },
          { label: 'Avg Accuracy',   value: stats?.avgAccuracy   ? `${stats.avgAccuracy}%` : '0%', cls: 'accent' },
          { label: 'Current Streak', value: stats?.streak        ? `${stats.streak}d` : '0d',      cls: 'blue' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="card chart-card">
          <h3 className="chart-title">Form Accuracy – Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartAccuracy}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="accuracy" stroke="var(--accent)" strokeWidth={2.5}
                dot={{ fill: 'var(--accent)', r: 3, filter: 'drop-shadow(0 0 4px var(--accent))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3 className="chart-title">Weekly Volume (Reps)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartVolume}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="reps" fill="var(--accent)" opacity={0.85} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <h3 className="section-title">Quick Actions</h3>
        <div className="action-grid">
          {[
            { icon: '🏋️', title: 'Browse Exercises', sub: '60+ movements', path: '/exercises', color: 'var(--accent)' },
            { icon: '🥗', title: 'My Diet Plan',      sub: 'Personalised for you', path: '/diet',      color: 'var(--success)' },
            { icon: '📊', title: 'Workout History',   sub: 'All past sessions',    path: '/history',   color: 'var(--accent-2)' },
            { icon: '👤', title: 'Update Profile',    sub: 'Goals & measurements', path: '/profile',   color: 'var(--accent-3)' },
          ].map(a => (
            <button key={a.path} className="action-card" onClick={() => navigate(a.path)}>
              <span className="action-icon" style={{ fontSize: 28 }}>{a.icon}</span>
              <div>
                <div className="action-title" style={{ color: a.color }}>{a.title}</div>
                <div className="action-sub">{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}