// 页面：AI 健康教练
const calorie = require('../../utils/calorie.js')

const CACHE_KEY = 'coach_history'
const QUOTA_KEY = 'coach_quota'   // 存 { date: 'YYYY-MM-DD', count: n }
const QUOTA_LIMIT = 30            // 每日提问上限
const GOAL_TEXT = { lose: '减脂', gain: '增肌', keep: '保持体重' }

// 读取今日已用次数（跨天自动重置为 0）
function getQuotaUsed() {
  try {
    const q = wx.getStorageSync(QUOTA_KEY)
    const today = calorie.dateKey(new Date())
    if (q && q.date === today) return q.count || 0
  } catch (e) {}
  return 0
}
// 累加一次（跨天先重置）
function incQuota() {
  const today = calorie.dateKey(new Date())
  let q = { date: today, count: 0 }
  try {
    const saved = wx.getStorageSync(QUOTA_KEY)
    if (saved && saved.date === today) q.count = saved.count || 0
  } catch (e) {}
  q.count += 1
  try { wx.setStorageSync(QUOTA_KEY, q) } catch (e) {}
  return q.count
}

// 计算连续打卡天数（基于有记录的日期）
function calcStreak(getDayLog, dateKey) {
  let streak = 0
  const d = new Date()
  // 今天若还没记录，从昨天起算
  if (!getDayLog(dateKey(d)).foods.length && !getDayLog(dateKey(d)).exercises.length) {
    d.setDate(d.getDate() - 1)
  }
  for (let i = 0; i < 365; i++) {
    const log = getDayLog(dateKey(d))
    if (log.foods.length || log.exercises.length) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

Page({
  data: {
    messages: [],
    input: '',
    input: '',
    loading: false,
    ready: false,
    quotaUsed: 0,
    quotaLimit: 30
  },

  onLoad() {
    // 云环境已在 app.js 统一初始化（带容错）
    const history = wx.getStorageSync(CACHE_KEY) || []
    this.setData({
      messages: history,
      quotaUsed: getQuotaUsed(),
      quotaLimit: QUOTA_LIMIT
    })
    if (!history.length) this.greet()
  },

  // 欢迎语（本地，不耗 API，结合当天数据主动问候）
  greet() {
    const profile = calorie.getProfile() || {}
    const name = profile.nickName ? profile.nickName + '，' : ''
    const goalText = GOAL_TEXT[profile.goalType] || '健康管理'

    // 取当天数据，做主动播报
    let todayLine = ''
    try {
      const today = calorie.calcDaySummary(calorie.dateKey(new Date()), profile)
      const remaining = Math.round(today.remaining)
      if (remaining > 0) {
        todayLine = `今天你还能吃约 ${remaining} kcal，离「${goalText}」目标又近了一步～`
      } else if (remaining < 0) {
        todayLine = `今天已经超出目标 ${Math.abs(remaining)} kcal 啦，别担心，我们看看怎么调整。`
      } else {
        todayLine = '今天的热量额度刚好用完，状态不错！'
      }
    } catch (e) {
      todayLine = `今天我们继续朝着「${goalText}」的目标生长吧～`
    }

    const streak = calcStreak(calorie.getDayLog, calorie.dateKey)
    const streakLine = streak > 0 ? `\n你已经连续打卡 ${streak} 天，这份坚持本身就是一种生长 💪` : ''

    const left = QUOTA_LIMIT - this.data.quotaUsed
    const quotaLine = left > 0
      ? `\n今天还能问 ${left} 次，珍惜每次提问哦～`
      : `\n今天的提问次数已用完，明天 0 点重置～`

    const tip = `我是你的 AI 健康教练。${todayLine}${streakLine}${quotaLine}\n\n有什么想问的，直接说，或者点下面的快捷提问 👇`
    const msg = { role: 'assistant', content: name + tip, typing: false }
    this.pushMessage(msg)
  },

  // 取用户上下文，注入给 AI
  buildUserContext() {
    const profile = calorie.getProfile() || {}
    const today = calorie.calcDaySummary(calorie.dateKey(new Date()), profile)
    const overview = calorie.planOverview(profile)
    const streak = calcStreak(calorie.getDayLog, calorie.dateKey)
    return {
      nickName: profile.nickName || '',
      goalText: GOAL_TEXT[profile.goalType] || '健康管理',
      target: today.target,
      todayIntake: today.foodKcal,
      todayBurned: today.exerciseKcal,
      remaining: today.remaining,
      weight: profile.weight || overview.currentWeight,
      streak,
      rate: profile.weeklyRate || 0.5
    }
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  // 点击快捷提问：填入并发送
  quickAsk(e) {
    const q = e.currentTarget.dataset.q
    this.setData({ input: q })
    this.send()
  },

  async send() {
    const text = (this.data.input || '').trim()
    if (!text || this.data.loading) return

    // 每日配额校验（仅在真正调用 AI 前拦截）
    const used = getQuotaUsed()
    if (used >= QUOTA_LIMIT) {
      const warn = { role: 'assistant', content: '今天的提问次数已用完（每日 30 次），明天 0 点会自动重置，明天见～', typing: false }
      this.pushMessage(warn)
      this.setData({ input: '' })
      return
    }

    this.setData({ input: '' })
    const userMsg = { role: 'user', content: text, typing: false }
    const aiMsg = { role: 'assistant', content: '', typing: true }
    this.pushMessage(userMsg)
    this.pushMessage(aiMsg)
    this.setData({ loading: true })
    this.scrollToBottom()

    try {
      const res = await wx.cloud.callFunction({
        name: 'aiProxy',
        data: {
          message: text,
          userContext: this.buildUserContext(),
          history: this.data.messages
            .filter(m => !m.typing)
            .slice(-8)
            .map(m => ({ role: m.role, content: m.content }))
        }
      })
      const result = res.result || {}
      if (result.ok) {
        // 仅成功调用才扣次数
        const newUsed = incQuota()
        this.setData({ quotaUsed: newUsed })
        await this.typewriter(aiMsg, result.reply)
      } else {
        // 失败降级：用本地文案兜底，避免空回复（不扣次数）
        const fallback = result.reply || 'AI 暂不可用，稍后再聊～'
        this.updateLastAssistant(fallback)
        // 调试：把云函数返回的诊断信息打到控制台，便于定位空回复原因
        if (result.code) {
          console.warn('[coach] AI 调用未成功：', result.code, result.detail || '')
        }
      }
    } catch (e) {
      this.updateLastAssistant('网络异常，请稍后再试。')
    } finally {
      this.setData({ loading: false })
      this.persist()
    }
  },

  // 打字机效果（视觉流式）
  typewriter(aiMsg, fullText) {
    return new Promise(resolve => {
      let i = 0
      const step = Math.max(1, Math.round(fullText.length / 60)) // 约 1 秒内播完
      const timer = setInterval(() => {
        i += step
        const slice = fullText.slice(0, i)
        this.updateLastAssistant(slice)
        if (i >= fullText.length) {
          clearInterval(timer)
          this.updateLastAssistant(fullText)
          resolve()
        }
      }, 16)
    })
  },

  // ===== 消息工具 =====
  pushMessage(msg) {
    const messages = this.data.messages.concat(msg)
    this.setData({ messages })
    this.scrollToBottom()
  },
  updateLastAssistant(content) {
    const messages = this.data.messages.slice()
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        messages[i] = Object.assign({}, messages[i], { content, typing: false })
        break
      }
    }
    this.setData({ messages })
  },
  persist() {
    // 只存已完成的消息，最多 50 条
    const clean = this.data.messages
      .filter(m => !m.typing)
      .slice(-50)
      .map(m => ({ role: m.role, content: m.content }))
    wx.setStorageSync(CACHE_KEY, clean)
  },
  scrollToBottom() {
    wx.nextTick(() => {
      this.setData({ scrollTop: 1e9 })
    })
  },
  clearHistory() {
    wx.showModal({
      title: '清空对话',
      content: '确定清空与 AI 健康教练的聊天记录？',
      success: (r) => {
        if (r.confirm) {
          wx.removeStorageSync(CACHE_KEY)
          this.setData({ messages: [] })
          this.greet()
        }
      }
    })
  }
})
