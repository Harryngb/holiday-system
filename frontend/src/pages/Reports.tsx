import React from 'react';
import { Card, Button, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getReportUrl } from '../api';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

const Reports: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const currentYear = user.current_year || '2026';

  const handleExport = () => {
    const token = localStorage.getItem('token');
    const url = getReportUrl();
    const today = dayjs().format('YYYY年MM月DD日');

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('导出失败');
        return res.blob();
      })
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Fugistics_Hub_Ningbo_${currentYear}_假期报表_${today}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
        message.success('报表下载成功');
      })
      .catch((err) => {
        message.error(err.message || '导出失败');
      });
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24, color: '#1a3c6e' }}>
        报表导出
      </Title>

      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Title level={3}>Fugistics Hub Ningbo {currentYear}年度假期报表</Title>
          <Paragraph type="secondary">
            {user.user_type === 'employee'
              ? '导出您个人的假期数据'
              : '导出所有员工的假期汇总及明细数据'}
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            包含假期汇总表和假期明细表两张工作表
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{
              background: '#1a3c6e',
              borderColor: '#1a3c6e',
              height: 48,
              padding: '0 32px',
              borderRadius: 8,
            }}
          >
            下载 Excel 报表
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
