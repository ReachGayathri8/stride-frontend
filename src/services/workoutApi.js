import api from './api';

export const exerciseApi = {
  getAll: (params) => api.get('/api/exercises', { params }),
  getById: (id) => api.get(`/api/exercises/${id}`),
  getRules: (id) => api.get(`/api/exercises/${id}/rules`),
};

export const sessionApi = {
  start: (data) => api.post('/api/sessions', {
    ...data,
    exerciseId: data.exerciseId ? Number(data.exerciseId) : null,
  }),
  complete: (id, data) => api.put(`/api/sessions/${id}/complete`, data),
  logSet: (id, data) => api.post(`/api/sessions/${id}/sets`, {
    exerciseId:    data.exerciseId ? Number(data.exerciseId) : null,
    repsCompleted: data.reps ?? data.repsCompleted ?? 0,
    accuracyScore: data.accuracyScore ?? 0,
    feedbackLog:   data.feedbackLog ?? null,
    durationSec:   data.durationSec ?? null,
  }),
  getHistory: (params) => api.get('/api/sessions/history', { params }),
  getById: (id) => api.get(`/api/sessions/${id}`),
};

export const planApi = {
  generate: () => api.post('/api/plans/generate'),
  getCurrent: () => api.get('/api/plans/current'),
  getAll: () => api.get('/api/plans'),
};

export const analyticsApi = {
  getProgress: () => api.get('/api/analytics/progress'),
  getConsistency: () => api.get('/api/analytics/consistency'),
  getPerformance: () => api.get('/api/analytics/performance'),
  getDashboard: () => api.get('/api/analytics/dashboard'),
};

export const dietApi = {
  generate: () => api.post('/api/diet/generate'),
  getCurrent: () => api.get('/api/diet/current'),
};

export const userApi = {
  getMe: () => api.get('/api/users/me'),
  update: (data) => api.put('/api/users/me', data),
};
