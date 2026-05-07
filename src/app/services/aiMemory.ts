const SENSITIVE_MEMORY_PATTERN = /(?:密码|密钥|api\s*key|token|验证码|身份证|银行卡|信用卡|手机号|电话号码|门牌|小区|病历|诊断|药物|工资|收入|贷款)/i;
const ONE_OFF_MEMORY_PATTERN = /(?:今天|明天|后天|今晚|这周|下周|月底|稍后|一会儿|这次|本次|临时|待办|任务|提醒|安排|新增|推荐下一步|发给|提交|处理|完成|预约|购买|制作|更新|检查|整理|开会|联系|回复|发送|交付|发布|条视频|分钟|小时)/;
const STABLE_MEMORY_PATTERN = /(?:默认|经常|通常|一般|每天|每周|工作日|周末|长期|固定|习惯|偏好|喜欢|不喜欢|倾向|优先|避免|作息|通勤|上班|住在|工作地点|办公地点|行业|岗位|公司|律所|学校|家庭|孩子|宠物)/;
const IDENTITY_MEMORY_PATTERN = /(?:^我(?:在|住在|从事|负责|是|属于|常在|通常|一般|习惯|偏好|喜欢|不喜欢)|我的(?:工作|公司|行业|岗位|城市|通勤|作息|偏好|习惯|家庭|孩子|宠物)|本人|家里|公司)/;

export function normalizeAiMemoryContent(value: unknown) {
  const raw = typeof value === 'string' ? value : '';
  return raw
    .trim()
    .replace(/^(?:用户|该用户|这位用户)的(?=\S)/, '我的')
    .replace(/^(?:用户|该用户|这位用户)(?=在|住|从事|负责|是|属于|常|经常|通常|一般|习惯|偏好|喜欢|不喜欢|需要|希望|倾向|关注|上班|通勤)/, '我')
    .replace(/^(?:用户|该用户|这位用户)[:：]\s*/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
}

export function isDurableAiMemoryContent(value: unknown) {
  const content = normalizeAiMemoryContent(value);
  if (content.length < 4 || content.length > 240) return false;
  if (SENSITIVE_MEMORY_PATTERN.test(content)) return false;

  const hasStableSignal = STABLE_MEMORY_PATTERN.test(content);
  const hasIdentitySignal = IDENTITY_MEMORY_PATTERN.test(content);
  if (!hasStableSignal && !hasIdentitySignal) return false;

  // 单次任务、临时截止时间或普通执行动作不进入长期记忆，除非句子同时有明确的稳定习惯信号。
  if (ONE_OFF_MEMORY_PATTERN.test(content) && !hasStableSignal) return false;
  return true;
}
