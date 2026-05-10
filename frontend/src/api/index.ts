import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (username: string, password: string) =>
  api.post('/api/auth/login', { username, password }).then((r) => r.data);

export const getMe = () => api.get('/api/auth/me').then((r) => r.data);

// Users
export const getUsers = () => api.get('/api/users').then((r) => r.data);

export const createUser = (data: any) =>
  api.post('/api/users', data).then((r) => r.data);

export const updateUser = (id: number, data: any) =>
  api.put(`/api/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id: number) =>
  api.delete(`/api/users/${id}`).then((r) => r.data);

export const batchImportUsers = (data: any[]) =>
  api.post('/api/users/import', data).then((r) => r.data);

// Leaves
export const getLeaves = (status?: string, applicant_type?: string, exclude_self?: boolean) => {
  const params: any = {};
  if (status) params.status_filter = status;
  if (applicant_type) params.applicant_type = applicant_type;
  if (exclude_self) params.exclude_self = 'true';
  return api.get('/api/leaves', { params }).then((r) => r.data);
};

export const getApprovalLog = () =>
  api.get('/api/leaves/approval-log').then((r) => r.data);

export const getMyPendingCount = () =>
  api.get('/api/leaves/my-pending-count').then((r) => r.data);

export const createLeave = (data: any) =>
  api.post('/api/leaves', data).then((r) => r.data);

export const getLeave = (id: number) =>
  api.get(`/api/leaves/${id}`).then((r) => r.data);

// Approval
export const approveLeave = (id: number, data: any) =>
  api.post(`/api/leaves/${id}/approve`, data).then((r) => r.data);

export const rejectLeave = (id: number, data: any) =>
  api.post(`/api/leaves/${id}/reject`, data).then((r) => r.data);

export const batchApproveLeaves = () =>
  api.post('/api/leaves/batch-approve').then((r) => r.data);

// Dashboard
export const getDashboardSummary = () =>
  api.get('/api/dashboard/summary').then((r) => r.data);

export const getEmployeeSummary = () =>
  api.get('/api/dashboard/employees').then((r) => r.data);

// Clearance
export const resetClearance = (notes?: string) =>
  api.post('/api/clearance/reset-with-note', { notes }).then((r) => r.data);

export const getClearanceRecords = () =>
  api.get('/api/clearance/records').then((r) => r.data);

export const undoClearance = () =>
  api.post('/api/clearance/undo').then((r) => r.data);

// Notifications
export const getNotifications = () =>
  api.get('/api/notifications').then((r) => r.data);

export const getUnreadCount = () =>
  api.get('/api/notifications/unread-count').then((r) => r.data);

export const markRead = (id: number) =>
  api.put(`/api/notifications/${id}/read`).then((r) => r.data);

export const markAllRead = () =>
  api.put('/api/notifications/read-all').then((r) => r.data);

// Reports
export const getReportUrl = () => `${API_BASE}/api/reports/export`;

export default api;
