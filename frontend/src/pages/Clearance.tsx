import React, { useState } from 'react';
import {
  Card,
  Button,
  Table,
  message,
  Typography,
  Space,
  Popconfirm,
  Modal,
} from 'antd';
import { DeleteOutlined, HistoryOutlined, UndoOutlined } from '@ant-design/icons';
import { resetClearance, getClearanceRecords, undoClearance } from '../api';

const { Title, Paragraph, Text } = Typography;

const Clearance: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: any }>({
    open: false,
    record: null,
  });

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const data = await getClearanceRecords();
      setRecords(data);
    } catch {
      message.error('获取清零记录失败');
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleReset = async () => {
    setResetLoading(true);
    try {
      const result = await resetClearance(notes || undefined);
      message.success(`清零操作成功！已清零 ${result.details_count || ''} 名员工的上年度假期数据。`);
      setConfirmOpen(false);
      setNotes('');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '清零失败');
    } finally {
      setResetLoading(false);
    }
  };

  const handleShowRecords = () => {
    fetchRecords();
    setShowRecords(true);
  };

  const handleUndo = async () => {
    setUndoLoading(true);
    try {
      const result = await undoClearance();
      message.success(result.message || '已撤销最近一次清零操作');
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '撤销失败');
    } finally {
      setUndoLoading(false);
    }
  };

  const detailColumns = [
    { title: '工号', dataIndex: 'employee_id', key: 'employee_id', width: 80 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 80 },
    { title: '清零天数', dataIndex: 'cleared_days', key: 'cleared_days', width: 80 },
    { title: '清零小时', dataIndex: 'cleared_hours', key: 'cleared_hours', width: 80 },
  ];

  const columns = [
    { title: '操作时间', dataIndex: 'cleared_at', key: 'cleared_at', width: 180 },
    { title: '操作人', dataIndex: 'admin_name', key: 'admin_name', width: 100 },
    { title: '清零人数', key: 'details_count', width: 80, render: (_: any, r: any) => r.details?.length || 0 },
    {
      title: '清零详情',
      key: 'action',
      width: 100,
      render: (_: any, record: any) =>
        record.details?.length > 0 ? (
          <Button size="small" type="link" onClick={() => setDetailModal({ open: true, record })}>
            查看详情
          </Button>
        ) : null,
    },
    { title: '备注', dataIndex: 'notes', key: 'notes', width: 200 },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24, color: '#1a3c6e' }}>
        假期清零管理
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Title level={3} style={{ color: '#ff4d4f' }}>
            ⚠ 一键清零操作
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 16 }}>
            此操作将把所有员工的上一年度假期天数/小时置零。
            <br />
            清零后可在清零记录中<Text strong>撤销</Text>最近一次操作恢复数据。
          </Paragraph>
          <Space size="large" style={{ marginTop: 24 }}>
            <Popconfirm
              title="确认清零？"
              description="此操作不可撤销，所有员工的上年度假期将清零。确定要继续吗？"
              open={confirmOpen}
              onConfirm={handleReset}
              onCancel={() => setConfirmOpen(false)}
              okText="确认清零"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="primary"
                danger
                size="large"
                icon={<DeleteOutlined />}
                loading={resetLoading}
                onClick={() => setConfirmOpen(true)}
                style={{ height: 48, padding: '0 32px' }}
              >
                一键清零
              </Button>
            </Popconfirm>
            <Button
              size="large"
              icon={<HistoryOutlined />}
              onClick={handleShowRecords}
              style={{ height: 48, padding: '0 32px' }}
            >
              查看清零记录
            </Button>
          </Space>
        </div>
      </Card>

      {showRecords && (
        <Card
          title="清零记录"
          extra={
            <Space>
              <Popconfirm title="撤销最近一次清零操作？" onConfirm={handleUndo}>
                <Button size="small" icon={<UndoOutlined />} loading={undoLoading}>
                  撤销最近清零
                </Button>
              </Popconfirm>
              <Button size="small" onClick={() => setShowRecords(false)}>
                关闭
              </Button>
            </Space>
          }
        >
          <Table
            dataSource={records}
            columns={columns}
            rowKey="id"
            loading={recordsLoading}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>
      )}

      {/* 清零详情弹窗 */}
      <Modal
        title="清零员工详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, record: null })}
        footer={null}
        width={600}
      >
        {detailModal.record && (
          <div>
            <Paragraph>
              操作时间：{detailModal.record.cleared_at} | 操作人：{detailModal.record.admin_name}
              {detailModal.record.notes ? ` | 备注：${detailModal.record.notes}` : ''}
            </Paragraph>
            <Table
              dataSource={detailModal.record.details}
              columns={detailColumns}
              rowKey="employee_id"
              size="small"
              pagination={false}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><Text strong>合计</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  <Table.Summary.Cell index={2}>
                    <Text strong>
                      {detailModal.record.details.reduce((s: number, d: any) => s + (d.cleared_days || 0), 0).toFixed(1)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <Text strong>
                      {detailModal.record.details.reduce((s: number, d: any) => s + (d.cleared_hours || 0), 0).toFixed(1)}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Clearance;
