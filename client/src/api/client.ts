import axios from 'axios';

// The ONE configured axios instance. Every request in the app goes through it.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export default api;
