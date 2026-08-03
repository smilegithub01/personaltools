// 云函数 aiProxy —— 智能生长 · AI 对话教练
// 职责：接收用户消息 + 用户健康上下文，安全调用 NVIDIA NIM，返回 AI 回复。
// 安全：API Key 只存在于云函数环境变量，前端永不接触。

// ===== 配置（在云函数环境变量里设置，不要写死在前端）=====
// 在「云开发控制台 → 云函数 → aiProxy → 配置 → 环境变量」中填写：
//   NVIDIA_NIM_URL  = 你的 NIM inference URL，例如 https://integrate.api.nvidia.com/v1/chat/completions
//   NVIDIA_API_KEY  = 你的 NVIDIA API Key
//   NVIDIA_MODEL    = 模型名，例如 nvidia/llama-3.1-nemotron-70b-instruct 或 nv-mistralai/mistral-nemo-12b-instruct
const NIM_URL = process.env.NVIDIA_NIM_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const API_KEY = process.env.NVIDIA_API_KEY || '';
const MODEL = process.env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct';

// 系统提示词：把小程序定位成「AI 健康生长教练」
const SYSTEM_PROMPT = `你是「智能生长」小程序的 AI 健康教练，帮助用户从身体、习惯、认知三个维度健康生长。
你的回答要：简洁、温暖、有具体可执行的建议；用中文；不超过 200 字。
你掌握用户的以下背景信息（由系统注入），请结合它给个性化建议：
- 如果用户剩余热量很少，提醒别再吃高热量食物；
- 如果连续超标，建议调整目标或运动；
- 鼓励坚持打卡，少说教。
不要编造用户没提供的医疗诊断，涉及疾病建议就医。`;

// 把用户上下文对象拼成一段给模型的「背景文字」
function buildContextText(ctx) {
  if (!ctx) return '（暂无用户数据）';
  const lines = [];
  if (ctx.nickName) lines.push(`用户昵称：${ctx.nickName}`);
  if (ctx.goalText) lines.push(`目标：${ctx.goalText}`);
  if (typeof ctx.target === 'number') lines.push(`每日目标热量：${ctx.target} kcal`);
  if (typeof ctx.todayIntake === 'number') lines.push(`今日已摄入：${ctx.todayIntake} kcal`);
  if (typeof ctx.remaining === 'number') lines.push(`今日剩余可吃：${ctx.remaining} kcal`);
  if (typeof ctx.todayBurned === 'number') lines.push(`今日运动消耗：${ctx.todayBurned} kcal`);
  if (typeof ctx.weight === 'number') lines.push(`当前体重：${ctx.weight} kg`);
  if (typeof ctx.streak === 'number') lines.push(`连续打卡：${ctx.streak} 天`);
  if (typeof ctx.rate === 'number') lines.push(`目标周减重：${ctx.rate} kg/周`);
  return lines.length ? lines.join('；\n') : '（暂无用户数据）';
}

// 从标准 OpenAI 格式 JSON 中提取回复文本
function extractFromJson(obj) {
  if (!obj) return '';
  // 兜底：某些接口直接返回 { content: '...' }
  if (typeof obj.content === 'string') return obj.content;
  // 标准格式：choices[0].message.content
  const msg = obj.choices && obj.choices[0] && obj.choices[0].message;
  if (msg && typeof msg.content === 'string') return msg.content;
  // 极少数情况：choices[0].text
  const text = obj.choices && obj.choices[0] && obj.choices[0].text;
  if (typeof text === 'string') return text;
  return '';
}

// 流式 SSE 解析：边读边拼，并对跨 chunk 的不完整行做缓冲
async function parseStream(resp) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let full = '';
  let buffer = ''; // 保存上一 chunk 没读完的半个 SSE 行
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 最后一行多半不完整，留到下次
      for (const line of lines) {
        const t = line.trim();
        if (!t || !t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices && json.choices[0] && json.choices[0].delta;
          if (delta && typeof delta.content === 'string') full += delta.content;
        } catch (e) { /* 片段不完整，忽略 */ }
      }
    }
    // 处理 buffer 里残留的最后一行（可能是 [DONE] 或最后一个 data:）
    const tail = buffer.trim();
    if (tail.startsWith('data:')) {
      const data = tail.slice(5).trim();
      if (data && data !== '[DONE]') {
        try {
          const json = JSON.parse(data);
          const delta = json.choices && json.choices[0] && json.choices[0].delta;
          if (delta && typeof delta.content === 'string') full += delta.content;
        } catch (e) { /* ignore */ }
      }
    }
  } catch (e) {
    // 流式读取中途异常，返回已拼到的部分（宁可部分内容也好过空）
    return full;
  }
  return full;
}

// 非流式解析：直接读取整段 JSON
async function parseNonStream(resp) {
  try {
    const json = await resp.json();
    return extractFromJson(json);
  } catch (e) {
    // 响应可能不是标准 JSON，尝试当纯文本
    try {
      const text = await resp.text();
      return text ? text.trim() : '';
    } catch (e2) {
      return '';
    }
  }
}

exports.main = async (event, context) => {
  const { message, history = [], userContext } = event;

  if (!message || !message.trim()) {
    return { ok: false, code: 'EMPTY_MESSAGE', reply: '说点什么吧～比如“我今天吃了麻辣烫”。' };
  }
  if (!API_KEY) {
    return {
      ok: false,
      code: 'NO_API_KEY',
      reply: 'AI 服务未配置（缺少 NVIDIA_API_KEY 环境变量）。请在云函数环境变量中填写后重试。'
    };
  }

  // 组装 messages
  const contextText = buildContextText(userContext);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n【用户当前背景】\n' + contextText },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  try {
    const resp = await fetch(NIM_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 400,
        stream: true
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return { ok: false, code: 'NIM_ERROR', status: resp.status, reply: 'AI 服务暂不可用，请稍后再试。', detail: errText.slice(0, 200) };
    }

    // 根据 Content-Type 自动选择解析方式，兼容流式 / 非流式两种返回
    const contentType = (resp.headers.get('Content-Type') || '').toLowerCase();
    let full = '';

    if (contentType.includes('text/event-stream') && resp.body) {
      // 流式 SSE
      full = await parseStream(resp);
    } else if (resp.body) {
      // 非流式 JSON / 纯文本
      full = await parseNonStream(resp);
    }

    // 兜底：如果流式没拼到东西，但响应其实是 JSON（极端情况 Content-Type 标错）
    if (!full.trim() && !contentType.includes('text/event-stream')) {
      full = await parseNonStream(resp.clone());
    }

    if (!full.trim()) {
      // 仍为空：把更多诊断信息回传前端，方便定位（model 名、URL 是否正确）
      return {
        ok: false,
        code: 'EMPTY_REPLY',
        reply: 'AI 没有返回内容，请换个说法试试。',
        detail: `model=${MODEL}; url=${NIM_URL}; contentType=${contentType || 'unknown'}`
      };
    }
    return { ok: true, reply: full };
  } catch (e) {
    return { ok: false, code: 'EXCEPTION', reply: '网络异常，请稍后再试。', detail: String(e && e.message || e).slice(0, 200) };
  }
};
