const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Get stored auth token
 */
function getToken() {
  return localStorage.getItem('sd_hall_token');
}

/**
 * Get stored user data
 */
export function getUser() {
  const user = localStorage.getItem('sd_hall_user');
  return user ? JSON.parse(user) : null;
}

/**
 * Save auth data
 */
function saveAuth(token, user) {
  localStorage.setItem('sd_hall_token', token);
  localStorage.setItem('sd_hall_user', JSON.stringify(user));
}

/**
 * Clear auth data
 */
export function logout() {
  localStorage.removeItem('sd_hall_token');
  localStorage.removeItem('sd_hall_user');
  window.location.href = '/';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Login
 */
export async function login(email, password, role = 'student') {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || 'Login failed');
  }

  saveAuth(data.token, data.user);
  return data;
}

/**
 * Signup
 */
export async function signup(formData) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || 'Signup failed');
  }

  saveAuth(data.token, data.user);
  return data;
}

/**
 * Execute SQL query
 */
export async function executeQuery(sql, panelContext = 'general') {
  const token = getToken();

  if (!token) {
    throw new Error('Not authenticated. Please login.');
  }

  const res = await fetch(`${API_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ sql, panelContext })
  });

  if (res.status === 401) {
    logout();
    throw new Error('Session expired. Please login again.');
  }

  const data = await res.json();
  return data;
}
