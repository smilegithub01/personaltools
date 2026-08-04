// pages/coach/coach.js —— 双模式：默认本地健康贴士；后台开关开启后切换为 AI 对话教练
// 开关位置：云开发数据库 app_config 集合，文档 _id='ai'，字段 enabled=true/false
// 默认 enabled=false（过审安全）；改 true 即开启 AI 对话，无需重新发版
const calorie = require('../../utils/calorie.js')

const GOAL_TEXT = { lose: '减脂', gain: '增肌', keep: '保持体重' }

// ===== AI 对话模式相关常量 =====
const CACHE_KEY = 'coach_history'
const QUOTA_KEY = 'coach_quota'   // 存 { date: 'YYYY-MM-DD', count: n }
const QUOTA_LIMIT = 30            // 每日提问上限

// ===== 云数据库开关配置 =====
const CONFIG_COLLECTION = 'app_config' // 云开发数据库集合名
const CONFIG_DOC_ID = 'ai'             // 配置文档 id

// 读取今日 AI 已用次数（跨天自动重置为 0）
function getQuotaUsed() {
  try {
    const q = wx.getStorageSync(QUOTA_KEY)
    const today = calorie.dateKey(new Date())
    if (q && q.date === today) return q.count || 0
  } catch (e) {}
  return 0
}
// 累加一次 AI 提问（跨天先重置）
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

// 连续打卡天数（基于有饮食/运动/体重记录的日期）
function calcStreakDays() {
  const logs = calorie.getAllLogs()
  const wl = calorie.getWeightLog()
  const days = new Set(Object.keys(logs).filter((k) => {
    const e = logs[k]
    return e && ((e.foods && e.foods.length) || (e.exercises && e.exercises.length))
  }).concat(Object.keys(wl)))
  let streak = 0
  const d = new Date()
  if (!days.has(calorie.dateKey(d))) {
    d.setDate(d.getDate() - 1)
  }
  for (let i = 0; i < 366; i++) {
    if (days.has(calorie.dateKey(d))) {
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
    // 模式控制
    configLoaded: false, // 配置是否加载完成（避免进入时闪烁）
    aiEnabled: false,    // 是否启用 AI 对话模式
    // 本地贴士模式数据
    tips: [],
    today: null,
    streak: 0,
    goalText: '健康管理',
    weeklyPlan: null,
    // AI 对话模式数据
    messages: [],
    input: '',
    loading: false,
    quotaUsed: 0,
    quotaLimit: 30
  },

  onLoad() {
    this.loadConfig()
  },

  onShow() {
    // 仅本地贴士模式刷新（AI 模式保留对话历史，不刷新）
    if (this.data.configLoaded && !this.data.aiEnabled) {
      this.refreshTips()
    }
  },

  // ===== 读取云数据库开关，决定模式 =====
  // 集合不存在 / 文档不存在 / 无权限 / enabled!=true → 一律视为关闭（过审安全）
  async loadConfig() {
    let aiEnabled = false
    try {
      if (wx.cloud && wx.cloud.database) {
        const db = wx.cloud.database()
        const res = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).get()
        aiEnabled = !!(res && res.data && res.data.enabled === true)
      }
    } catch (e) {
      // 任何异常都默认关闭，保证本地功能可用
      aiEnabled = false
    }
    this.setData({ aiEnabled, configLoaded: true })
    if (aiEnabled) {
      this.initAIMode()
    } else {
      this.refreshTips()
    }
  },

  // ===== 本地贴士模式 =====
  refreshTips() {
    const profile = calorie.getProfile() || {}
    const today = calorie.calcDaySummary(calorie.dateKey(new Date()), profile)
    const overview = calorie.planOverview(profile)
    const streak = calcStreakDays()
    const goalText = GOAL_TEXT[profile.goalType] || '健康管理'
    const tips = this.buildTips(profile, today, streak, overview)
    const weeklyPlan = this.buildWeeklyPlan(profile, overview)
    this.setData({ tips, today, streak, goalText, weeklyPlan })
  },

  buildTips(profile, today, streak, overview) {
    const tips = []
    const goalText = GOAL_TEXT[profile.goalType] || '健康管理'

    // 1. 当日热量状态
    const remaining = today.remaining
    if (today.foodKcal === 0) {
      tips.push({ icon: '🍽️', title: '开始今天的第一餐', content: `今天还没有记录任何饮食。${goalText}的关键是规律，从一顿早餐开始吧，记录下来就能看到进步～`, tag: '今日' })
    } else if (remaining > 600) {
      tips.push({ icon: '✨', title: '额度充足，营养均衡', content: `今天还能吃约 ${remaining} kcal，可以安排一顿营养均衡的正餐，注意多摄入蛋白质和蔬菜。`, tag: '今日' })
    } else if (remaining > 0) {
      tips.push({ icon: '⚖️', title: '注意控制分量', content: `今天还剩约 ${remaining} kcal，建议选择低油低糖的食物，避免高热量加餐。`, tag: '今日' })
    } else {
      tips.push({ icon: '💪', title: '已超出目标', content: `今天已超出目标 ${Math.abs(remaining)} kcal。别焦虑，可以通过运动消耗，或明天适当减少摄入。`, tag: '今日' })
    }

    // 2. 运动建议
    if (today.exerciseKcal === 0 && today.foodKcal > 0) {
      tips.push({ icon: '🏃', title: '动一动更健康', content: '今天还没有运动。建议饭后散步 30 分钟，既能帮助消化，又能消耗额外热量。', tag: '运动' })
    } else if (today.exerciseKcal > 0) {
      tips.push({ icon: '🔥', title: '今日运动已记录', content: `今天通过运动消耗了 ${today.exerciseKcal} kcal，坚持下去效果显著！`, tag: '运动' })
    }

    // 3. 连续打卡
    if (streak > 0) {
      tips.push({ icon: '🌟', title: `连续打卡 ${streak} 天`, content: `你已经连续打卡 ${streak} 天了！这份坚持本身就是一种生长，保持这份节奏～`, tag: '习惯' })
    }

    // 4. 减重进度
    if (overview && overview.lost > 0) {
      tips.push({ icon: '📉', title: `已成功减重 ${overview.lost} kg`, content: `从 ${overview.startWeight} kg 到 ${overview.currentWeight} kg，你已经迈出了重要一步！还需减 ${overview.remain} kg 达成目标。`, tag: '进度' })
    }

    // 5. 营养建议（基于时段）
    const h = new Date().getHours()
    if (h >= 10 && h < 14 && today.foodKcal < today.target * 0.3) {
      tips.push({ icon: '🌤️', title: '别忘了吃早餐', content: '早餐能启动一天的代谢，建议摄入优质蛋白 + 碳水，如鸡蛋 + 燕麦 + 牛奶。', tag: '营养' })
    } else if (h >= 14 && h < 17 && today.foodKcal < today.target * 0.5) {
      tips.push({ icon: '☀️', title: '午餐建议', content: '午餐占全天能量的 40% 左右，建议：1 份主食 + 1 份蛋白 + 2 份蔬菜。', tag: '营养' })
    } else if (h >= 17 && h < 21 && today.foodKcal < today.target * 0.7) {
      tips.push({ icon: '🌙', title: '晚餐建议', content: '晚餐宜清淡，七分饱即可。多吃蔬菜和优质蛋白，减少主食分量。', tag: '营养' })
    } else if (h >= 21) {
      tips.push({ icon: '🌃', title: '睡前小贴士', content: '睡前 2 小时尽量不要进食，保证充足睡眠（7-8 小时）有助于身体恢复和代谢。', tag: '营养' })
    }

    // 6. 达标率建议
    const compliance = calorie.weeklyCompliance()
    if (compliance < 50 && today.foodKcal > 0) {
      tips.push({ icon: '📊', title: '本周达标率偏低', content: `本周达标率仅 ${compliance}%，建议回顾一下饮食结构，逐步调整到更可持续的节奏。`, tag: '周报' })
    } else if (compliance >= 80) {
      tips.push({ icon: '🎯', title: `本周达标率 ${compliance}%`, content: '节奏非常稳！继续保持当前的饮食和运动习惯，你一定会达成目标。', tag: '周报' })
    }

    return tips
  },

  buildWeeklyPlan(profile, overview) {
    const weeklyRate = Number(profile.weeklyRate) || 0.5
    const target = (overview && overview.targetWeight) || (profile.targetWeight || 60)
    const remain = (overview && overview.remain) || 0
    const days = (overview && overview.daysToGoal) || 0
    return { rate: weeklyRate, target, remain, days }
  },

  goAdd() { wx.navigateTo({ url: '/pages/calorie/add' }) },
  goWeight() { wx.navigateTo({ url: '/pages/calorie/weight' }) },
  goReport() { wx.navigateTo({ url: '/pages/report/weekly' }) },

  // ===== AI 对话模式 =====
  initAIMode() {
    const history = wx.getStorageSync(CACHE_KEY) || []
    this.setData({
      messages: history,
      quotaUsed: getQuotaUsed(),
      quotaLimit: QUOTA_LIMIT
    })
    if (!history.length) this.greet()
  },

  // 欢迎语（本地生成，不耗 API）
  greet() {
    const profile = calorie.getProfile() || {}
    const name = profile.nickName ? profile.nickName + '，' : ''
    const goalText = GOAL_TEXT[profile.goalType] || '健康管理'

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

    const streak = calcStreakDays()
    const streakLine = streak > 0 ? `\n你已经连续打卡 ${streak} 天，这份坚持本身就是一种生长 💪` : ''

    const left = QUOTA_LIMIT - this.data.quotaUsed
    const quotaLine = left > 0 ? `\n今天还能问 ${left} 次，珍惜每次提问哦～` : `\n今天的提问次数已用完，明天 0 点重置～`

    const tip = `我是你的 AI 健康教练。${todayLine}${streakLine}${quotaLine}\n\n有什么想问的，直接说，或者点下面的快捷提问 👇`
    this.pushMessage({ role: 'assistant', content: name + tip, typing: false })
  },

  // 取用户上下文，注入给 AI
  buildUserContext() {
    const profile = calorie.getProfile() || {}
    const today = calorie.calcDaySummary(calorie.dateKey(new Date()), profile)
    const overview = calorie.planOverview(profile)
    const streak = calcStreakDays()
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

  onInput(e) { this.setData({ input: e.detail.value }) },

  // 点击快捷提问：填入并发送
  quickAsk(e) {
    const q = e.currentTarget.dataset.q
    this.setData({ input: q })
    this.send()
  },

  async send() {
    const text = (this.data.input || '').trim()
    if (!text || this.data.loading) return

    // 每日配额校验
    const used = getQuotaUsed()
    if (used >= QUOTA_LIMIT) {
      this.pushMessage({ role: 'assistant', content: '今天的提问次数已用完（每日 30 次），明天 0 点会自动重置，明天见～', typing: false })
      this.setData({ input: '' })
      return
    }

    this.setData({ input: '' })
    this.pushMessage({ role: 'user', content: text, typing: false })
    this.pushMessage({ role: 'assistant', content: '', typing: true })
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
        await this.typewriter(result.reply)
      } else {
        // 失败降级：本地文案兜底，不扣次数
        const fallback = result.reply || 'AI 暂不可用，稍后再聊～'
        this.updateLastAssistant(fallback)
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
  typewriter(fullText) {
    return new Promise(resolve => {
      let i = 0
      const step = Math.max(1, Math.round(fullText.length / 60))
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
    const clean = this.data.messages
      .filter(m => !m.typing)
      .slice(-50)
      .map(m => ({ role: m.role, content: m.content }))
    wx.setStorageSync(CACHE_KEY, clean)
  },
  scrollToBottom() {
    wx.nextTick(() => { this.setData({ scrollTop: 1e9 }) })
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
  },

  onPullDownRefresh() {
    if (!this.data.aiEnabled) {
      this.refreshTips()
    }
    wx.stopPullDownRefresh()
  }
})
