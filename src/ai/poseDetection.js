import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';

let detector = null;
let tfReady   = false;

async function ensureTf() {
  if (tfReady) return;
  try {
    await tf.setBackend('webgl');
    await tf.ready();
  } catch {
    try {
      await tf.setBackend('cpu');
      await tf.ready();
    } catch (e) {
      console.warn('TF backend init failed:', e);
    }
  }
  tfReady = true;
}

export const KP = {
  nose:0, left_eye:1, right_eye:2, left_ear:3, right_ear:4,
  left_shoulder:5,  right_shoulder:6,
  left_elbow:7,     right_elbow:8,
  left_wrist:9,     right_wrist:10,
  left_hip:11,      right_hip:12,
  left_knee:13,     right_knee:14,
  left_ankle:15,    right_ankle:16,
};

export async function initDetector() {
  if (detector) return detector;
  await ensureTf();
  try {
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
        minPoseScore: 0.25,
      }
    );
    return detector;
  } catch (err) {
    console.error('Pose detector init failed:', err);
    throw err;
  }
}

export async function detectPose(videoEl) {
  if (!detector) await initDetector();
  if (!videoEl || videoEl.readyState < 2) return null;
  try {
    const poses = await detector.estimatePoses(videoEl, { flipHorizontal: false });
    return poses[0] ?? null;
  } catch {
    return null;
  }
}

export function calculateAngle(A, B, C) {
  if (!A || !B || !C) return 0;
  const rad = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
  let angle = Math.abs(rad * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

export function getKeypoint(pose, name) {
  if (!pose) return null;
  const kp = pose.keypoints[KP[name]];
  return kp && kp.score > 0.3 ? kp : null;
}

export function scoreForm(pose, rules) {
  if (!pose || !rules || !rules.angle_thresholds) return { accuracy: 0, feedback: [] };
  const feedback = [];
  let totalWeight = 0, weightedScore = 0;
  for (const rule of rules.angle_thresholds) {
    const [nA, nB, nC] = rule.joint;
    const A = getKeypoint(pose, nA);
    const B = getKeypoint(pose, nB);
    const C = getKeypoint(pose, nC);
    if (!A || !B || !C) continue;
    const angle     = calculateAngle(A, B, C);
    const inRange   = angle >= rule.lower && angle <= rule.upper;
    const deviation = inRange ? 0 : Math.min(Math.abs(angle - rule.lower), Math.abs(angle - rule.upper));
    const score     = Math.max(0, 1 - deviation / 35);
    weightedScore  += score * rule.weight;
    totalWeight    += rule.weight;
    if (!inRange && rule.cue) feedback.push(rule.cue);
  }
  const accuracy = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  return { accuracy, feedback };
}

export function drawSkeleton(canvas, pose) {
  if (!canvas || !pose) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const CONNECTIONS = [
    [5,6],[5,7],[7,9],[6,8],[8,10],
    [5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16],
  ];
  ctx.strokeStyle = 'rgba(167,139,250,0.75)';
  ctx.lineWidth   = 2.5;
  for (const [a, b] of CONNECTIONS) {
    const kA = pose.keypoints[a], kB = pose.keypoints[b];
    if (kA.score > 0.3 && kB.score > 0.3) {
      ctx.beginPath(); ctx.moveTo(kA.x, kA.y); ctx.lineTo(kB.x, kB.y); ctx.stroke();
    }
  }
  for (const kp of pose.keypoints) {
    if (kp.score > 0.3) {
      ctx.beginPath(); ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(167,139,250,1)';
      ctx.shadowColor = 'rgba(167,139,250,0.8)';
      ctx.shadowBlur  = 8;
      ctx.fill();
      ctx.shadowBlur  = 0;
    }
  }
}