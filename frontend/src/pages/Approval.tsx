import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Select,
  Input,
  InputNumber,
  message,
  Typography,
  Space,
  Descriptions,
  Alert,
  Tabs,
  Popconfirm,
} from 'antd';
import { CheckOutlined, CloseOutlined, ExclamationCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { getLeaves, approveLeave, rejectLeave, batchApproveLeaves, getUsers } from '../api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const LEAVE_TYPES = ['年假', '事假', '病假', '婚假', '丧假', '天转时'];

const Approval: React.FC = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userBalances, setUserBalances] = useState<Record<number, any>>({});
  const [approveModal, setApproveModal] = useState<{
    open: boolean;
    record: any;
  }>({ open: false, record: null });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; record: any }>({
    open: false,
    record: null,
  });
  const [deductionType, setDeductionType] = useState<string>('扣假');
  const [deductionDays, setDeductionDays] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [approveWarning, setApproveWarning] = useState<string | null>(null);

  // Search state
  const [searchName, setSearchName] = useState('');
  const [searchType, setSearchType] = useState<string | undefined>(undefined);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.user_type === 'admin';

  const handleBatchApprove = async () => {
    setBatchLoading(true);
    try {
      const result = await batchApproveLeaves();
      message.success(`已批量通过 ${result.count} 条申请`);
      if (result.warnings?.length > 0) {
        Modal.warning({
          title: '余额不足提醒',
          content: (
            <div>
              {result.warnings.map((w: any, i: number) => (
                <div key={i}>{w.user_name}：{w.warning}</div>
              ))}
            </div>
          ),
        });
      }
      fetchLeaves();
      fetchHistory();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '批量审批失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      let data: any[];
      if (isAdmin) {
        data = await getLeaves('pending');
        // Admin sees: supervisor leaves + small leaves (< 0.5 day or < 4 hours) from anyone
        setLeaves(data.filter((l: any) =>
          l.user_type === 'supervisor' ||
          (l.quantity < 0.5 && l.unit === 'day' && l.request_type === 'leave') ||
          (l.quantity < 4 && l.unit === 'hour' && l.request_type === 'leave')
        ));
      } else {
        data = await getLeaves('pending', undefined, true);
        // Supervisor sees: all pending except self, exclude small leaves (< 0.5 day or < 4 hours)
        setLeaves(data.filter((l: any) =>
          !(l.quantity < 0.5 && l.unit === 'day' && l.request_type === 'leave') &&
          !(l.quantity < 4 && l.unit === 'hour' && l.request_type === 'leave')
        ));
      }
      try {
        const users = await getUsers();
        const balanceMap: Record<number, any> = {};
        users.forEach((u: any) => {
          balanceMap[u.id] = u;
        });
        setUserBalances(balanceMap);
      } catch {
        // ignore
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getLeaves();
      setApprovalHistory(data.filter((r: any) => r.status !== 'pending'));
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchHistory();
  }, []);

  const statusMap: Record<string, { color: string; text: string }> = {
    pending: { color: 'orange', text: '待审批' },
    approved: { color: 'green', text: '已通过' },
    rejected: { color: 'red', text: '已拒绝' },
  };

  const getActualQuantity = (record: any) => {
    if (record.status === 'pending' || record.status === 'rejected') return '-';
    if (record.request_type === 'overtime') return record.quantity;
    if (record.deduction_type === '不扣假') return 0;
    if (record.deduction_days != null) return record.deduction_days;
    return record.quantity;
  };

  const needsDeduction = (record: any) =>
    record.request_type === 'leave' &&
    ['病假', '婚假', '丧假'].includes(record.leave_type);

  const isDayToHour = (record: any) =>
    record.request_type === 'leave' && record.leave_type === '天转时';

  const checkBalanceWarning = (record: any) => {
    const balance = userBalances[record.user_id];
    if (!balance) return null;

    if (isDayToHour(record)) {
      if (balance.last_year_days + balance.current_year_days < record.quantity) {
        const overdraft = record.quantity - (balance.last_year_days + balance.current_year_days);
        return `该员工天数余额不足（剩余 ${balance.last_year_days + balance.current_year_days} 天），通过后将倒欠 ${overdraft.toFixed(1)} 天`;
      }
    } else if (record.request_type === 'leave' && !needsDeduction(record)) {
      const remaining = record.unit === 'day'
        ? balance.last_year_days + balance.current_year_days
        : balance.last_year_hours + balance.current_year_hours;
      if (remaining < record.quantity) {
        const overdraft = record.quantity - remaining;
        const unitLabel = record.unit === 'day' ? '天' : '小时';
        return `该员工${unitLabel}余额不足（剩余 ${remaining.toFixed(1)} ${unitLabel}），通过后将倒欠 ${overdraft.toFixed(1)} ${unitLabel}`;
      }
    }
    return null;
  };

  const handleApprove = async () => {
    if (!approveModal.record) return;

    // 扣假天数校验
    if (needsDeduction(approveModal.record) && deductionType === '扣假') {
      if (deductionDays === null || deductionDays === undefined || deductionDays <= 0) {
        message.error('请填写扣假天数');
        return;
      }
      if (deductionDays > approveModal.record.quantity) {
        message.error(`扣假天数不能超过申请天数（${approveModal.record.quantity} 天）`);
        return;
      }
    }

    setActionLoading(true);
    try {
      const payload: any = { comment };
      if (needsDeduction(approveModal.record)) {
        payload.deduction_type = deductionType;
        if (deductionType === '扣假' && deductionDays !== null) {
          payload.deduction_days = deductionDays;
        }
      }
      const result = await approveLeave(approveModal.record.id, payload);
      const warning = result.warning || '';
      setApproveWarning(warning);

      message.success(warning ? `已审批通过（${warning}）` : '已审批通过');
      setApproveModal({ open: false, record: null });
      setComment('');
      setDeductionDays(null);
      setApproveWarning(null);
      fetchLeaves();
      fetchHistory();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.record) return;
    setActionLoading(true);
    try {
      await rejectLeave(rejectModal.record.id, { comment });
      message.success('已拒绝');
      setRejectModal({ open: false, record: null });
      setComment('');
      fetchLeaves();
      fetchHistory();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const getLeaveTypeLabel = (record: any) => {
    if (record.request_type === 'overtime') return '加班';
    if (record.leave_type === '天转时') return '天转时';
    return record.leave_type || '休假';
  };

  // Filter functions for search
  const filterRecords = (records: any[]) => {
    return records.filter((r) => {
      if (searchName && !r.user_name?.includes(searchName)) return false;
      if (searchType) {
        const label = getLeaveTypeLabel(r);
        if (label !== searchType && r.leave_type !== searchType) return false;
      }
      return true;
    });
  };

  const pendingColumns = [
    { title: '申请人', dataIndex: 'user_name', key: 'user_name', width: 80 },
    { title: '工号', dataIndex: 'user_employee_id', key: 'user_employee_id', width: 80 },
    {
      title: '类型',
      key: 'type',
      width: 70,
      render: (_: any, r: any) =>
        r.request_type === 'overtime' ? (
          <span style={{ color: '#1890ff', fontWeight: 'bold' }}>加班</span>
        ) : (
          getLeaveTypeLabel(r)
        ),
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 60 },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
      render: (v: string, r: any) => (isDayToHour(r) ? '天→时' : v === 'day' ? '天' : '小时'),
    },
    { title: '日期', dataIndex: 'start_date', key: 'start_date', width: 100 },
    { title: '说明', dataIndex: 'reason', key: 'reason', width: 120, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag>,
    },
    {
      title: '实际数量',
      key: 'actual_quantity',
      width: 70,
      render: (_: any, r: any) => getActualQuantity(r),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: any) =>
        record.status === 'pending' ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => {
                setApproveWarning(checkBalanceWarning(record));
                setDeductionDays(record.quantity);
                setApproveModal({ open: true, record });
              }}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              同意
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setRejectModal({ open: true, record })}
            >
              拒绝
            </Button>
          </Space>
        ) : null,
    },
  ];

  const historyColumns = [
    { title: '申请人', dataIndex: 'user_name', key: 'user_name', width: 80 },
    { title: '工号', dataIndex: 'user_employee_id', key: 'user_employee_id', width: 80 },
    {
      title: '类型',
      key: 'type',
      width: 70,
      render: (_: any, r: any) =>
        r.request_type === 'overtime' ? (
          <span style={{ color: '#1890ff', fontWeight: 'bold' }}>加班</span>
        ) : (
          getLeaveTypeLabel(r)
        ),
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 60 },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 50,
      render: (v: string) => (v === 'day' ? '天' : '小时'),
    },
    { title: '日期', dataIndex: 'start_date', key: 'start_date', width: 100 },
    {
      title: '结果',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag>,
    },
    {
      title: '实际数量',
      key: 'actual_quantity',
      width: 70,
      render: (_: any, r: any) => getActualQuantity(r),
    },
    {
      title: '审批意见',
      dataIndex: 'approval_comment',
      key: 'approval_comment',
      width: 120,
      ellipsis: true,
    },
    {
      title: '审批人',
      dataIndex: 'approver_name',
      key: 'approver_name',
      width: 80,
    },
    {
      title: '审批时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 100,
      render: (v: string) => v?.split('T')[0],
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24, color: '#1a3c6e' }}>
        审批中心
      </Title>

      {/* Search bar */}
      <Card style={{ marginBottom: 16, padding: '12px 24px' }} size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space wrap>
            <Space>
              <SearchOutlined style={{ color: '#999' }} />
              <Input
                placeholder="搜索申请人..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                style={{ width: 180 }}
                allowClear
              />
            </Space>
            <Select
              placeholder="假期类型"
              value={searchType}
              onChange={setSearchType}
              style={{ width: 140 }}
              allowClear
            >
              {LEAVE_TYPES.map((t) => (
                <Option key={t} value={t}>{t}</Option>
              ))}
              <Option value="加班">加班</Option>
            </Select>
          </Space>
          <Popconfirm
            title="一键审批所有符合条件的申请？（病假/婚假/丧假除外）"
            onConfirm={handleBatchApprove}
          >
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={batchLoading}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              一键审批
            </Button>
          </Popconfirm>
        </div>
      </Card>

      <Tabs
        items={[
          {
            key: 'pending',
            label: '待审批申请',
            children: (
              <Card>
                <Table
                  dataSource={filterRecords(leaves.filter((l) => l.status === 'pending'))}
                  columns={pendingColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: 900 }}
                />
              </Card>
            ),
          },
          {
            key: 'history',
            label: '过往审批记录',
            children: (
              <Card>
                <Table
                  dataSource={filterRecords(approvalHistory)}
                  columns={historyColumns}
                  rowKey="id"
                  loading={historyLoading}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  scroll={{ x: 900 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* 审批同意弹窗 */}
      <Modal
        title="审批同意"
        open={approveModal.open}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModal({ open: false, record: null });
          setComment('');
          setDeductionDays(null);
          setApproveWarning(null);
        }}
        confirmLoading={actionLoading}
        okText="确认同意"
        cancelText="取消"
        okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
      >
        {approveModal.record && (
          <div>
            <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="申请人">
                {approveModal.record.user_name}
              </Descriptions.Item>
              <Descriptions.Item label="申请类型">
                {getLeaveTypeLabel(approveModal.record)}
              </Descriptions.Item>
              <Descriptions.Item label="数量">
                {approveModal.record.quantity}{' '}
                {approveModal.record.unit === 'day' ? '天' : '小时'}
                {isDayToHour(approveModal.record) && (
                  <span style={{ color: '#1890ff', marginLeft: 4 }}>
                    → {approveModal.record.quantity * 8} 小时
                  </span>
                )}
              </Descriptions.Item>
            </Descriptions>

            {isDayToHour(approveModal.record) && (
              <Alert
                message="天转时换算说明"
                description={`扣除 ${approveModal.record.quantity} 天，增加 ${(approveModal.record.quantity * 8).toFixed(1)} 小时到本年度小时余额`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {approveWarning && (
              <Alert
                message="余额不足提醒"
                description={approveWarning}
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}

            {needsDeduction(approveModal.record) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 'bold' }}>扣假选项：</span>
                  <Select
                    value={deductionType}
                    onChange={(v) => {
                      setDeductionType(v);
                      if (v === '扣假') {
                        setDeductionDays(approveModal.record.quantity);
                      }
                    }}
                    style={{ width: 200, marginLeft: 8 }}
                  >
                    <Option value="扣假">扣假（正常扣除假期余额）</Option>
                    <Option value="不扣假">不扣假（仅记录不扣除）</Option>
                  </Select>
                </div>
                {deductionType === '扣假' && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontWeight: 'bold' }}>扣假天数：</span>
                    <InputNumber
                      min={0.5}
                      step={0.5}
                      value={deductionDays}
                      onChange={(v) => setDeductionDays(v)}
                      style={{ width: 200, marginLeft: 8 }}
                    />
                    <span style={{ marginLeft: 8, color: '#888' }}>
                      （最多 {approveModal.record.quantity} 天）
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <span style={{ fontWeight: 'bold' }}>审批意见（可选）：</span>
              <TextArea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="输入审批意见..."
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 拒绝弹窗 */}
      <Modal
        title="审批拒绝"
        open={rejectModal.open}
        onOk={handleReject}
        onCancel={() => {
          setRejectModal({ open: false, record: null });
          setComment('');
        }}
        confirmLoading={actionLoading}
        okText="确认拒绝"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <div>
          <span style={{ fontWeight: 'bold' }}>拒绝理由（可选）：</span>
          <TextArea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="输入拒绝理由..."
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Approval;
