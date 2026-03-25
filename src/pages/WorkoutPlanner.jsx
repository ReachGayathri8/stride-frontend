import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './WorkoutPlanner.css';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const EXERCISE_DB = {
  Strength: {
    Chest:     ['Barbell Bench Press','Incline Bench Press','Dumbbell Fly','Cable Crossover','Dip','Push Up'],
    Back:      ['Deadlift','Pull Up','Barbell Row','Lat Pulldown','Seated Cable Row','Single-Arm DB Row','Face Pull'],
    Shoulders: ['Overhead Press','Dumbbell Lateral Raise','Arnold Press','Upright Row','Front Raise'],
    Legs:      ['Barbell Squat','Romanian Deadlift','Bulgarian Split Squat','Lunge','Leg Press','Leg Curl','Leg Extension','Standing Calf Raise'],
    Arms:      ['Bicep Curl','Hammer Curl','Preacher Curl','Tricep Pushdown','Skull Crusher','Wrist Curl'],
    Core:      ['Plank','Crunch','Hanging Leg Raise','Cable Crunch','Russian Twist','Ab Wheel Rollout','Side Plank'],
  },
  Cardio:  { All:['Jumping Jack','Burpee','Mountain Climber','Box Jump','Jump Rope','Battle Ropes','High Knees'] },
  HIIT:    { All:['Squat Jump','Kettlebell Swing','High Knees','Tuck Jump','Plank to Push Up','Burpee'] },
  Olympic: { All:['Power Clean','Snatch','Clean and Jerk','Hang Power Clean'] },
  Flexibility: { All:['Hip Flexor Stretch','Pigeon Pose','Doorway Chest Stretch','Cat-Cow',"Child's Pose",'Hamstring Stretch'] },
};

const SPLIT_TEMPLATES = {
  'Push / Pull / Legs (PPL)': [
    { name:'Push A',    focus:'Chest, Shoulders, Triceps' },
    { name:'Pull A',    focus:'Back, Biceps' },
    { name:'Legs A',    focus:'Quads, Hamstrings, Calves' },
    { name:'Rest',      focus:'', rest:true },
    { name:'Push B',    focus:'Chest, Shoulders, Triceps' },
    { name:'Pull B',    focus:'Back, Biceps' },
    { name:'Legs B',    focus:'Quads, Glutes, Calves' },
  ],
  'Upper / Lower (4-day)': [
    { name:'Upper A',   focus:'Chest, Back, Shoulders, Arms' },
    { name:'Lower A',   focus:'Quads, Hamstrings, Glutes, Calves' },
    { name:'Rest',      focus:'', rest:true },
    { name:'Upper B',   focus:'Chest, Back, Shoulders, Arms' },
    { name:'Lower B',   focus:'Quads, Hamstrings, Glutes, Calves' },
    { name:'Rest',      focus:'', rest:true },
    { name:'Rest',      focus:'', rest:true },
  ],
  'Bro Split (5-day)': [
    { name:'Chest Day',     focus:'Chest, Triceps' },
    { name:'Back Day',      focus:'Back, Biceps' },
    { name:'Shoulder Day',  focus:'Shoulders, Traps' },
    { name:'Legs Day',      focus:'Quads, Hams, Glutes' },
    { name:'Arms Day',      focus:'Biceps, Triceps, Forearms' },
    { name:'Rest',          focus:'', rest:true },
    { name:'Rest',          focus:'', rest:true },
  ],
  'Full Body (3-day)': [
    { name:'Full Body A', focus:'Compounds + Core' },
    { name:'Rest',        focus:'', rest:true },
    { name:'Full Body B', focus:'Compounds + Cardio' },
    { name:'Rest',        focus:'', rest:true },
    { name:'Full Body C', focus:'Compounds + Accessory' },
    { name:'Rest',        focus:'', rest:true },
    { name:'Rest',        focus:'', rest:true },
  ],
  'Custom': null,
};

function defaultDays() {
  return DAYS.map(d => ({ day: d, name: '', focus: '', rest: false, exercises: [] }));
}

export default function WorkoutPlanner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [template, setTemplate] = useState('');
  const [plan, setPlan]   = useState(defaultDays());
  const [activeDay, setActiveDay] = useState(0);
  const [saved, setSaved] = useState(false);

  // Category / muscle group picker state
  const [pickCat, setPickCat] = useState('Strength');
  const [pickMus, setPickMus] = useState('Chest');

  const applyTemplate = (tName) => {
    setTemplate(tName);
    if (!SPLIT_TEMPLATES[tName]) { setPlan(defaultDays()); return; }
    const tmpl = SPLIT_TEMPLATES[tName];
    setPlan(DAYS.map((d, i) => ({
      day: d,
      name: tmpl[i]?.name || '',
      focus: tmpl[i]?.focus || '',
      rest: tmpl[i]?.rest || false,
      exercises: [],
    })));
  };

  const toggleRestDay = (i) => {
    setPlan(prev => prev.map((d, idx) => idx === i ? { ...d, rest: !d.rest, exercises: [] } : d));
  };

  const addExercise = (exName) => {
    setPlan(prev => prev.map((d, i) => {
      if (i !== activeDay) return d;
      if (d.exercises.find(e => e.name === exName)) return d;
      return { ...d, exercises: [...d.exercises, { name: exName, sets: 3, reps: '8-12', rest: '60s' }] };
    }));
  };

  const removeExercise = (dayIdx, exName) => {
    setPlan(prev => prev.map((d, i) =>
      i === dayIdx ? { ...d, exercises: d.exercises.filter(e => e.name !== exName) } : d
    ));
  };

  const updateExField = (dayIdx, exName, field, val) => {
    setPlan(prev => prev.map((d, i) =>
      i === dayIdx
        ? { ...d, exercises: d.exercises.map(e => e.name === exName ? { ...e, [field]: val } : e) }
        : d
    ));
  };

  const updateDayField = (i, field, val) => {
    setPlan(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  };

  const savePlan = () => {
    localStorage.setItem(`stride_plan_${user?.email}`, JSON.stringify(plan));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const goWorkout = (ex) => navigate('/workout', { state: { exercise: { id: ex.name, name: ex.name } } });

  const curDay = plan[activeDay];
  const muscles = Object.keys(EXERCISE_DB[pickCat] || {});
  const exList  = (EXERCISE_DB[pickCat]?.[pickMus] || EXERCISE_DB[pickCat]?.All || []);

  return (
    <div className="planner-page">
      <h1 className="page-title">Workout Planner</h1>
      <p className="page-subtitle">Build your weekly training split — pick a template or design your own</p>

      {/* Template picker */}
      <div className="template-row">
        <span className="template-label">Split template</span>
        <div className="template-chips">
          {Object.keys(SPLIT_TEMPLATES).map(t => (
            <button key={t} className={`chip ${template === t ? 'active' : ''}`} onClick={() => applyTemplate(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="planner-layout">
        {/* Day selector */}
        <div className="day-sidebar">
          {plan.map((d, i) => (
            <button
              key={d.day}
              className={`day-btn ${activeDay === i ? 'active' : ''} ${d.rest ? 'rest' : ''}`}
              onClick={() => setActiveDay(i)}
            >
              <div className="day-btn-name">{d.day.slice(0,3)}</div>
              <div className="day-btn-label">{d.rest ? 'Rest' : (d.name || '—')}</div>
              {!d.rest && <div className="day-btn-count">{d.exercises.length} ex</div>}
            </button>
          ))}
        </div>

        {/* Day editor */}
        <div className="day-editor">
          <div className="day-editor-header">
            <div>
              <div className="day-editor-day">{curDay.day}</div>
              <input
                className="day-name-input"
                value={curDay.name}
                onChange={e => updateDayField(activeDay, 'name', e.target.value)}
                placeholder="e.g. Push Day, Chest & Back, Leg Day…"
              />
              {!curDay.rest && (
                <input
                  className="day-focus-input"
                  value={curDay.focus}
                  onChange={e => updateDayField(activeDay, 'focus', e.target.value)}
                  placeholder="Focus: e.g. Chest, Shoulders, Triceps"
                />
              )}
            </div>
            <button
              className={`btn ${curDay.rest ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => toggleRestDay(activeDay)}
            >
              {curDay.rest ? '+ Add Training' : '🛌 Set as Rest Day'}
            </button>
          </div>

          {curDay.rest ? (
            <div className="rest-message">
              <div style={{ fontSize: 48 }}>😴</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Rest & Recover</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>Growth happens when you rest. Light walking or stretching is fine.</div>
            </div>
          ) : (
            <>
              {/* Planned exercises */}
              <div className="planned-exercises">
                <div className="pe-header">
                  <span className="pe-title">Planned exercises ({curDay.exercises.length})</span>
                  {curDay.exercises.length > 0 && (
                    <button className="btn btn-primary" style={{ fontSize:12, padding:'6px 14px' }}
                      onClick={() => goWorkout(curDay.exercises[0])}>
                      ▶ Start Today's Workout
                    </button>
                  )}
                </div>
                {curDay.exercises.length === 0 ? (
                  <div className="pe-empty">Add exercises from the library below</div>
                ) : (
                  <div className="pe-list">
                    {curDay.exercises.map((ex, ei) => (
                      <div key={ex.name} className="pe-row">
                        <div className="pe-num">{ei + 1}</div>
                        <div className="pe-exname">{ex.name}</div>
                        <div className="pe-fields">
                          <div className="pe-field">
                            <span>Sets</span>
                            <input type="number" value={ex.sets} min={1} max={10}
                              onChange={e => updateExField(activeDay, ex.name, 'sets', +e.target.value)} />
                          </div>
                          <div className="pe-field">
                            <span>Reps</span>
                            <input type="text" value={ex.reps}
                              onChange={e => updateExField(activeDay, ex.name, 'reps', e.target.value)} />
                          </div>
                          <div className="pe-field">
                            <span>Rest</span>
                            <input type="text" value={ex.rest}
                              onChange={e => updateExField(activeDay, ex.name, 'rest', e.target.value)} />
                          </div>
                        </div>
                        <button className="pe-start" onClick={() => goWorkout(ex)}>▶</button>
                        <button className="pe-remove" onClick={() => removeExercise(activeDay, ex.name)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exercise library picker */}
              <div className="ex-picker">
                <div className="exp-header">Add exercises</div>
                <div className="exp-cats">
                  {Object.keys(EXERCISE_DB).map(cat => (
                    <button key={cat} className={`chip ${pickCat === cat ? 'active' : ''}`}
                      onClick={() => { setPickCat(cat); setPickMus(Object.keys(EXERCISE_DB[cat])[0]); }}>
                      {cat}
                    </button>
                  ))}
                </div>
                {muscles.length > 1 && (
                  <div className="exp-muscles">
                    {muscles.map(m => (
                      <button key={m} className={`chip small-chip ${pickMus === m ? 'active' : ''}`}
                        onClick={() => setPickMus(m)}>{m}</button>
                    ))}
                  </div>
                )}
                <div className="exp-list">
                  {exList.map(ex => {
                    const added = curDay.exercises.find(e => e.name === ex);
                    return (
                      <button key={ex}
                        className={`exp-item ${added ? 'added' : ''}`}
                        onClick={() => !added && addExercise(ex)}
                      >
                        <span>{ex}</span>
                        <span className="exp-add">{added ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="planner-footer">
        <button className="btn btn-primary" onClick={savePlan}>
          {saved ? '✓ Saved!' : '💾 Save Workout Plan'}
        </button>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>Saved locally to your browser</span>
      </div>
    </div>
  );
}