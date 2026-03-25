import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exerciseApi } from '../services/workoutApi';
import './ExerciseSelector.css';

const CATEGORIES   = ['All','Strength','Cardio','Core','Flexibility','HIIT','Olympic'];
const DIFFICULTIES = ['All','Beginner','Intermediate','Advanced'];

const ALL_EXERCISES = [
  // STRENGTH - LEGS
  { id:'1',  name:'Barbell Squat',        category:'Strength', muscleGroup:'Quads / Glutes',   difficulty:'Intermediate', description:'King of all leg exercises. Full-depth back squat loading quads, glutes, hamstrings and core.' },
  { id:'2',  name:'Front Squat',          category:'Strength', muscleGroup:'Quads',            difficulty:'Advanced',     description:'Barbell rests on front delts. Demands more upright torso and ankle mobility than back squat.' },
  { id:'3',  name:'Goblet Squat',         category:'Strength', muscleGroup:'Quads / Glutes',   difficulty:'Beginner',     description:'Dumbbell or kettlebell held at chest. Perfect first squat pattern for beginners.' },
  { id:'4',  name:'Leg Press',            category:'Strength', muscleGroup:'Quads / Glutes',   difficulty:'Beginner',     description:'Machine press for quads and glutes. Easy to load heavy with less spinal stress.' },
  { id:'5',  name:'Romanian Deadlift',    category:'Strength', muscleGroup:'Hamstrings',       difficulty:'Intermediate', description:'Hip-hinge with soft knees. Best isolation for hamstrings and glutes.' },
  { id:'6',  name:'Bulgarian Split Squat',category:'Strength', muscleGroup:'Quads / Glutes',   difficulty:'Intermediate', description:'Rear foot elevated. Brutal unilateral leg developer targeting quads and glutes.' },
  { id:'7',  name:'Lunge',                category:'Strength', muscleGroup:'Legs',             difficulty:'Beginner',     description:'Walking or static lunge. Builds balance, stability, and unilateral leg strength.' },
  { id:'8',  name:'Leg Curl',             category:'Strength', muscleGroup:'Hamstrings',       difficulty:'Beginner',     description:'Machine or dumbbell curl isolating the hamstrings through full range of motion.' },
  { id:'9',  name:'Leg Extension',        category:'Strength', muscleGroup:'Quads',            difficulty:'Beginner',     description:'Machine isolation for the quadriceps. Great for VMO activation and knee rehab.' },
  { id:'10', name:'Standing Calf Raise',  category:'Strength', muscleGroup:'Calves',           difficulty:'Beginner',     description:'Calf isolation through full dorsiflexion to plantarflexion range.' },
  { id:'11', name:'Sumo Deadlift',        category:'Strength', muscleGroup:'Glutes / Adductors',difficulty:'Intermediate',description:'Wide stance deadlift shifting load to inner thighs, glutes and lower back.' },
  // STRENGTH - CHEST
  { id:'12', name:'Barbell Bench Press',  category:'Strength', muscleGroup:'Chest',            difficulty:'Intermediate', description:'Flat bench barbell press. The definitive chest compound movement.' },
  { id:'13', name:'Incline Bench Press',  category:'Strength', muscleGroup:'Upper Chest',      difficulty:'Intermediate', description:'30-45° incline targets the clavicular head of the pectoralis major.' },
  { id:'14', name:'Dumbbell Fly',         category:'Strength', muscleGroup:'Chest',            difficulty:'Beginner',     description:'Wide arc stretch and squeeze isolating the pectoral fibres.' },
  { id:'15', name:'Push Up',              category:'Strength', muscleGroup:'Chest / Triceps',  difficulty:'Beginner',     description:'Bodyweight press. Great chest, shoulder and tricep developer requiring no equipment.' },
  { id:'16', name:'Cable Crossover',      category:'Strength', muscleGroup:'Chest',            difficulty:'Intermediate', description:'Constant tension throughout the movement. Best for inner-chest definition.' },
  { id:'17', name:'Dip',                  category:'Strength', muscleGroup:'Chest / Triceps',  difficulty:'Intermediate', description:'Parallel bar dip. Lean forward for chest emphasis, upright for triceps.' },
  // STRENGTH - BACK
  { id:'18', name:'Deadlift',             category:'Strength', muscleGroup:'Full Back',        difficulty:'Advanced',     description:'The ultimate posterior chain movement. Loads every muscle on the back of your body.' },
  { id:'19', name:'Pull Up',              category:'Strength', muscleGroup:'Lats',             difficulty:'Intermediate', description:'Bodyweight vertical pull. Wide grip targets lats, narrow grip hits biceps more.' },
  { id:'20', name:'Barbell Row',          category:'Strength', muscleGroup:'Upper Back',       difficulty:'Intermediate', description:'Bent-over row. Hits rhomboids, traps, lats and rear delts.' },
  { id:'21', name:'Lat Pulldown',         category:'Strength', muscleGroup:'Lats',             difficulty:'Beginner',     description:'Cable lat pulldown. Great for learning the lat pull pattern before pull-ups.' },
  { id:'22', name:'Seated Cable Row',     category:'Strength', muscleGroup:'Mid Back',         difficulty:'Beginner',     description:'Horizontal cable pull targeting mid-traps and rhomboids.' },
  { id:'23', name:'Single-Arm DB Row',    category:'Strength', muscleGroup:'Lats / Rhomboids', difficulty:'Beginner',     description:'Unilateral dumbbell row allowing greater range of motion and core stability.' },
  { id:'24', name:'Face Pull',            category:'Strength', muscleGroup:'Rear Delts / Traps',difficulty:'Beginner',   description:'Cable pull to face. Best rear delt and external rotator cuff exercise.' },
  // STRENGTH - SHOULDERS
  { id:'25', name:'Overhead Press',       category:'Strength', muscleGroup:'Shoulders',        difficulty:'Intermediate', description:'Standing barbell press. Best mass builder for the anterior and medial deltoids.' },
  { id:'26', name:'Dumbbell Lateral Raise',category:'Strength',muscleGroup:'Side Delts',       difficulty:'Beginner',     description:'Side raise isolating the medial deltoid. Key for shoulder width.' },
  { id:'27', name:'Arnold Press',         category:'Strength', muscleGroup:'Shoulders',        difficulty:'Intermediate', description:'Rotating dumbbell press invented by Schwarzenegger. Hits all three deltoid heads.' },
  { id:'28', name:'Upright Row',          category:'Strength', muscleGroup:'Traps / Delts',    difficulty:'Intermediate', description:'Bar or cable pull to chin targeting upper traps and medial delts.' },
  // STRENGTH - ARMS
  { id:'29', name:'Bicep Curl',           category:'Strength', muscleGroup:'Biceps',           difficulty:'Beginner',     description:'Classic curl. Keep elbows pinned to sides and achieve full supination at the top.' },
  { id:'30', name:'Hammer Curl',          category:'Strength', muscleGroup:'Biceps / Forearms',difficulty:'Beginner',     description:'Neutral grip curl. Targets the brachialis and brachioradialis.' },
  { id:'31', name:'Tricep Pushdown',      category:'Strength', muscleGroup:'Triceps',          difficulty:'Beginner',     description:'Cable pushdown isolating all three tricep heads. Squeeze hard at lockout.' },
  { id:'32', name:'Skull Crusher',        category:'Strength', muscleGroup:'Triceps',          difficulty:'Intermediate', description:'EZ-bar extension to forehead. Excellent long head tricep isolator.' },
  { id:'33', name:'Preacher Curl',        category:'Strength', muscleGroup:'Biceps',           difficulty:'Beginner',     description:'Arm braced on preacher pad eliminating cheating. Perfect peak contraction.' },
  { id:'34', name:'Wrist Curl',           category:'Strength', muscleGroup:'Forearms',         difficulty:'Beginner',     description:'Forearm flexion building grip strength and wrist size.' },
  // CORE
  { id:'35', name:'Plank',                category:'Core',     muscleGroup:'Core',             difficulty:'Beginner',     description:'Isometric hold bracing transverse abdominis, obliques and spinal erectors.' },
  { id:'36', name:'Crunch',               category:'Core',     muscleGroup:'Abs',              difficulty:'Beginner',     description:'Spinal flexion isolating the rectus abdominis. Short range, high contraction.' },
  { id:'37', name:'Hanging Leg Raise',    category:'Core',     muscleGroup:'Lower Abs',        difficulty:'Intermediate', description:'Bar hang. Raise legs to 90°+ for maximum lower ab and hip flexor activation.' },
  { id:'38', name:'Cable Crunch',         category:'Core',     muscleGroup:'Abs',              difficulty:'Beginner',     description:'Weighted crunch using cable machine. Allows progressive overload of the core.' },
  { id:'39', name:'Russian Twist',        category:'Core',     muscleGroup:'Obliques',         difficulty:'Beginner',     description:'Rotational core exercise. Add a plate or medicine ball for extra resistance.' },
  { id:'40', name:'Ab Wheel Rollout',     category:'Core',     muscleGroup:'Full Core',        difficulty:'Advanced',     description:'Extends core from a kneeling position. Extremely demanding on anti-extension strength.' },
  { id:'41', name:'Side Plank',           category:'Core',     muscleGroup:'Obliques',         difficulty:'Beginner',     description:'Lateral plank targeting the obliques and quadratus lumborum.' },
  { id:'42', name:'Dragon Flag',          category:'Core',     muscleGroup:'Full Core',        difficulty:'Advanced',     description:'Advanced Schwarzenegger-invented movement. Full body lowering from shoulders.' },
  // CARDIO
  { id:'43', name:'Jumping Jack',         category:'Cardio',   muscleGroup:'Full Body',        difficulty:'Beginner',     description:'Classic warm-up movement. Raises heart rate and improves coordination.' },
  { id:'44', name:'Burpee',               category:'Cardio',   muscleGroup:'Full Body',        difficulty:'Intermediate', description:'Squat-thrust-jump combination. Maximum metabolic demand with zero equipment.' },
  { id:'45', name:'Mountain Climber',     category:'Cardio',   muscleGroup:'Core / Cardio',    difficulty:'Beginner',     description:'Running-in-place in plank position. Elevates heart rate while building core.' },
  { id:'46', name:'Box Jump',             category:'Cardio',   muscleGroup:'Legs / Power',     difficulty:'Intermediate', description:'Explosive jump onto a box. Develops fast-twitch power and cardiovascular fitness.' },
  { id:'47', name:'Jump Rope',            category:'Cardio',   muscleGroup:'Full Body',        difficulty:'Beginner',     description:'High-efficiency cardio developing coordination, calf strength and endurance.' },
  { id:'48', name:'Battle Ropes',         category:'Cardio',   muscleGroup:'Shoulders / Core', difficulty:'Intermediate', description:'Alternating or simultaneous rope waves. Brutal upper-body cardio.' },
  // HIIT
  { id:'49', name:'Squat Jump',           category:'HIIT',     muscleGroup:'Legs / Power',     difficulty:'Intermediate', description:'Explosive squat variation. Maximum power output and metabolic stress.' },
  { id:'50', name:'Kettlebell Swing',     category:'HIIT',     muscleGroup:'Posterior Chain',  difficulty:'Intermediate', description:'Hip-hinge power movement. Great for glutes, hamstrings and cardiovascular fitness.' },
  { id:'51', name:'High Knees',           category:'HIIT',     muscleGroup:'Full Body',        difficulty:'Beginner',     description:'Fast-paced running in place with maximum knee drive. High heart rate stimulus.' },
  { id:'52', name:'Tuck Jump',            category:'HIIT',     muscleGroup:'Full Body',        difficulty:'Intermediate', description:'Jump and pull knees to chest. Explosive plyometric developing power and coordination.' },
  { id:'53', name:'Plank to Push Up',     category:'HIIT',     muscleGroup:'Chest / Core',     difficulty:'Intermediate', description:'Alternate between forearm plank and push-up position. Core and pushing endurance.' },
  // OLYMPIC
  { id:'54', name:'Power Clean',          category:'Olympic',  muscleGroup:'Full Body',        difficulty:'Advanced',     description:'Barbell pulled explosively from floor to front rack. Develops total-body power.' },
  { id:'55', name:'Snatch',               category:'Olympic',  muscleGroup:'Full Body',        difficulty:'Advanced',     description:'Single movement from floor to overhead lockout. The most technically demanding lift.' },
  { id:'56', name:'Clean and Jerk',       category:'Olympic',  muscleGroup:'Full Body',        difficulty:'Advanced',     description:'Two-phase Olympic lift. World-record holders move over 260kg.' },
  { id:'57', name:'Hang Power Clean',     category:'Olympic',  muscleGroup:'Full Body',        difficulty:'Intermediate', description:'Clean starting from the hang position. Great introduction to Olympic lifting.' },
  // FLEXIBILITY
  { id:'58', name:'Hip Flexor Stretch',   category:'Flexibility',muscleGroup:'Hips',           difficulty:'Beginner',     description:'Kneeling lunge stretch. Counteracts tightness from prolonged sitting.' },
  { id:'59', name:'Pigeon Pose',          category:'Flexibility',muscleGroup:'Hips / Glutes',  difficulty:'Intermediate', description:'Deep hip opener targeting piriformis and hip external rotators.' },
  { id:'60', name:'Doorway Chest Stretch',category:'Flexibility',muscleGroup:'Chest / Shoulder',difficulty:'Beginner',   description:'Arms against doorframe, step through. Opens anterior shoulders and pecs.' },
];

export default function ExerciseSelector() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState('All');
  const [difficulty, setDiff]     = useState('All');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    exerciseApi.getAll()
      .then(r => {
        const backendData = r.data;
        if (backendData?.length >= 5) {
          // Backend has data — merge with our full list (add anything missing)
          const backendNames = new Set(backendData.map(e => e.name.toLowerCase()));
          const extras = ALL_EXERCISES.filter(e => !backendNames.has(e.name.toLowerCase()));
          setExercises([...backendData, ...extras]);
        } else {
          setExercises(ALL_EXERCISES);
        }
      })
      .catch(() => setExercises(ALL_EXERCISES))
      .finally(() => setLoading(false));
  }, []);

  const filtered = exercises.filter(e => {
    const matchCat  = category === 'All' || e.category === category;
    const matchDiff = difficulty === 'All' || e.difficulty === difficulty;
    const matchSrch = e.name.toLowerCase().includes(search.toLowerCase()) ||
                      (e.muscleGroup ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchDiff && matchSrch;
  });

  const startWorkout = (ex) => navigate('/workout', { state: { exercise: ex } });

  const diffColor = d => ({
    Beginner: 'var(--success)',
    Intermediate: 'var(--warning)',
    Advanced: 'var(--danger)',
  }[d] ?? 'var(--text-muted)');

  const catColor = c => ({
    Strength: 'var(--accent)',
    Cardio: 'var(--accent-3)',
    Core: 'var(--accent-2)',
    Flexibility: 'var(--success)',
    HIIT: 'var(--warning)',
    Olympic: '#f59e0b',
  }[c] ?? 'var(--text-muted)');

  return (
    <div className="exercise-page">
      <h1 className="page-title">Exercise Library</h1>
      <p className="page-subtitle">{exercises.length} exercises · Select one to start your AI-tracked session</p>

      <div className="exercise-filters">
        <input
          type="text"
          placeholder="Search exercises or muscle groups…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="filter-chips">
          {CATEGORIES.map(c => (
            <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <div className="filter-chips">
          {DIFFICULTIES.map(d => (
            <button key={d} className={`chip diff-chip ${difficulty === d ? 'active' : ''}`} onClick={() => setDiff(d)}>{d}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <p className="results-count">{filtered.length} results</p>
          <div className="exercise-grid">
            {filtered.map(ex => (
              <div key={ex.id} className="exercise-card">
                <div className="ex-cat-bar" style={{ background: catColor(ex.category) }} />
                <div className="ex-header">
                  <div>
                    <h3 className="ex-name">{ex.name}</h3>
                    <span className="ex-muscle">{ex.muscleGroup}</span>
                  </div>
                  <span className="ex-diff" style={{ color: diffColor(ex.difficulty) }}>
                    {ex.difficulty}
                  </span>
                </div>
                <p className="ex-desc">{ex.description}</p>
                <div className="ex-footer">
                  <span className="badge badge-accent" style={{ color: catColor(ex.category), borderColor: catColor(ex.category) + '44' }}>{ex.category}</span>
                  <button className="btn btn-primary ex-btn" onClick={() => startWorkout(ex)}>
                    Start ▶
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="empty-state">No exercises match your filters. Try a different category.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}