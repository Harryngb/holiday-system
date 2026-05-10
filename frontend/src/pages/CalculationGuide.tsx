import React from 'react';
import { Card, Typography, Descriptions, Tag, Divider, Alert, Space, Steps } from 'antd';
import {
  InfoCircleOutlined,
  WarningOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const CalculationGuide: React.FC = () => {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24, color: '#1a3c6e' }}>
        <InfoCircleOutlined /> 操作说明
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><CalendarOutlined /> 一、假期类型</Title>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={<Tag color="blue">年假</Tag>}>
            年度法定带薪假期。审批通过后正常扣除假期余额。
          </Descriptions.Item>
          <Descriptions.Item label={<Tag color="orange">事假</Tag>}>
            因个人事务请假。审批通过后正常扣除假期余额。
          </Descriptions.Item>
          <Descriptions.Item label={<Tag color="red">病假</Tag>}>
            因病请假。审批时需选择<Text strong>扣假</Text>或<Text strong>不扣假</Text>。
            <br />- 扣假：正常扣除假期余额
            <br />- 不扣假：仅做记录，不扣除余额
          </Descriptions.Item>
          <Descriptions.Item label={<Tag color="purple">婚假</Tag>}>
            结婚休假。审批规则同病假（可选扣假/不扣假）。
          </Descriptions.Item>
          <Descriptions.Item label={<Tag color="gray">丧假</Tag>}>
            丧事休假。审批规则同病假（可选扣假/不扣假）。
          </Descriptions.Item>
          <Descriptions.Item label={<Tag color="green">天转时</Tag>}>
            将天数余额转为小时。1天=8小时。<br />
            审批通过后扣除天数，同时等值增加小时余额。
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><CheckCircleOutlined /> 二、员工操作指南</Title>
        <Steps
          direction="vertical"
          current={-1}
          size="small"
          items={[
            {
              title: '登录系统',
              description: '使用管理员分配的用户名和密码登录。首页（仪表盘）可查看自己的假期余额概览。',
            },
            {
              title: '提交休假申请',
              description: '进入"假期管理" → 选择"休假申请" → 选择日期范围、假期类型和数量。系统会自动扣除周末天数。',
            },
            {
              title: '提交加班申请',
              description: '进入"假期管理" → 选择"加班申请" → 选择日期范围和时长。选"小时"时可填开始时间和数量，结束时间自动计算。',
            },
            {
              title: '查看申请记录',
              description: '在"假期管理"下方的"我的申请记录"表中可查看所有申请的状态（待审批/已通过/已拒绝）。',
            },
            {
              title: '导出报表',
              description: '进入"报表"页面，点击"导出报表"下载 Excel 文件，包含汇总和明细两个工作表。',
            },
          ]}
        />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><SearchOutlined /> 三、审批操作指南</Title>
        <Paragraph>
          主管和管理员可在"审批中心"处理待审批申请。
        </Paragraph>
        <Steps
          direction="vertical"
          current={-1}
          size="small"
          items={[
            {
              title: '查看待审批列表',
              description: '审批中心默认显示所有待审批申请。可使用搜索栏按申请人姓名或假期类型筛选。',
            },
            {
              title: '审批同意',
              description: '点击"同意"按钮 → 可按需填写审批意见 → 确认提交。病假/婚假/丧假需先选择"扣假"或"不扣假"。',
            },
            {
              title: '一键批量审批',
              description: '点击搜索栏右侧绿色"一键审批"按钮，可一次性通过所有符合条件的申请（病假/婚假/丧假除外）。',
            },
            {
              title: '审批拒绝',
              description: '点击"拒绝"按钮 → 填写拒绝理由（可选）→ 确认提交。',
            },
            {
              title: '查看审批历史',
              description: '在"过往审批记录"标签页可查看已处理的历史记录。',
            },
          ]}
        />
        <Divider />
        <Alert
          message="审批规则说明"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><Text strong>员工申请</Text>：由主管或管理员审批</li>
              <li><Text strong>主管申请</Text>：仅管理员可审批</li>
              <li><Text strong>小额假期</Text>（&lt;0.5天或&lt;4小时）：仅管理员审批，不经过主管</li>
              <li><Text strong>管理员</Text>可审批自己的小额申请</li>
            </ul>
          }
          type="info"
          showIcon
        />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><SwapOutlined /> 四、余额扣除规则</Title>
        <Paragraph>
          休假审批通过后，系统按以下顺序扣除假期余额：
        </Paragraph>
        <Space direction="vertical" style={{ width: '100%', paddingLeft: 16 }}>
          <Text>1. <Text strong>优先扣除上一年度</Text>余额</Text>
          <Text>2. 上年度余额不足时，<Text strong>再扣本年度</Text>余额</Text>
          <Text>3. 本年度余额也不足时，允许<Text strong>倒欠</Text>（余额为负），审批时有醒目提醒</Text>
        </Space>
        <Divider />
        <Alert
          message="示例"
          description={
            <Text>
              员工上年度剩余5天，本年度10天，申请年假7天：
              <br />→ 先扣上年度5天（剩余0），再扣本年度2天（剩余8天）
              <br />→ 已用天数+7，剩余天数=0+8=8天
            </Text>
          }
          type="info"
          showIcon
        />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><ClockCircleOutlined /> 五、加班规则</Title>
        <Paragraph>
          加班审批通过后，系统<Text strong>增加</Text>假期余额：
        </Paragraph>
        <ul>
          <li>加班时长计入<Text strong>本年度小时</Text>余额</li>
          <li>加班天数计入<Text strong>本年度天数</Text>余额（按天计算时）</li>
          <li>加班不影响上年度余额</li>
        </ul>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><SwapOutlined /> 六、天转时换算</Title>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="换算比例">1天 = 8小时，0.5天 = 4小时</Descriptions.Item>
          <Descriptions.Item label="扣除规则">扣除天数（先扣上年度，再扣本年度）</Descriptions.Item>
          <Descriptions.Item label="增加规则">增加小时到本年度小时余额</Descriptions.Item>
          <Descriptions.Item label="示例">
            申请1.5天转时：
            <br />→ 扣除1.5天，同时增加1.5×8=12小时
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><TeamOutlined /> 七、角色权限</Title>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={<Tag color="green">员工</Tag>}>
            提交休假/加班申请，查看个人数据，导出个人报表
          </Descriptions.Item>
          <Descriptions.Item label={<Tag color="blue">主管</Tag>}>
            员工权限 + 审批员工申请（含扣假/不扣假）+ 查看所有员工数据
          </Descriptions.Item>
          <Descriptions.Item label={<Tag color="red">管理员</Tag>}>
            全部权限 + 审批主管申请 + 员工管理 + 批量导入 + 一键清零
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><FileTextOutlined /> 八、报表说明</Title>
        <ul>
          <li><Text strong>报表标题</Text>：nVision Global Ningbo {new Date().getFullYear()}年度假期汇总</li>
          <li><Text strong>员工</Text>：只能导出自己的数据</li>
          <li><Text strong>主管/管理员</Text>：可导出全部员工数据</li>
          <li>报表包含两个工作表："假期汇总"（余额概览）和"假期明细"（每条申请记录）</li>
        </ul>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><ThunderboltOutlined /> 九、管理员功能</Title>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="员工管理">
            新增/编辑/删除员工档案，维护假期余额
          </Descriptions.Item>
          <Descriptions.Item label="批量导入">
            下载模板 → 填写员工假期数据 → 上传Excel批量更新余额
          </Descriptions.Item>
          <Descriptions.Item label="一键清零">
            将全部员工的上年度余额清零，操作有记录备查
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}><WarningOutlined /> 十、注意事项</Title>
        <ul>
          <li>假期余额不足时允许<Text strong>倒欠</Text>，审批时会有醒目提醒</li>
          <li>上年度假期余额管理员可<Text strong>一键清零</Text>，清零后有记录备查</li>
          <li><Text strong>病假/婚假/丧假</Text>审批时需选择扣假或不扣假，"不扣假"仅记录不扣余额</li>
          <li><Text strong>加班</Text>审批同意后增加余额，<Text strong>休假</Text>则扣除余额</li>
          <li><Text strong>天转时</Text>同时扣除天数增加小时，总量等值换算（1天=8小时）</li>
          <li>实际数量列显示最终扣除的假期天数（病假/婚假/丧假可能部分扣假或不扣假）</li>
        </ul>
      </Card>
    </div>
  );
};

export default CalculationGuide;
