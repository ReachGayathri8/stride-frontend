// ─── Rep counter ─────────────────────────────────────────────────────────────
export class RepCounter {
  constructor(lowerThreshold = 90, upperThreshold = 160) {
    this.lower = lowerThreshold;
    this.upper = upperThreshold;
    this.state = 'UP';
    this.count = 0;
  }
  update(angle) {
    if (this.state === 'UP'   && angle <= this.lower) { this.state = 'DOWN'; }
    else if (this.state === 'DOWN' && angle >= this.upper) { this.state = 'UP'; this.count += 1; }
    return this.count;
  }
  reset() { this.count = 0; this.state = 'UP'; }
}

// ─── Full exercise rules database ────────────────────────────────────────────
// Each exercise has:
//   keypoint_rules.rep_counter  — which joint angle to count reps on
//   angle_thresholds[]          — array of joint checks with weights and cues
//   feedback_cues               — good/ok/poor messages
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_EXERCISE_RULES = {

  squat: {
    keypoint_rules: {
      rep_counter: { joint:['left_hip','left_knee','left_ankle'], lower_threshold:95, upper_threshold:160 }
    },
    angle_thresholds: [
      { joint:['left_hip','left_knee','left_ankle'],     lower:70,  upper:110, weight:0.35, cue:'Go deeper — aim for 90° at the knee' },
      { joint:['right_hip','right_knee','right_ankle'],  lower:70,  upper:110, weight:0.30, cue:'Right knee needs to match depth — go lower' },
      { joint:['left_shoulder','left_hip','left_knee'],  lower:55,  upper:95,  weight:0.20, cue:'Keep your torso upright — chest up' },
      { joint:['left_knee','left_ankle','left_hip'],     lower:60,  upper:100, weight:0.15, cue:'Push knees out over your toes' },
    ],
    feedback_cues: { good:'Great squat depth!', ok:'Almost — push a little deeper', poor:'Slow down and check your form' },
  },

  'push up': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:75, upper_threshold:155 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],  lower:65,  upper:90,  weight:0.40, cue:'Go lower — elbows should hit 90°' },
      { joint:['right_shoulder','right_elbow','right_wrist'],lower:65, upper:90,  weight:0.20, cue:'Keep both arms symmetric' },
      { joint:['left_hip','left_shoulder','left_elbow'],    lower:155, upper:180, weight:0.25, cue:'Brace your core — hips are sagging' },
      { joint:['left_shoulder','left_hip','left_ankle'],    lower:160, upper:180, weight:0.15, cue:'Keep your body in a straight line' },
    ],
    feedback_cues: { good:'Perfect push-up form!', ok:'Keep the body rigid', poor:'Reset and slow down' },
  },

  'bicep curl': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:45, upper_threshold:145 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],  lower:25,  upper:55,  weight:0.45, cue:'Curl higher — fully contract the bicep at the top' },
      { joint:['left_hip','left_shoulder','left_elbow'],    lower:0,   upper:20,  weight:0.40, cue:'Keep your upper arm still — elbow pinned to side' },
      { joint:['right_shoulder','right_elbow','right_wrist'],lower:25, upper:55,  weight:0.15, cue:'Match left arm — keep both sides equal' },
    ],
    feedback_cues: { good:'Nice curl! Full range of motion', ok:'Get full range — all the way up and all the way down', poor:'Control the movement — no swinging' },
  },

  lunge: {
    keypoint_rules: {
      rep_counter: { joint:['left_hip','left_knee','left_ankle'], lower_threshold:90, upper_threshold:160 }
    },
    angle_thresholds: [
      { joint:['left_hip','left_knee','left_ankle'],     lower:75,  upper:100, weight:0.35, cue:'Front knee to 90° — step further forward' },
      { joint:['right_hip','right_knee','right_ankle'],  lower:75,  upper:100, weight:0.30, cue:'Back knee should nearly touch the floor' },
      { joint:['left_shoulder','left_hip','left_knee'],  lower:80,  upper:105, weight:0.25, cue:'Keep your torso upright — don\'t lean forward' },
      { joint:['left_hip','left_ankle','left_knee'],     lower:60,  upper:100, weight:0.10, cue:'Keep front shin vertical' },
    ],
    feedback_cues: { good:'Perfect lunge depth!', ok:'Slightly deeper on both legs', poor:'Check balance and step length' },
  },

  deadlift: {
    keypoint_rules: {
      rep_counter: { joint:['left_hip','left_knee','left_ankle'], lower_threshold:100, upper_threshold:170 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_hip','left_knee'],  lower:35,  upper:65,  weight:0.35, cue:'Hinge at the hips — keep back straight' },
      { joint:['left_hip','left_shoulder','left_elbow'], lower:150, upper:180, weight:0.35, cue:'Back is rounding — brace and lift chest' },
      { joint:['left_hip','left_knee','left_ankle'],     lower:100, upper:160, weight:0.30, cue:'Keep the bar close to your body' },
    ],
    feedback_cues: { good:'Excellent deadlift form!', ok:'Keep the back flat throughout', poor:'Stop — back is rounding dangerously' },
  },

  'overhead press': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:80, upper_threshold:160 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],   lower:160, upper:180, weight:0.35, cue:'Fully lock out the arm overhead' },
      { joint:['right_shoulder','right_elbow','right_wrist'],lower:160, upper:180, weight:0.30, cue:'Right arm needs full lockout' },
      { joint:['left_hip','left_shoulder','left_elbow'],     lower:70,  upper:110, weight:0.20, cue:'Keep your core tight — don\'t arch lower back' },
      { joint:['left_shoulder','left_hip','left_knee'],      lower:170, upper:180, weight:0.15, cue:'Stand tall — don\'t lean back excessively' },
    ],
    feedback_cues: { good:'Full overhead lockout — great!', ok:'Press all the way to lockout', poor:'Lower the weight and focus on form' },
  },

  plank: {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_hip','left_ankle'], lower_threshold:160, upper_threshold:180 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_hip','left_ankle'],  lower:162, upper:180, weight:0.40, cue:'Raise your hips — body should be a straight line' },
      { joint:['right_shoulder','right_hip','right_ankle'],lower:162,upper:180, weight:0.35, cue:'Keep hips level on both sides' },
      { joint:['left_hip','left_shoulder','left_elbow'],  lower:85,  upper:95,  weight:0.25, cue:'Position elbows directly under shoulders' },
    ],
    feedback_cues: { good:'Perfect plank position!', ok:'Minor hip sag — brace your core harder', poor:'Reset — focus on a straight body line' },
  },

  'barbell row': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:70, upper_threshold:155 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],  lower:60,  upper:90,  weight:0.40, cue:'Pull elbows past your torso — full contraction' },
      { joint:['left_shoulder','left_hip','left_knee'],     lower:40,  upper:70,  weight:0.35, cue:'Keep your back flat — don\'t round the spine' },
      { joint:['right_shoulder','right_elbow','right_wrist'],lower:60, upper:90,  weight:0.25, cue:'Pull both elbows back equally' },
    ],
    feedback_cues: { good:'Great row — full range of motion', ok:'Pull elbows a bit further back', poor:'Back is rounding — lower the weight' },
  },

  'pull up': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:70, upper_threshold:160 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],  lower:60,  upper:85,  weight:0.40, cue:'Pull chin over the bar — squeeze lats at the top' },
      { joint:['right_shoulder','right_elbow','right_wrist'],lower:60, upper:85,  weight:0.35, cue:'Both arms should work equally' },
      { joint:['left_hip','left_shoulder','left_elbow'],    lower:160, upper:180, weight:0.25, cue:'Keep body straight — no kipping' },
    ],
    feedback_cues: { good:'Full pull-up — chin over bar!', ok:'Pull just a little higher', poor:'Use assistance or reduce range' },
  },

  'romanian deadlift': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_hip','left_knee'], lower_threshold:50, upper_threshold:160 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_hip','left_knee'],  lower:40,  upper:70,  weight:0.45, cue:'Hip hinge deeper — push hips back further' },
      { joint:['left_hip','left_shoulder','left_elbow'], lower:155, upper:180, weight:0.35, cue:'Keep your back flat — don\'t round' },
      { joint:['left_hip','left_knee','left_ankle'],     lower:150, upper:175, weight:0.20, cue:'Keep a soft bend in the knee throughout' },
    ],
    feedback_cues: { good:'Perfect hip hinge pattern!', ok:'Push hips back further', poor:'Back is rounding — lower the weight' },
  },

  'shoulder press': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:80, upper_threshold:160 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],   lower:160, upper:180, weight:0.40, cue:'Full lockout — straighten the arm overhead' },
      { joint:['right_shoulder','right_elbow','right_wrist'],lower:160, upper:180, weight:0.35, cue:'Right arm also needs full extension' },
      { joint:['left_hip','left_shoulder','left_elbow'],     lower:65,  upper:105, weight:0.25, cue:'Don\'t flare elbows too wide — keep 45° angle' },
    ],
    feedback_cues: { good:'Full overhead extension!', ok:'Extend a bit further at the top', poor:'Reduce weight and focus on range' },
  },

  'lat pulldown': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:75, upper_threshold:155 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],   lower:65,  upper:95,  weight:0.40, cue:'Pull bar to upper chest — full lat contraction' },
      { joint:['right_shoulder','right_elbow','right_wrist'],lower:65,  upper:95,  weight:0.35, cue:'Keep both sides even' },
      { joint:['left_shoulder','left_hip','left_knee'],      lower:75,  upper:100, weight:0.25, cue:'Slight lean back but don\'t use momentum' },
    ],
    feedback_cues: { good:'Great lat pulldown — full range!', ok:'Pull the bar a bit lower to chest', poor:'Reduce weight to achieve full range' },
  },

  'hammer curl': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:45, upper_threshold:145 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],  lower:25,  upper:55,  weight:0.50, cue:'Curl to full contraction — thumbs toward shoulder' },
      { joint:['left_hip','left_shoulder','left_elbow'],    lower:0,   upper:20,  weight:0.50, cue:'Keep upper arm still — no swinging' },
    ],
    feedback_cues: { good:'Perfect hammer curl!', ok:'Full range — higher on the curl', poor:'Control the movement — no body momentum' },
  },

  'leg press': {
    keypoint_rules: {
      rep_counter: { joint:['left_hip','left_knee','left_ankle'], lower_threshold:80, upper_threshold:160 }
    },
    angle_thresholds: [
      { joint:['left_hip','left_knee','left_ankle'],    lower:75,  upper:100, weight:0.45, cue:'Lower to 90° — full range of motion' },
      { joint:['right_hip','right_knee','right_ankle'], lower:75,  upper:100, weight:0.40, cue:'Keep both legs at equal depth' },
      { joint:['left_shoulder','left_hip','left_knee'], lower:80,  upper:110, weight:0.15, cue:'Keep back flat against the pad' },
    ],
    feedback_cues: { good:'Full range leg press!', ok:'Lower the platform a bit further', poor:'Reduce weight and go deeper' },
  },

  'tricep pushdown': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:40, upper_threshold:155 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],  lower:15,  upper:45,  weight:0.50, cue:'Push all the way to full extension — lock out' },
      { joint:['left_hip','left_shoulder','left_elbow'],    lower:0,   upper:25,  weight:0.50, cue:'Keep elbows pinned to your sides — don\'t flare' },
    ],
    feedback_cues: { good:'Full tricep extension!', ok:'Lock out harder at the bottom', poor:'Reduce weight — elbows are moving too much' },
  },

  burpee: {
    keypoint_rules: {
      rep_counter: { joint:['left_hip','left_knee','left_ankle'], lower_threshold:90, upper_threshold:160 }
    },
    angle_thresholds: [
      { joint:['left_hip','left_shoulder','left_elbow'],  lower:155, upper:180, weight:0.40, cue:'At push-up: keep body straight, no sagging hips' },
      { joint:['left_hip','left_knee','left_ankle'],      lower:75,  upper:110, weight:0.35, cue:'Jump feet fully to hands in squat position' },
      { joint:['left_shoulder','left_hip','left_knee'],   lower:160, upper:180, weight:0.25, cue:'Stand fully upright at the top of each rep' },
    ],
    feedback_cues: { good:'Full burpee rep!', ok:'Get full hip extension at the top', poor:'Control each phase — don\'t rush' },
  },

  'mountain climber': {
    keypoint_rules: {
      rep_counter: { joint:['left_hip','left_knee','left_ankle'], lower_threshold:60, upper_threshold:150 }
    },
    angle_thresholds: [
      { joint:['left_hip','left_shoulder','left_ankle'],  lower:160, upper:180, weight:0.50, cue:'Keep hips level — don\'t pike up or sag' },
      { joint:['left_hip','left_knee','left_ankle'],      lower:40,  upper:80,  weight:0.50, cue:'Drive knee fully toward chest' },
    ],
    feedback_cues: { good:'Perfect form — keep the pace!', ok:'Drive the knee further toward chest', poor:'Slow down and control your hips' },
  },

  'jumping jack': {
    keypoint_rules: {
      rep_counter: { joint:['left_shoulder','left_elbow','left_wrist'], lower_threshold:60, upper_threshold:160 }
    },
    angle_thresholds: [
      { joint:['left_shoulder','left_elbow','left_wrist'],  lower:150, upper:180, weight:0.50, cue:'Raise arms fully overhead — complete the arc' },
      { joint:['left_hip','left_knee','left_ankle'],        lower:130, upper:170, weight:0.50, cue:'Jump feet wider — full jump landing' },
    ],
    feedback_cues: { good:'Great jumping jacks!', ok:'Full arm extension overhead', poor:'Slow down and complete each rep fully' },
  },

};

// ─── Fuzzy name → key matching ───────────────────────────────────────────────
export function getRulesForExercise(exercise) {
  const rawName = exercise?.name?.toLowerCase().trim() ?? '';
  // Direct key lookup
  if (DEFAULT_EXERCISE_RULES[rawName]) return DEFAULT_EXERCISE_RULES[rawName];
  // Normalised (underscores)
  const underKey = rawName.replace(/\s+/g, '_');
  if (DEFAULT_EXERCISE_RULES[underKey]) return DEFAULT_EXERCISE_RULES[underKey];
  // Partial match
  const partialKey = Object.keys(DEFAULT_EXERCISE_RULES).find(k => rawName.includes(k) || k.includes(rawName));
  if (partialKey) return DEFAULT_EXERCISE_RULES[partialKey];
  // Keyword fallback
  if (rawName.includes('squat') || rawName.includes('goblet')) return DEFAULT_EXERCISE_RULES.squat;
  if (rawName.includes('push')  || rawName.includes('dip'))    return DEFAULT_EXERCISE_RULES['push up'];
  if (rawName.includes('curl'))                                 return DEFAULT_EXERCISE_RULES['bicep curl'];
  if (rawName.includes('lunge') || rawName.includes('split'))  return DEFAULT_EXERCISE_RULES.lunge;
  if (rawName.includes('dead'))                                 return DEFAULT_EXERCISE_RULES.deadlift;
  if (rawName.includes('row'))                                  return DEFAULT_EXERCISE_RULES['barbell row'];
  if (rawName.includes('press') && rawName.includes('over'))   return DEFAULT_EXERCISE_RULES['overhead press'];
  if (rawName.includes('press'))                               return DEFAULT_EXERCISE_RULES['shoulder press'];
  if (rawName.includes('pull') || rawName.includes('lat'))     return DEFAULT_EXERCISE_RULES['pull up'];
  if (rawName.includes('plank'))                               return DEFAULT_EXERCISE_RULES.plank;
  if (rawName.includes('tricep') || rawName.includes('skull')) return DEFAULT_EXERCISE_RULES['tricep pushdown'];
  if (rawName.includes('burpee'))                              return DEFAULT_EXERCISE_RULES.burpee;
  if (rawName.includes('mountain'))                            return DEFAULT_EXERCISE_RULES['mountain climber'];
  // Final fallback
  return DEFAULT_EXERCISE_RULES.squat;
}

// ─── Voice feedback ───────────────────────────────────────────────────────────
export function speakFeedback(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u   = new SpeechSynthesisUtterance(text);
  u.rate    = 1.1;
  u.pitch   = 1.05;
  u.volume  = 0.9;
  window.speechSynthesis.speak(u);
}