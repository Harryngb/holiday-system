import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Badge, Dropdown, Avatar, Typography, Space, Button } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  BarChartOutlined,
  DeleteOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getUnreadCount, getMyPendingCount } from '../api';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [unread, setUnread] = useState(0);
  const [approvalPending, setApprovalPending] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const fetchCounts = async () => {
    try {
      const [unreadData, pendingData] = await Promise.all([
        getUnreadCount(),
        getMyPendingCount(),
      ]);
      setUnread(unreadData.count);
      setApprovalPending(pendingData.count);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = user.user_type === 'admin';
  const isSupervisor = user.user_type === 'supervisor';
  const canApprove = isAdmin || isSupervisor;
  const canManage = isAdmin;

  const getMenuItems = () => {
    const items: any[] = [
      { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
      { key: '/leaves', icon: <FileTextOutlined />, label: '假期管理' },
    ];

    items.push({ key: '/reports', icon: <BarChartOutlined />, label: '报表' });

    if (canManage || isSupervisor) {
      items.push({ key: '/employee-summary', icon: <TeamOutlined />, label: '员工假期汇总' });
    }

    if (canApprove) {
      items.push({
        key: '/approval',
        icon: <CheckCircleOutlined />,
        label: (
          <Badge count={approvalPending} size="small" offset={[6, 0]}>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>审批中心</span>
          </Badge>
        ),
      });
    }

    if (canManage) {
      items.push({ key: '/employees', icon: <UserOutlined />, label: '员工管理' });
    }

    if (isAdmin) {
      items.push({ key: '/clearance', icon: <DeleteOutlined />, label: '清零管理' });
    }

    items.push({ key: '/guide', icon: <InfoCircleOutlined />, label: '操作说明' });

    return items;
  };

  const currentPath = location.pathname === '/' ? '/' : location.pathname;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'profile', label: `${user.name} (${user.employee_id})`, disabled: true },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: '#001529' }}
        theme="dark"
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '0 8px',
          }}
        >
          {collapsed ? (
            <Text strong style={{ color: '#e8b830', fontSize: 14, whiteSpace: 'nowrap' }}>
              nV
            </Text>
          ) : (
            <img
              src="/nvision-logo.jpg"
              alt="nVision Global"
              style={{ height: 36, maxWidth: '100%' }}
            />
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPath]}
          items={getMenuItems()}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Space size="middle">
            <Badge count={unread} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                onClick={() => navigate('/notifications')}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1a3c6e' }} />
                <Text>{user.name}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
