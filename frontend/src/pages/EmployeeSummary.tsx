import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Spin } from 'antd';
import { getEmployeeSummary } from '../api';

const { Title } = Typography;

const EmployeeSummary: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getEmployeeSummary();
        setEmployees(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { title: '工号', dataIndex: 'employee_id', key: 'employee_id', width: 100 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    {
      title: '角色',
      dataIndex: 'user_type',
      key: 'user_type',
      width: 80,
      render: (v: string) =>
        v === 'admin' ? '管理员' : v === 'supervisor' ? '主管' : '员工',
    },
    { title: '总天数', dataIndex: 'total_leave_days', key: 'total_leave_days', width: 80 },
    { title: '已用天数', dataIndex: 'used_leave_days', key: 'used_leave_days', width: 80 },
    {
      title: '剩余天数',
      dataIndex: 'remaining_days',
      key: 'remaining_days',
      width: 80,
      render: (v: number) => (
        <span style={{ color: v < 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
          {v.toFixed(1)}
        </span>
      ),
    },
    { title: '总小时', dataIndex: 'total_leave_hours', key: 'total_leave_hours', width: 80 },
    { title: '已用小时', dataIndex: 'used_leave_hours', key: 'used_leave_hours', width: 80 },
    {
      title: '剩余小时',
      dataIndex: 'remaining_hours',
      key: 'remaining_hours',
      width: 80,
      render: (v: number) => (
        <span style={{ color: v < 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
          {v.toFixed(1)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24, color: '#1a3c6e' }}>
        员工假期汇总
      </Title>
      <Card>
        <Table
          dataSource={employees}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          size="small"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default EmployeeSummary;
