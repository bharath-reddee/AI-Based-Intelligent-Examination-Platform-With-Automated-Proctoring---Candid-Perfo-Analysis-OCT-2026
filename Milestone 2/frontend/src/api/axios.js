import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, 
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      if (hadToken && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const formatApiError = (error) => {
  if (!error) {
    return 'An unexpected error occurred.';
  }

  
  if (typeof error === 'string') {
    return error;
  }

  
  if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
    return 'Request timed out. The AI generation or server operation took longer than expected. Please try again with fewer questions or retry in a few moments.';
  }

  
  if (!error.response && !error.request) {
    return error.message || 'An unexpected client error occurred before dispatching the request.';
  }

  
  if (!error.response && error.request) {
    if (error.code === 'ERR_NETWORK') {
      return `Network connection error. Unable to establish connection to FastAPI backend at ${API_BASE_URL}. Please verify the backend is running.`;
    }
    return `Unable to connect to backend server at ${API_BASE_URL}. Please verify FastAPI backend is running and CORS allows the frontend origin.`;
  }

  
  const status = error.response.status;
  const data = error.response.data;

  
  let detailMsg = '';
  if (data?.detail) {
    if (Array.isArray(data.detail)) {
      detailMsg = data.detail
        .map((d) => {
          if (typeof d === 'object' && d !== null) {
            const loc = Array.isArray(d.loc) ? d.loc.join(' -> ') : '';
            return loc ? `${loc}: ${d.msg || JSON.stringify(d)}` : (d.msg || JSON.stringify(d));
          }
          return String(d);
        })
        .join(', ');
    } else if (typeof data.detail === 'object' && data.detail !== null) {
      detailMsg = data.detail.msg || JSON.stringify(data.detail);
    } else {
      detailMsg = String(data.detail);
    }
  } else if (data?.message) {
    detailMsg = String(data.message);
  }

  
  switch (status) {
    case 400:
      return detailMsg || 'Bad Request (400): Invalid request parameters or input constraints violated.';
    case 401:
      return detailMsg || 'Unauthorized (401): Session expired or missing authentication token. Please log in.';
    case 403:
      return detailMsg || 'Forbidden (403): You do not have permission to perform this action.';
    case 404:
      return detailMsg || 'Not Found (404): The requested examination or API resource was not found.';
    case 422:
      return detailMsg || 'Validation Error (422): Input validation failed. Please check required fields and formats.';
    case 429:
      return detailMsg || 'Rate Limit Exceeded (429): Too many requests in a short time. Please wait a moment and try again.';
    case 500:
      return detailMsg || 'Internal Server Error (500): The server encountered an error while processing the request.';
    case 502:
    case 503:
    case 504:
      return detailMsg || `Backend Gateway Error (${status}): The service is temporarily unreachable or overloaded. Please retry.`;
    default:
      return detailMsg || `Error (${status}): ${error.response.statusText || 'Operation failed'}`;
  }
};

export default apiClient;
