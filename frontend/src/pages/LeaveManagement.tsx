import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  DatePicker,
  TimePicker,
  InputNumber,
  Input,
  Button,
  Tabs,
  Table,
  Tag,
  message,
  Typography,
  Space,
} from 'antd';
import { createLeave, getLeaves } from '../api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const LEAVE_TYPES = ['年假', '事假', '病假', '婚假', '丧假', '天转时'];

function countWeekdays(start: dayjs.Dayjs, end: dayjs.Dayjs) {
  let count = 0;
  let cur = start;
  while (cur.isBefore(end) || cur.isSame(end, 'day')) {
    const d = cur.day();
    if (d !== 0 && d !== 6) count++;
    cur = cur.add(1, 'day');
  }
  return count;
}

function totalDays(start: dayjs.Dayjs, end: dayjs.Dayjs) {
  return end.diff(start, 'day') + 1;
}

const LeaveManagement: React.FC = () => {
  const [leaveForm] = Form.useForm();
  const [overtimeForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(true);

  const leaveDateRange = Form.useWatch('date_range', leaveForm);
  const leaveUnit = Form.useWatch('unit', leaveForm);
  const leaveType = Form.useWatch('leave_type', leaveForm);
  const overtimeDateRange = Form.useWatch('date_range', overtimeForm);
  const overtimeUnit = Form.useWatch('unit', overtimeForm);
  const overtimeStartTime = Form.useWatch('start_time', overtimeForm);
  const overtimeEndTime = Form.useWatch('end_time', overtimeForm);
  const overtimeQty = Form.useWatch('quantity', overtimeForm);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Auto-calculate weekdays for leave form when unit=day
  useEffect(() => {
    if (leaveDateRange && leaveDateRange[0] && leaveDateRange[1] && leaveUnit === 'day') {
      const wd = countWeekdays(leaveDateRange[0], leaveDateRange[1]);
      const td = totalDays(leaveDateRange[0], leaveDateRange[1]);
      const weekends = td - wd;
      leaveForm.setFieldsValue({ quantity: wd });
      if (weekends > 0) {
        leaveForm.setFieldsValue({ _weekend_note: `（已扣除 ${weekends} 天周末）` });
      } else {
        leaveForm.setFieldsValue({ _weekend_note: undefined });
      }
    }
  }, [leaveDateRange, leaveUnit]);

  // Auto-calculate weekdays for overtime form when unit=day
  useEffect(() => {
    if (overtimeDateRange && overtimeDateRange[0] && overtimeDateRange[1] && overtimeUnit === 'day') {
      const wd = countWeekdays(overtimeDateRange[0], overtimeDateRange[1]);
      overtimeForm.setFieldsValue({ quantity: wd });
    }
  }, [overtimeDateRange, overtimeUnit]);

  // Auto-calculate overtime end_time from start_time + quantity, or quantity from start_time + end_time
  useEffect(() => {
    if (overtimeUnit !== 'hour') return;
    const st = overtimeStartTime;
    const et = overtimeEndTime;
    const qty = overtimeQty;

    if (st && et) {
      // Both times set → calculate quantity (duration in hours)
      const diffMin = et.diff(st, 'minute');
      if (diffMin > 0) {
        const hours = Math.round(diffMin / 60 * 4) / 4;
        overtimeForm.setFieldsValue({ quantity: hours });
      }
    } else if (st && qty) {
      // Start time + quantity set → calculate end time
      overtimeForm.setFieldsValue({ end_time: st.add(qty, 'hour') });
    }
  }, [overtimeStartTime, overtimeEndTime, overtimeQty, overtimeUnit]);

  const fetchLeaves = async () => {
    try {
      const data = await getLeaves();
      setLeaves(data.filter((l: any) => l.user_id === currentUser.id));
    } catch {
      // ignore
    } finally {
      setLeavesLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const calcDays = (values: any) => {
    if (values.date_range && values.date_range[0] && values.date_range[1] && values.unit === 'day') {
      return countWeekdays(values.date_range[0], values.date_range[1]);
    }
    return null;
  };

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

  const columns = [
    { title: '日期', dataIndex: 'start_date', key: 'start_date', width: 100 },
    {
      title: '类型',
      dataIndex: 'request_type',
      key: 'request_type',
      width: 80,
      render: (v: string) =>
        v === 'overtime' ? <span style={{ color: '#1890ff', fontWeight: 'bold' }}>加班</span> : '休假',
    },
    {
      title: '事由',
      key: 'reason',
      width: 100,
      render: (_: any, r: any) =>
        r.request_type === 'leave' ? r.leave_type : r.overtime_reason,
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 60 },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
      render: (v: string) => (v === 'day' ? '天' : '小时'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => (
        <Tag color={statusMap[v]?.color}>{statusMap[v]?.text}</Tag>
      ),
    },
    {
      title: '实际数量',
      key: 'actual_quantity',
      width: 80,
      render: (_: any, r: any) => getActualQuantity(r),
    },
    { title: '审批意见', dataIndex: 'approval_comment', key: 'approval_comment', width: 120 },
    { title: '审批人', dataIndex: 'approver_name', key: 'approver_name', width: 80 },
  ];

  const handleLeaveSubmit = async (values: any) => {
    const calculated = calcDays(values);
    if (calculated !== null && values.quantity !== calculated) {
      const td = totalDays(values.date_range[0], values.date_range[1]);
      message.error(`日期范围为 ${td} 天（含 ${td - calculated} 天周末），实际工作日为 ${calculated} 天，与填写的 ${values.quantity} 天不符`);
      return;
    }
    setLoading(true);
    try {
      const startDate = values.date_range[0].format('YYYY-MM-DD');
      const endDate = values.date_range[1].format('YYYY-MM-DD');
      await createLeave({
        request_type: 'leave',
        start_date: startDate,
        end_date: endDate,
        quantity: values.quantity,
        unit: values.unit,
        leave_type: values.leave_type,
        reason: values.reason || '',
      });
      message.success('休假申请已提交');
      leaveForm.resetFields();
      fetchLeaves();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOvertimeSubmit = async (values: any) => {
    const calculated = calcDays(values);
    if (calculated !== null && values.quantity !== calculated) {
      const td = totalDays(values.date_range[0], values.date_range[1]);
      message.error(`日期范围为 ${td} 天（含 ${td - calculated} 天周末），实际工作日为 ${calculated} 天，与填写的 ${values.quantity} 天不符`);
      return;
    }
    setLoading(true);
    try {
      const startDate = values.date_range[0].format('YYYY-MM-DD');
      const endDate = values.date_range[1].format('YYYY-MM-DD');
      const payload: any = {
        request_type: 'overtime',
        start_date: startDate,
        end_date: endDate,
        quantity: values.quantity,
        unit: values.unit,
        overtime_reason: values.overtime_reason,
      };
      if (values.unit === 'hour' && values.start_time && values.end_time) {
        payload.start_time = values.start_time.format('HH:mm');
        payload.end_time = values.end_time.format('HH:mm');
      }
      await createLeave(payload);
      message.success('加班申请已提交');
      overtimeForm.resetFields();
      fetchLeaves();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const weekendNote = Form.useWatch('_weekend_note', leaveForm);

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24, color: '#1a3c6e' }}>
        假期管理
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <Tabs
          items={[
            {
              key: 'leave',
              label: '休假申请',
              children: (
                <Form form={leaveForm} layout="vertical" onFinish={handleLeaveSubmit}>
                  <Form.Item
                    name="date_range"
                    label="日期范围"
                    rules={[{ required: true, message: '请选择日期' }]}
                  >
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                  <Space style={{ width: '100%' }} size="large">
                    <Form.Item
                      name="quantity"
                      label="数量"
                      rules={[{ required: true, message: '请输入数量' }]}
                      style={{ width: 200 }}
                    >
                      <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name="unit"
                      label="单位"
                      rules={[{ required: true, message: '请选择单位' }]}
                      style={{ width: 200 }}
                      initialValue="day"
                    >
                      <Select>
                        <Option value="day">天</Option>
                        <Option value="hour">小时</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      name="leave_type"
                      label="事由"
                      rules={[{ required: true, message: '请选择事由' }]}
                      style={{ width: 200 }}
                    >
                      <Select
                        placeholder="请选择假期类型"
                        onChange={(v) => {
                          if (v === '天转时') leaveForm.setFieldsValue({ unit: 'day' });
                        }}
                      >
                        {LEAVE_TYPES.map((t) => (
                          <Option key={t} value={t}>
                            {t}
                            {t === '天转时' ? '（1天=8小时）' : ''}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Space>
                  {weekendNote && (
                    <div style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
                      {weekendNote}
                    </div>
                  )}
                  {leaveType === '天转时' && (
                    <div style={{ color: '#faad14', fontSize: 12, marginBottom: 16 }}>
                      天转时：选择天数后将按 1天=8小时 换算，扣除天数的同时增加小时余额
                    </div>
                  )}
                  <Form.Item name="reason" label="说明（可选）">
                    <TextArea rows={2} placeholder="补充说明..." />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      style={{ background: '#1a3c6e', borderColor: '#1a3c6e' }}
                    >
                      提交申请
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'overtime',
              label: '加班申请',
              children: (
                <Form
                  form={overtimeForm}
                  layout="vertical"
                  onFinish={handleOvertimeSubmit}
                >
                  <Form.Item
                    name="date_range"
                    label="日期范围"
                    rules={[{ required: true, message: '请选择日期' }]}
                  >
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                  <Space style={{ width: '100%' }} size="large">
                    <Form.Item
                      name="quantity"
                      label="数量"
                      rules={[{ required: true, message: '请输入数量' }]}
                      style={{ width: 200 }}
                    >
                      <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name="unit"
                      label="单位"
                      rules={[{ required: true, message: '请选择单位' }]}
                      style={{ width: 200 }}
                      initialValue="hour"
                    >
                      <Select>
                        <Option value="day">天</Option>
                        <Option value="hour">小时</Option>
                      </Select>
                    </Form.Item>
                  </Space>
                  {overtimeUnit === 'hour' && (
                    <Space style={{ width: '100%' }} size="large">
                      <Form.Item
                        name="start_time"
                        label="开始时间"
                        rules={[{ required: true, message: '请选择开始时间' }]}
                      >
                        <TimePicker format="HH:mm" minuteStep={15} />
                      </Form.Item>
                      <Form.Item
                        name="end_time"
                        label="结束时间"
                        rules={[{ required: true, message: '请选择结束时间' }]}
                      >
                        <TimePicker format="HH:mm" minuteStep={15} />
                      </Form.Item>
                    </Space>
                  )}
                  <Form.Item
                    name="overtime_reason"
                    label="加班事由"
                    rules={[{ required: true, message: '请填写加班事由' }]}
                  >
                    <TextArea rows={2} placeholder="请详细说明加班原因..." />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      style={{ background: '#1a3c6e', borderColor: '#1a3c6e' }}
                    >
                      提交申请
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>

      <Card title="我的申请记录">
        <Table
          dataSource={leaves}
          columns={columns}
          rowKey="id"
          loading={leavesLoading}
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 700 }}
        />
      </Card>
    </div>
  );
};

export default LeaveManagement;
