import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage if available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('lyallpur_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response error handler
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid
      if (localStorage.getItem('lyallpur_token')) {
        localStorage.removeItem('lyallpur_token');
        localStorage.removeItem('lyallpur_user');
      }
    }
    return Promise.reject(error);
  }
);

export default client;
