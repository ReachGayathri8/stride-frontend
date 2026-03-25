import { useState, useEffect, useRef, useCallback } from 'react';
import { detectPose, scoreForm, drawSkeleton, calculateAngle, getKeypoint } from '../ai/poseDetection';
import { RepCounter, speakFeedback } from '../ai/exerciseLogic';

// Normalize rules from backend (camelCase) or local defaults (snake_case)
function normalizeRules(rules) {
  if (!rules) return null;
  // Already in camelCase from backend: { keypointRules, angleThresholds, feedbackCues }
  // or snake_case from local defaults: { keypoint_rules, angle_thresholds, feedback_cues }
  return {
    keypoint_rules:   rules.keypointRules   ?? rules.keypoint_rules   ?? {},
    angle_thresholds: rules.angleThresholds ?? rules.angle_thresholds ?? [],
    feedback_cues:    rules.feedbackCues    ?? rules.feedback_cues    ?? {},
  };
}

export function usePoseDetection(videoRef, canvasRef, exerciseRules, active = true) {
  const [reps, setReps]           = useState(0);
  const [accuracy, setAccuracy]   = useState(0);
  const [feedback, setFeedback]   = useState([]);
  const [poseReady, setPoseReady] = useState(false);

  const counterRef      = useRef(null);
  const rafRef          = useRef(null);
  const lastSpeakRef    = useRef(0);
  const lastFeedbackRef = useRef([]);
  const normalizedRules = useRef(null);

  // Init counter when rules change
  useEffect(() => {
    if (!exerciseRules) return;
    normalizedRules.current = normalizeRules(exerciseRules);
    const rc = normalizedRules.current.keypoint_rules?.rep_counter ?? {};
    const lower = rc.lower_threshold ?? 90;
    const upper = rc.upper_threshold ?? 160;
    counterRef.current = new RepCounter(lower, upper);
    setReps(0); setAccuracy(0); setFeedback([]);
  }, [exerciseRules]);

  const loop = useCallback(async () => {
    if (!active || !videoRef.current || !normalizedRules.current) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const pose = await detectPose(videoRef.current);

    if (pose) {
      setPoseReady(true);
      if (canvasRef?.current) drawSkeleton(canvasRef.current, pose);

      const rules = normalizedRules.current;

      // Rep counting
      const rc = rules.keypoint_rules?.rep_counter;
      if (rc && counterRef.current) {
        const [jA, jB, jC] = rc.joint;
        const A = getKeypoint(pose, jA);
        const B = getKeypoint(pose, jB);
        const C = getKeypoint(pose, jC);
        if (A && B && C) {
          const angle = calculateAngle(A, B, C);
          const newReps = counterRef.current.update(angle);
          setReps(newReps);
        }
      }

      // Form scoring
      const { accuracy: acc, feedback: fb } = scoreForm(pose, rules);
      setAccuracy(acc);

      if (fb.length && JSON.stringify(fb) !== JSON.stringify(lastFeedbackRef.current)) {
        setFeedback(fb);
        lastFeedbackRef.current = fb;
        const now = Date.now();
        if (now - lastSpeakRef.current > 4000) {
          speakFeedback(fb[0]);
          lastSpeakRef.current = now;
        }
      } else if (!fb.length) {
        setFeedback([]);
        lastFeedbackRef.current = [];
      }
    } else {
      setPoseReady(false);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [active, videoRef, canvasRef]);

  useEffect(() => {
    if (!active) { cancelAnimationFrame(rafRef.current); return; }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop, active]);

  const resetReps = useCallback(() => {
    counterRef.current?.reset();
    setReps(0);
  }, []);

  return { reps, accuracy, feedback, poseReady, resetReps };
}
