import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeaveManagement from './pages/LeaveManagement';
import Approval from './pages/Approval';
import EmployeeManagement from './pages/EmployeeManagement';
import Reports from './pages/Reports';
import EmployeeSummary from './pages/EmployeeSummary';
import Clearance from './pages/Clearance';
import Notifications from './pages/Notifications';
import CalculationGuide from './pages/CalculationGuide';

const theme = {
  token: {
    colorPrimary: '#1a3c6e',
    colorLink: '#2b6cb0',
    borderRadius: 6,
    fontFamily: 'Microsoft YaHei, -apple-system, BlinkMacSystemFont, sans-serif',
  },
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="leaves" element={<LeaveManagement />} />
            <Route path="approval" element={<Approval />} />
            <Route path="employee-summary" element={<EmployeeSummary />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="clearance" element={<Clearance />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="guide" element={<CalculationGuide />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
