import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Tag,
  Typography,
  Empty,
  Spin,
  message,
  Space,
} from 'antd';
import { CheckOutlined, BellOutlined } from '@ant-design/icons';
import { getNotifications, markRead, markAllRead } from '../api';

const { Title, Text, Paragraph } = Typography;

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      message.error('操作失败');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      message.success('全部已读');
    } catch {
      message.error('操作失败');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, color: '#1a3c6e' }}>
          通知中心
          {unreadCount > 0 && (
            <Tag color="red" style={{ marginLeft: 8 }}>
              {unreadCount} 条未读
            </Tag>
          )}
        </Title>
        {unreadCount > 0 && (
          <Button icon={<CheckOutlined />} onClick={handleMarkAllRead}>
            全部已读
          </Button>
        )}
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={notifications}
            renderItem={(item: any) => (
              <List.Item
                actions={
                  !item.is_read
                    ? [
                        <Button
                          type="link"
                          size="small"
                          onClick={() => handleMarkRead(item.id)}
                        >
                          标为已读
                        </Button>,
                      ]
                    : []
                }
                style={{
                  background: item.is_read ? 'transparent' : '#f0f5ff',
                  padding: '12px 16px',
                  borderRadius: 8,
                  marginBottom: 4,
                }}
              >
                <List.Item.Meta
                  avatar={
                    <BellOutlined
                      style={{
                        fontSize: 20,
                        color: item.is_read ? '#d9d9d9' : '#1a3c6e',
                      }}
                    />
                  }
                  title={
                    <Space>
                      <Text strong={!item.is_read}>{item.title}</Text>
                      {!item.is_read && <Tag color="blue">未读</Tag>}
                    </Space>
                  }
                  description={
                    <div>
                      <Paragraph style={{ margin: 0 }}>{item.message}</Paragraph>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleString('zh-CN')}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default Notifications;
