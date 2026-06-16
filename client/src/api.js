const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Požadavek selhal: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const guestsApi = {
  list: () => request('/guests'),
  create: (data) => request('/guests', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/guests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/guests/${id}`, { method: 'DELETE' })
};

export const agendaApi = {
  list: () => request('/agenda'),
  create: (data) => request('/agenda', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/agenda/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/agenda/${id}`, { method: 'DELETE' })
};

export const tasksApi = {
  list: () => request('/tasks'),
  create: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' })
};

export const accommodationsApi = {
  list: () => request('/accommodations'),
  create: (data) => request('/accommodations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/accommodations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/accommodations/${id}`, { method: 'DELETE' })
};
