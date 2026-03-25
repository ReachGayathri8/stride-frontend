# STRIDE AI – Frontend

React.js PWA frontend for the STRIDE AI intelligent fitness tracking system.

## Tech Stack
- React 18 + React Router v6
- TensorFlow.js + MoveNet (pose detection, runs in-browser)
- Recharts (analytics graphs)
- Axios (API calls with JWT interceptor)

## Quick Start

```bash
npm install
npm start
```

App runs at http://localhost:3000 and proxies API calls to http://localhost:8080.

## Environment Variables

Create `.env.local` to override defaults:
```
REACT_APP_API_URL=http://localhost:8080
```

## Key Features

| Feature | File |
|---|---|
| Pose detection (TF.js) | `src/ai/poseDetection.js` |
| Rep counting + form scoring | `src/ai/exerciseLogic.js` |
| Camera + AI workout session | `src/pages/WorkoutSession.jsx` |
| Real-time pose hook | `src/hooks/usePoseDetection.js` |
| Auth context (JWT) | `src/context/AuthContext.js` |
| Analytics dashboard | `src/pages/Dashboard.jsx` |
| Diet plan viewer | `src/pages/DietPlan.jsx` |

## How the AI Works

1. **Camera** → `getUserMedia()` streams video into `<video>` element
2. **TF.js MoveNet** → detects 17 body keypoints at ~25 fps using WebGL
3. **Angle calculation** → `calculateAngle(A, B, C)` uses `atan2` on 3 keypoints
4. **Rep counter** → state machine: UP → DOWN (angle < lower_threshold) → UP (angle > upper_threshold) = 1 rep
5. **Form scoring** → weighted average of all joint angle deviations from ideal range
6. **Voice feedback** → `SpeechSynthesis` API speaks corrections aloud

## Adding New Exercises (no code changes needed!)

Add a row to the backend `exercises` table with the JSON rules — the frontend
reads them dynamically. See `DEFAULT_EXERCISE_RULES` in `exerciseLogic.js` for
the JSON schema.

## Build for Production

```bash
npm run build
```

Outputs to `build/`. Serve with any static file server or nginx.
