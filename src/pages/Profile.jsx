
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/workoutApi';
import './Profile.css';

function calcBMR(w, h, age, male) {
  if (!w || !h || !age) return null;
  return male
    ? Math.round(88.362 + 13.397 * w + 4.799 * h - 5.677 * age)
    : Math.round(447.593 + 9.247 * w + 3.098 * h - 4.330 * age);
}
const ACT_MULT = { SEDENTARY:1.2, LIGHT:1.375, MODERATE:1.55, ACTIVE:1.725, VERY_ACTIVE:1.9 };

const DEFAULTS = { male: true, activityLevel: 'MODERATE', experienceLevel: 'BEGINNER', fitnessGoal: 'GENERAL', budgetTier: 'MEDIUM', dietPref: 'NONE' };

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm]   = useState({ ...DEFAULTS, ...user });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState({ text: '', ok: true });
  const [tab, setTab]       = useState('body');

  useEffect(() => {
    if (user) setForm({ ...DEFAULTS, ...user });
  }, [user]);

  const handle = e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
  };

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', ok: true });

    // Payload for backend (only fields it knows about)
    const backendPayload = {
      name:        form.name        || undefined,
      age:         form.age         ? +form.age         : undefined,
      weightKg:    form.weightKg    ? +form.weightKg    : undefined,
      heightCm:    form.heightCm    ? +form.heightCm    : undefined,
      fitnessGoal: form.fitnessGoal || undefined,
      budgetTier:  form.budgetTier  || undefined,
      dietPref:    form.dietPref    || undefined,
      male:        form.male,
    };

    try {
      const res = await userApi.update(backendPayload);
      // Merge backend response with our extended fields
      const merged = {
        ...res.data,
        activityLevel:  form.activityLevel,
        experienceLevel: form.experienceLevel,
        injuryNotes:    form.injuryNotes,
        preferredFoods: form.preferredFoods,
      };
      updateUser(merged);
      setMsg({ text: '✓ Profile saved successfully!', ok: true });
    } catch (err) {
      const detail = err.response?.data?.message || err.message || 'Unknown error';
      setMsg({ text: `✗ Save failed: ${detail}`, ok: false });
    } finally {
      setSaving(false);
    }
  };

  // Live calculations
  const w   = parseFloat(form.weightKg);
  const h   = parseFloat(form.heightCm);
  const age = parseInt(form.age);
  const male = form.male !== false && form.male !== 'false';

  const bmi = w && h ? (w / Math.pow(h / 100, 2)).toFixed(1) : null;
  const bmiCat = !bmi ? '—'
    : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight'
    : bmi < 30   ? 'Overweight'  : 'Obese';
  const bmiColor = !bmi ? 'var(--text-muted)'
    : bmi < 18.5 ? 'var(--accent-2)' : bmi < 25 ? 'var(--success)'
    : bmi < 30   ? 'var(--warning)'  : 'var(--danger)';

  const bmr  = calcBMR(w, h, age, male);
  const tdee = bmr ? Math.round(bmr * (ACT_MULT[form.activityLevel] ?? 1.55)) : null;
  const goalCal = !tdee ? null : { BULK: tdee + 300, CUT: Math.round(tdee * 0.82), RECOMP: tdee, GENERAL: tdee }[form.fitnessGoal] ?? tdee;
  const proteinG = w ? Math.round(w * (form.fitnessGoal === 'CUT' ? 2.5 : 2.2)) : null;

  const tabs = [
    { id:'body',  label:'Body Stats' },
    { id:'goals', label:'Goals & Training' },
    { id:'diet',  label:'Diet Preferences' },
  ];

  return (
    <div className="profile-page">
      <h1 className="page-title">My Profile</h1>
      <p className="page-subtitle">Your data — powers personalised diet plans, workout recommendations and analytics</p>

      <div className="profile-layout">
        {/* Side card */}
        <div className="profile-side">
          <div className="card bmi-card">
            <div className="avatar-lg">{user?.name?.[0]?.toUpperCase() ?? 'U'}</div>
            <div className="profile-name">{user?.name}</div>
            <div className="profile-email">{user?.email}</div>

            {bmi && (
              <div className="bmi-display" style={{ borderColor: bmiColor + '55' }}>
                <div className="bmi-val" style={{ color: bmiColor }}>{bmi}</div>
                <div className="bmi-label" style={{ color: bmiColor }}>{bmiCat}</div>
              </div>
            )}

            <div className="metrics-grid">
              {[
                { v: w    ? `${w}kg`  : '—', l:'Weight' },
                { v: h    ? `${h}cm`  : '—', l:'Height' },
                { v: age  || '—',             l:'Age' },
                { v: male ? 'Male' : 'Female', l:'Gender' },
              ].map(m => (
                <div className="metric-cell" key={m.l}>
                  <div className="mc-val">{m.v}</div>
                  <div className="mc-label">{m.l}</div>
                </div>
              ))}
            </div>

            {tdee && (
              <div className="tdee-block">
                {[
                  { l:'BMR',         v: bmr,      color:'var(--accent-2)' },
                  { l:'TDEE',        v: tdee,     color:'var(--accent)' },
                  { l:'Goal target', v: goalCal,  color:'var(--accent-3)' },
                  { l:'Protein/day', v: proteinG ? `${proteinG}g` : null, color:'var(--success)' },
                ].filter(r => r.v).map(r => (
                  <div className="tdee-row" key={r.l}>
                    <span>{r.l}</span>
                    <span style={{ color: r.color, fontWeight: 700 }}>
                      {typeof r.v === 'number' ? `${r.v} kcal` : r.v}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="exp-badge" data-level={form.experienceLevel ?? 'BEGINNER'}>
              {(form.experienceLevel ?? 'BEGINNER').replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="profile-main">
          {msg.text && (
            <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>
          )}

          <div className="profile-tabs">
            {tabs.map(t => (
              <button key={t.id} className={`ptab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={save} className="card profile-form">

            {/* ── TAB: BODY ── */}
            {tab === 'body' && (
              <>
                <div className="section-label">Personal details</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full name</label>
                    <input type="text" name="name" value={form.name || ''} onChange={handle} required />
                  </div>
                  <div className="form-group">
                    <label>Email (cannot change)</label>
                    <input type="email" value={form.email || ''} disabled style={{ opacity:0.5 }} />
                  </div>
                </div>

                <div className="section-label">Body measurements</div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Age (years)</label>
                    <input type="number" name="age" value={form.age || ''} onChange={handle} min={10} max={100} placeholder="25" />
                  </div>
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" name="weightKg" value={form.weightKg || ''} onChange={handle} step="0.1" min={30} max={300} placeholder="70" />
                  </div>
                  <div className="form-group">
                    <label>Height (cm)</label>
                    <input type="number" name="heightCm" value={form.heightCm || ''} onChange={handle} min={100} max={250} placeholder="175" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <div className="gender-toggle">
                    <button type="button" className={`gtoggle ${male ? 'active' : ''}`} onClick={() => setForm(p => ({ ...p, male: true }))}>Male</button>
                    <button type="button" className={`gtoggle ${!male ? 'active' : ''}`} onClick={() => setForm(p => ({ ...p, male: false }))}>Female</button>
                  </div>
                </div>

                {bmi && (
                  <div className="live-calc-row">
                    <div className="lc-item"><span className="lc-label">BMI</span><span className="lc-val" style={{ color: bmiColor }}>{bmi} – {bmiCat}</span></div>
                    {bmr  && <div className="lc-item"><span className="lc-label">BMR</span><span className="lc-val" style={{ color:'var(--accent-2)' }}>{bmr} kcal</span></div>}
                    {tdee && <div className="lc-item"><span className="lc-label">TDEE</span><span className="lc-val" style={{ color:'var(--accent)' }}>{tdee} kcal</span></div>}
                  </div>
                )}
              </>
            )}

            {/* ── TAB: GOALS ── */}
            {tab === 'goals' && (
              <>
                <div className="section-label">Training preferences</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fitness goal</label>
                    <select name="fitnessGoal" value={form.fitnessGoal || 'GENERAL'} onChange={handle}>
                      <option value="BULK">Bulk — Build muscle mass</option>
                      <option value="CUT">Cut — Lose body fat</option>
                      <option value="RECOMP">Recomp — Lose fat &amp; gain muscle</option>
                      <option value="GENERAL">General — Overall health &amp; fitness</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Experience level</label>
                    <select name="experienceLevel" value={form.experienceLevel || 'BEGINNER'} onChange={handle}>
                      <option value="BEGINNER">Beginner — &lt; 6 months</option>
                      <option value="INTERMEDIATE">Intermediate — 6 months – 2 years</option>
                      <option value="ADVANCED">Advanced — 2+ years consistent</option>
                      <option value="ATHLETE">Athlete — Competitive / sport specific</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Activity level (outside gym)</label>
                    <select name="activityLevel" value={form.activityLevel || 'MODERATE'} onChange={handle}>
                      <option value="SEDENTARY">Sedentary — desk job, little movement</option>
                      <option value="LIGHT">Light — light walks, 1–2x/week</option>
                      <option value="MODERATE">Moderate — 3–5x/week gym</option>
                      <option value="ACTIVE">Active — hard training 6x/week</option>
                      <option value="VERY_ACTIVE">Very Active — 2× daily / physical job</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Budget tier (diet plan)</label>
                    <select name="budgetTier" value={form.budgetTier || 'MEDIUM'} onChange={handle}>
                      <option value="LOW">Low — economy-friendly meals</option>
                      <option value="MEDIUM">Medium — balanced and practical</option>
                      <option value="HIGH">High — premium ingredients</option>
                    </select>
                  </div>
                </div>

                {goalCal && (
                  <div className="live-calc-row">
                    <div className="lc-item"><span className="lc-label">Calorie target</span><span className="lc-val" style={{ color:'var(--accent)' }}>{goalCal} kcal/day</span></div>
                    {proteinG && <div className="lc-item"><span className="lc-label">Protein target</span><span className="lc-val" style={{ color:'var(--success)' }}>{proteinG}g/day</span></div>}
                  </div>
                )}

                <div className="section-label" style={{ marginTop: 24 }}>Injuries / limitations (optional)</div>
                <div className="form-group">
                  <textarea name="injuryNotes" value={form.injuryNotes || ''} onChange={handle} rows={3}
                    placeholder="e.g. Left knee pain, lower back issues, shoulder impingement…"
                    style={{ resize:'vertical' }}
                  />
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Stored locally — used to flag exercises that may aggravate your injury</span>
                </div>
              </>
            )}

            {/* ── TAB: DIET ── */}
            {tab === 'diet' && (
              <>
                <div className="section-label">Dietary style</div>
                <div className="diet-pref-cards">
                  {[
                    { val:'NONE',    icon:'🍽️', label:'No Preference', desc:'All food groups. Most flexible for hitting macros.' },
                    { val:'NON_VEG', icon:'🍗', label:'Non-Vegetarian', desc:'Chicken, fish, eggs, beef — highest protein density.' },
                    { val:'VEG',     icon:'🥚', label:'Vegetarian',     desc:'Eggs, dairy, paneer, lentils — good protein with planning.' },
                    { val:'VEGAN',   icon:'🌱', label:'Vegan',          desc:'Tofu, tempeh, legumes — needs B12 and leucine attention.' },
                  ].map(d => (
                    <div key={d.val}
                      className={`dpref-card ${(form.dietPref || 'NONE') === d.val ? 'active' : ''}`}
                      onClick={() => setForm(p => ({ ...p, dietPref: d.val }))}
                    >
                      <span className="dpref-icon">{d.icon}</span>
                      <div className="dpref-label">{d.label}</div>
                      <div className="dpref-desc">{d.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="section-label" style={{ marginTop: 24 }}>Preferred foods (optional)</div>
                <div className="form-group">
                  <textarea name="preferredFoods" value={form.preferredFoods || ''} onChange={handle} rows={2}
                    placeholder="e.g. rice, eggs, dal, oats, chicken, bananas…"
                    style={{ resize:'vertical' }}
                  />
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Comma-separated foods you prefer — influences your meal plan suggestions</span>
                </div>
              </>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <><span className="btn-spinner" /> Saving…</>
                ) : '💾 Save Profile'}
              </button>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                Updates diet plan &amp; dashboard immediately
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}