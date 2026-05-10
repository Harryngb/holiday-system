import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  message,
  Typography,
  Popconfirm,
  Upload,
} from 'antd';
import { PlusOutlined, UploadOutlined, DownloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getUsers, createUser, updateUser, deleteUser, batchImportUsers } from '../api';
import * as XLSX from 'xlsx';

const { Title } = Typography;
const { Option } = Select;

const EmployeeManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      user_type: 'employee',
      last_year: '2025',
      current_year: '2026',
    });
    setModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingUser(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('已删除');
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      if (editingUser) {
        // 密码为空时不更新密码
        if (!values.password) {
          delete values.password;
        }
        await updateUser(editingUser.id, values);
        message.success('更新成功');
      } else {
        await createUser(values);
        message.success('创建成功');
      }

      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      if (err.response) {
        message.error(err.response.data?.detail || '操作失败');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // 处理批量导入
  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        setImportData(json);
        message.success(`已读取 ${json.length} 条记录`);
      } catch {
        message.error('文件解析失败，请检查格式');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleBatchImport = async () => {
    if (importData.length === 0) {
      message.warning('请先上传文件');
      return;
    }
    setSubmitLoading(true);
    try {
      await batchImportUsers(importData);
      message.success(`成功导入 ${importData.length} 条记录`);
      setImportModalOpen(false);
      setImportData([]);
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '导入失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const template = [
      {
        employee_id: '示例工号',
        last_year_days: 5,
        current_year_days: 10,
        total_leave_days: 15,
        used_leave_days: 3,
        remaining_days: 12,
        last_year_hours: 40,
        current_year_hours: 80,
        total_leave_hours: 120,
        used_leave_hours: 24,
        remaining_hours: 96,
        last_year: '2025',
        current_year: '2026',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, '导入模板');
    XLSX.writeFile(wb, '假期导入模板.xlsx');
  };

  const columns = [
    { title: '工号', dataIndex: 'employee_id', key: 'employee_id', width: 80 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 80 },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 80 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 150, ellipsis: true },
    {
      title: '角色',
      dataIndex: 'user_type',
      key: 'user_type',
      width: 80,
      render: (v: string) =>
        v === 'admin' ? '管理员' : v === 'supervisor' ? '主管' : '员工',
    },
    { title: '上年度天数', dataIndex: 'last_year_days', key: 'last_year_days', width: 80 },
    { title: '本年度天数', dataIndex: 'current_year_days', key: 'current_year_days', width: 80 },
    { title: '已用天数', dataIndex: 'used_leave_days', key: 'used_leave_days', width: 80 },
    { title: '剩余天数', dataIndex: 'remaining_days', key: 'remaining_days', width: 80 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, color: '#1a3c6e' }}>
          员工管理
        </Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
            下载导入模板
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
            批量导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
            style={{ background: '#1a3c6e', borderColor: '#1a3c6e' }}>
            新增员工
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
          size="small"
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingUser ? '编辑员工' : '新增员工'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitLoading}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        {editingUser && (
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <Popconfirm
              title="确认删除该员工？此操作不可恢复。"
              onConfirm={() => {
                handleDelete(editingUser.id);
                setModalOpen(false);
              }}
            >
              <Button danger icon={<DeleteOutlined />}>
                删除该员工
              </Button>
            </Popconfirm>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="employee_id" label="工号" rules={[{ required: true }]} style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="name" label="姓名" rules={[{ required: true }]} style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="username" label="用户名" rules={[{ required: true }]} style={{ width: 200 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="password" label="密码" rules={editingUser ? [] : [{ required: true }]} style={{ width: 200 }}>
              <Input.Password placeholder={editingUser ? '留空则不修改' : ''} />
            </Form.Item>
            <Form.Item name="email" label="邮箱" style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="user_type" label="用户类型" rules={[{ required: true }]} style={{ width: 200 }}>
              <Select>
                <Option value="employee">员工</Option>
                <Option value="supervisor">主管</Option>
                <Option value="admin">管理员</Option>
              </Select>
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="last_year" label="上一年度年份" style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="current_year" label="本年度年份" style={{ width: 200 }}>
              <Input />
            </Form.Item>
          </Space>

          <Title level={5} style={{ marginTop: 16 }}>天数</Title>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="last_year_days" label="上年度累计天数" style={{ width: 150 }}>
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="current_year_days" label="本年度天数" style={{ width: 150 }}>
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="used_leave_days" label="已用天数" style={{ width: 150 }}>
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Title level={5} style={{ marginTop: 16 }}>小时</Title>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="last_year_hours" label="上年度累计小时" style={{ width: 150 }}>
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="current_year_hours" label="本年度小时" style={{ width: 150 }}>
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="used_leave_hours" label="已用小时" style={{ width: 150 }}>
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal
        title="批量导入假期数据"
        open={importModalOpen}
        onCancel={() => { setImportModalOpen(false); setImportData([]); }}
        onOk={handleBatchImport}
        confirmLoading={submitLoading}
        okText="确认导入"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <p>请先下载模板，填写完成后上传Excel文件。</p>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={handleImportFile}
          >
            <Button icon={<UploadOutlined />}>上传Excel文件</Button>
          </Upload>
        </div>
        {importData.length > 0 && (
          <div>
            <p>已读取 <strong>{importData.length}</strong> 条记录，点击确认导入。</p>
            <Table
              dataSource={importData.slice(0, 5)}
              columns={[
                { title: '工号', dataIndex: 'employee_id', key: 'employee_id' },
                { title: '上年度天数', dataIndex: 'last_year_days', key: 'last_year_days' },
                { title: '本年度天数', dataIndex: 'current_year_days', key: 'current_year_days' },
              ]}
              rowKey="employee_id"
              size="small"
              pagination={false}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeManagement;
