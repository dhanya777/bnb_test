import axios from 'axios';

// Fix: Use type assertion for `import.meta.env` to resolve TypeScript error without changing tsconfig.
// `import.meta.env` is the correct way to access Vite environment variables in the frontend.
const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:8080'; 

export const apiService = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});