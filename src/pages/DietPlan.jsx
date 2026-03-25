import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './DietPlan.css';

// ─── Macro engine ────────────────────────────────────────────────────────────
function calcMacros(user, overrides = {}) {
  const w    = parseFloat(overrides.weightKg  ?? user?.weightKg)  || 70;
  const h    = parseFloat(overrides.heightCm  ?? user?.heightCm)  || 170;
  const age  = parseInt(overrides.age         ?? user?.age)       || 25;
  const male = (overrides.male ?? user?.male) !== false;
  const goal = overrides.goal  ?? user?.fitnessGoal  ?? 'GENERAL';
  const actv = overrides.actv  ?? user?.activityLevel ?? 'MODERATE';
  const diet = overrides.diet  ?? user?.dietPref      ?? 'NONE';
  const bgt  = overrides.bgt   ?? user?.budgetTier    ?? 'MEDIUM';

  const bmr  = male
    ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * age
    : 447.593 + 9.247 * w + 3.098 * h - 4.330 * age;
  const mult = { SEDENTARY:1.2, LIGHT:1.375, MODERATE:1.55, ACTIVE:1.725, VERY_ACTIVE:1.9 }[actv] ?? 1.55;
  const tdee = Math.round(bmr * mult);
  const calMap = { BULK: tdee + 350, CUT: Math.round(tdee * 0.80), RECOMP: tdee, GENERAL: tdee };
  const calories = calMap[goal] ?? tdee;
  const proteinPerKg = goal === 'CUT' ? 2.5 : goal === 'BULK' ? 2.4 : 2.0;
  const proteinG = Math.round(w * proteinPerKg);
  const fatG     = Math.round((calories * 0.25) / 9);
  const carbsG   = Math.round((calories - proteinG * 4 - fatG * 9) / 4);

  return { tdee, calories, proteinG, carbsG, fatG, bmr: Math.round(bmr), goal, diet, bgt, w };
}

// ─── Food database keyed by (diet × budget) ─────────────────────────────────
const FOODS = {
  protein: {
    NON_VEG: {
      LOW:    ['Eggs x3','Canned tuna 130g','Chicken thigh 160g','Whole milk 300ml'],
      MEDIUM: ['Chicken breast 180g','Eggs x3','Greek yogurt 200g','Canned salmon 130g'],
      HIGH:   ['Grilled salmon 180g','Egg whites x4 + 2 whole eggs','Whey isolate 30g','Turkey breast 170g'],
    },
    VEG: {
      LOW:    ['Boiled eggs x3','Curd 250g','Peanut butter 2 tbsp','Soya chunks 60g dry'],
      MEDIUM: ['Paneer 150g','Greek yogurt 200g','Eggs x3','Tofu 150g'],
      HIGH:   ['Paneer 200g','Whey protein 30g','Cottage cheese 200g','Egg whites x4'],
    },
    VEGAN: {
      LOW:    ['Soya chunks 60g dry','Peanut butter 2 tbsp','Lentils 100g dry','Chickpeas 100g dry'],
      MEDIUM: ['Tofu 200g','Tempeh 100g','Pea protein 30g','Edamame 150g'],
      HIGH:   ['Organic tempeh 150g','Pea isolate 30g','Hemp seeds 3 tbsp','Edamame 200g'],
    },
    NONE: {
      LOW:    ['Eggs x3','Canned tuna 130g','Curd 250g','Peanut butter 2 tbsp'],
      MEDIUM: ['Chicken breast 180g','Paneer 150g','Greek yogurt 200g','Eggs x3'],
      HIGH:   ['Salmon 180g','Chicken breast 200g','Whey protein 30g','Eggs x3'],
    },
  },
  carbs: {
    CUT:     ['Sweet potato 130g','Brown rice 70g cooked','Oats 40g','Quinoa 60g cooked'],
    BULK:    ['White rice 160g cooked','Oats 70g','Banana x2','Whole wheat bread 3 slices','Sweet potato 200g'],
    GENERAL: ['Brown rice 100g cooked','Oats 55g','Banana','Sweet potato 150g'],
    RECOMP:  ['Brown rice 100g cooked','Oats 55g','Quinoa 80g cooked','Sweet potato 150g'],
  },
  fat: ['Olive oil 1 tbsp','Almonds 25g','Avocado ½','Peanut butter 1 tbsp','Walnuts 20g','Flaxseeds 1 tbsp'],
  veg: ['Broccoli 150g steamed','Spinach 100g sautéed','Mixed salad 100g','Capsicum + onion 80g','Cucumber + tomato 120g'],
};

function pick(arr, n = 1) { return arr.slice(0, n); }

// ─── Meal schedule builder ───────────────────────────────────────────────────
function buildMeals(macros, pref = {}) {
  const { goal, diet, bgt, w, calories, proteinG } = macros;
  const dietKey = ['NON_VEG','VEG','VEGAN'].includes(diet) ? diet : 'NONE';
  const bgtKey  = ['LOW','MEDIUM','HIGH'].includes(bgt) ? bgt : 'MEDIUM';
  const carbKey = ['CUT','BULK','RECOMP'].includes(goal) ? goal : 'GENERAL';

  const P = FOODS.protein[dietKey][bgtKey];
  const C = FOODS.carbs[carbKey];
  const F = FOODS.fat;
  const V = FOODS.veg;

  const preferred = (pref.preferredFoods || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

  // If user has preferred foods, prepend matching items
  const maybePrefer = (list) => {
    if (!preferred.length) return list;
    const boosted = list.filter(item => preferred.some(p => item.toLowerCase().includes(p)));
    const rest    = list.filter(item => !preferred.some(p => item.toLowerCase().includes(p)));
    return [...boosted, ...rest];
  };

  const pSrc = maybePrefer(P);
  const cSrc = maybePrefer(C);

  const meals = [
    {
      meal:'Breakfast', icon:'🌅',
      items: [...pick(cSrc, 1), ...pick(pSrc, 1), ...pick(F, 1), goal === 'BULK' ? 'OJ or fruit juice 200ml' : 'Green tea or black coffee'],
      cal: Math.round(calories * 0.25), prot: Math.round(proteinG * 0.25),
    },
    {
      meal:'Mid-Morning', icon:'🍎',
      items: goal === 'CUT'
        ? [...pick(pSrc.slice(1), 1), 'Apple or pear (medium)', 'Water 500ml']
        : [...pick(pSrc.slice(1), 1), ...pick(cSrc.slice(1), 1), 'Water 500ml'],
      cal: Math.round(calories * 0.12), prot: Math.round(proteinG * 0.12),
    },
    {
      meal:'Lunch', icon:'☀️',
      items: [...pick(pSrc.slice(2), 1), ...pick(cSrc.slice(2), 1), ...pick(V, 2), ...pick(F.slice(1), 1)],
      cal: Math.round(calories * 0.30), prot: Math.round(proteinG * 0.30),
    },
    {
      meal:'Pre-Workout', icon:'⚡',
      items: goal === 'BULK'
        ? ['Banana', 'Rice cakes x3', ...pick(pSrc.slice(3), 1)]
        : ['Apple', 'Black coffee (optional)', ...pick(pSrc.slice(3), 1)],
      cal: Math.round(calories * 0.10), prot: Math.round(proteinG * 0.10),
    },
    {
      meal:'Dinner', icon:'🌙',
      items: [...pick(pSrc.slice(1), 1), goal === 'CUT' ? 'Cauliflower rice 200g' : pick(cSrc.slice(1), 1)[0], ...pick(V.slice(2), 2), ...pick(F.slice(2), 1)],
      cal: Math.round(calories * 0.23), prot: Math.round(proteinG * 0.23),
    },
  ];

  if (goal === 'BULK') {
    meals.push({
      meal:'Before Bed', icon:'🌜',
      items: dietKey === 'VEGAN' ? ['Soy protein shake 30g', 'Peanut butter 1 tbsp'] : ['Casein or slow protein 30g', 'Almonds 20g'],
      cal: Math.round(calories * 0.08), prot: Math.round(proteinG * 0.10),
    });
  }

  return meals;
}

const GOAL_LABELS = { BULK:'Muscle Gain', CUT:'Fat Loss', RECOMP:'Recomposition', GENERAL:'General Health' };

// ─── Component ───────────────────────────────────────────────────────────────
export default function DietPlan() {
  const { user } = useAuth();

  const [overrides, setOverrides] = useState({});
  const [macros, setMacros]       = useState(null);
  const [meals, setMeals]         = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const rebuild = useCallback((ov = overrides) => {
    if (!user) return;
    const m = calcMacros(user, ov);
    setMacros(m);
    setMeals(buildMeals(m, { ...user, ...ov }));
  }, [user, overrides]);

  useEffect(() => { rebuild(); }, [user]);

  const applyOverride = (key, val) => {
    const next = { ...overrides, [key]: val };
    setOverrides(next);
    rebuild(next);
  };

  if (!macros) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><div className="spinner" /></div>;

  const macroBarW = (g, cal, mult) => Math.min(100, Math.round((g * mult / macros.calories) * 100));
  const surDef = macros.tdee - macros.calories;

  return (
    <div className="diet-page">
      <div className="diet-header">
        <div>
          <h1 className="page-title">Your Diet Plan</h1>
          <p className="page-subtitle">
            Personalised for <strong style={{ color:'var(--accent)' }}>{user?.name?.split(' ')[0]}</strong>
            {' · '}{GOAL_LABELS[macros.goal] ?? macros.goal}
            {' · '}{macros.diet === 'NONE' ? 'All foods' : macros.diet}
          </p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <div className="tdee-pill">
            TDEE <strong style={{ color:'var(--accent-2)' }}>{macros.tdee}</strong>
            <span style={{ color:'var(--text-muted)', margin:'0 4px' }}>→</span>
            Target <strong style={{ color:'var(--accent)' }}>{macros.calories}</strong> kcal
            <span className={`surplus-tag ${surDef > 0 ? 'deficit' : 'surplus'}`}>
              {surDef > 0 ? `−${surDef}` : `+${Math.abs(surDef)}`} kcal
            </span>
          </div>
          <button className="btn btn-outline" onClick={() => setShowFilters(f => !f)}>
            {showFilters ? '✕ Close filters' : '⚙ Customise'}
          </button>
        </div>
      </div>

      {/* ── Customisation panel ── */}
      {showFilters && (
        <div className="diet-filters-panel">
          <div className="dfp-row">
            <div className="dfp-group">
              <label>Goal</label>
              <div className="dfp-chips">
                {['BULK','CUT','RECOMP','GENERAL'].map(g => (
                  <button key={g} className={`chip ${(overrides.goal ?? macros.goal) === g ? 'active' : ''}`}
                    onClick={() => applyOverride('goal', g)}>{GOAL_LABELS[g]}</button>
                ))}
              </div>
            </div>
            <div className="dfp-group">
              <label>Diet preference</label>
              <div className="dfp-chips">
                {[['NONE','All foods'],['NON_VEG','Non-Veg'],['VEG','Vegetarian'],['VEGAN','Vegan']].map(([v,l]) => (
                  <button key={v} className={`chip ${(overrides.diet ?? macros.diet) === v ? 'active' : ''}`}
                    onClick={() => applyOverride('diet', v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="dfp-row">
            <div className="dfp-group">
              <label>Budget</label>
              <div className="dfp-chips">
                {[['LOW','Budget'],['MEDIUM','Balanced'],['HIGH','Premium']].map(([v,l]) => (
                  <button key={v} className={`chip ${(overrides.bgt ?? macros.bgt) === v ? 'active' : ''}`}
                    onClick={() => applyOverride('bgt', v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="dfp-group">
              <label>Activity level</label>
              <div className="dfp-chips">
                {[['SEDENTARY','Sedentary'],['LIGHT','Light'],['MODERATE','Moderate'],['ACTIVE','Active'],['VERY_ACTIVE','Very Active']].map(([v,l]) => (
                  <button key={v} className={`chip ${(overrides.actv ?? user?.activityLevel ?? 'MODERATE') === v ? 'active' : ''}`}
                    onClick={() => applyOverride('actv', v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="dfp-reset">
            <button className="btn btn-outline" style={{ fontSize:12, padding:'6px 14px' }}
              onClick={() => { setOverrides({}); rebuild({}); }}>
              Reset to profile defaults
            </button>
          </div>
        </div>
      )}

      {/* ── Body stats pills ── */}
      <div className="diet-stats-row">
        {[
          { l:'Weight',   v: user?.weightKg ? `${user.weightKg}kg` : '—' },
          { l:'Height',   v: user?.heightCm ? `${user.heightCm}cm` : '—' },
          { l:'Age',      v: user?.age       ? `${user.age} yrs`   : '—' },
          { l:'Gender',   v: user?.male !== false ? 'Male' : 'Female' },
          { l:'Activity', v: (user?.activityLevel || 'MODERATE').replace('_',' ') },
          { l:'Protein',  v: `${macros.proteinG}g/day`, accent: true },
        ].map(s => (
          <div key={s.l} className="diet-stat-pill">
            <span className="dsp-label">{s.l}</span>
            <span className="dsp-val" style={s.accent ? { color:'var(--accent)' } : {}}>{s.v}</span>
          </div>
        ))}
      </div>

      {/* ── Macro summary ── */}
      <div className="macro-grid">
        <div className="macro-card macro-cal">
          <div className="macro-val">{macros.calories}</div>
          <div className="macro-label">Calories / day</div>
          <div className="macro-note">
            {surDef > 0 ? `${surDef} kcal deficit` : `${Math.abs(surDef)} kcal surplus`}
          </div>
        </div>
        <div className="macro-card">
          <div className="macro-val" style={{ color:'var(--accent)' }}>{macros.proteinG}g</div>
          <div className="macro-label">Protein · {Math.round(macros.proteinG * 4 / macros.calories * 100)}%</div>
          <div className="macro-bar"><div style={{ width:`${macroBarW(macros.proteinG, macros.calories, 4)}%`, background:'var(--accent)' }} /></div>
        </div>
        <div className="macro-card">
          <div className="macro-val" style={{ color:'var(--accent-2)' }}>{macros.carbsG}g</div>
          <div className="macro-label">Carbs · {Math.round(macros.carbsG * 4 / macros.calories * 100)}%</div>
          <div className="macro-bar"><div style={{ width:`${macroBarW(macros.carbsG, macros.calories, 4)}%`, background:'var(--accent-2)' }} /></div>
        </div>
        <div className="macro-card">
          <div className="macro-val" style={{ color:'var(--warning)' }}>{macros.fatG}g</div>
          <div className="macro-label">Fat · {Math.round(macros.fatG * 9 / macros.calories * 100)}%</div>
          <div className="macro-bar"><div style={{ width:`${macroBarW(macros.fatG, macros.calories, 9)}%`, background:'var(--warning)' }} /></div>
        </div>
      </div>

      {/* ── Meals ── */}
      <div className="meals-grid">
        {meals.map((meal, i) => (
          <div key={i} className="meal-card">
            <div className="meal-header">
              <span className="meal-icon">{meal.icon}</span>
              <div>
                <div className="meal-name">{meal.meal}</div>
                <div className="meal-macros">{meal.cal} kcal · {meal.prot}g protein</div>
              </div>
            </div>
            <ul className="meal-items">
              {meal.items.filter(Boolean).map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="diet-note">
        ℹ️ Macros use Harris-Benedict BMR. Protein targets: {macros.goal === 'CUT' ? '2.5' : '2.4'}g/kg bodyweight.
        Update your profile (weight, height, activity) for the most precise plan.
        Always consult a registered dietitian for medical-grade guidance.
      </div>
    </div>
  );
}