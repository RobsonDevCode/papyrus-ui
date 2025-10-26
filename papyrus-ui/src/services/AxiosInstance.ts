import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_PAPYRUS_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;