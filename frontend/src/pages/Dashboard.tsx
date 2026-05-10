import React, { useState, useEffect } from 'react';
import { Card, Typography, Spin, Row, Col, Statistic } from 'antd';
import {
  FileProtectOutlined,
  HistoryOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';
import { getDashboardSummary } from '../api';

const { Title, Text } = Typography;
const BRAND_BLUE = '#1a3c6e';
const BRAND_GOLD = '#e8b830';

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const s = await getDashboardSummary();
        setSummary(s);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24, color: BRAND_BLUE }}>
        我的假期概览
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <FileProtectOutlined style={{ fontSize: 20, color: BRAND_BLUE, marginRight: 8 }} />
          <Text strong style={{ fontSize: 16 }}>假期天数（天）</Text>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="总假期"
              value={summary.total_leave_days?.toFixed(1) || '0.0'}
              valueStyle={{ color: BRAND_BLUE, fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="上年度累计"
              value={summary.last_year_days?.toFixed(1) || '0.0'}
              valueStyle={{ color: '#2b6cb0', fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="本年度"
              value={summary.current_year_days?.toFixed(1) || '0.0'}
              valueStyle={{ color: BRAND_BLUE, fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="已使用"
              value={summary.used_leave_days?.toFixed(1) || '0.0'}
              valueStyle={{ color: BRAND_GOLD, fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="剩余"
              value={summary.remaining_days?.toFixed(1) || '0.0'}
              valueStyle={{
                color: (summary.remaining_days || 0) > 0 ? '#52c41a' : '#ff4d4f',
                fontSize: 22,
              }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="待审批"
              value={summary.pending_requests || 0}
              valueStyle={{ color: '#faad14', fontSize: 22 }}
              prefix={<HistoryOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <FieldTimeOutlined style={{ fontSize: 20, color: BRAND_BLUE, marginRight: 8 }} />
          <Text strong style={{ fontSize: 16 }}>假期小时</Text>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="总小时"
              value={summary.total_leave_hours?.toFixed(1) || '0.0'}
              valueStyle={{ color: BRAND_BLUE, fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="上年度累计"
              value={summary.last_year_hours?.toFixed(1) || '0.0'}
              valueStyle={{ color: '#2b6cb0', fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="本年度"
              value={summary.current_year_hours?.toFixed(1) || '0.0'}
              valueStyle={{ color: BRAND_BLUE, fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="已使用"
              value={summary.used_leave_hours?.toFixed(1) || '0.0'}
              valueStyle={{ color: BRAND_GOLD, fontSize: 22 }}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Statistic
              title="剩余"
              value={summary.remaining_hours?.toFixed(1) || '0.0'}
              valueStyle={{
                color: (summary.remaining_hours || 0) > 0 ? '#52c41a' : '#ff4d4f',
                fontSize: 22,
              }}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Dashboard;
