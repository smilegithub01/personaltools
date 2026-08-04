// pages/coach/coach.js —— 健康贴士（纯本地，无云调用）
// 根据用户当日数据，基于规则引擎生成个性化健康建议
const calorie = require('../../utils/calorie.js')

const GOAL_TEXT = { lose: '减脂', gain: '增肌', keep: '保持体重' }

Page({
  data: {
    tips: [],
    today: null,
    streak: 0,
    goalText: '健康管理',
    weeklyPlan: null
  },

  onLoad() {
    this.refresh()
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const profile = calorie.getProfile() || {}
    const today = calorie.calcDaySummary(calorie.dateKey(new Date()), profile)
    const overview = calorie.planOverview(profile)
    const streak = this.calcStreak()
    const goalText = GOAL_TEXT[profile.goalType] || '健康管理'

    const tips = this.buildTips(profile, today, streak, overview)
    const weeklyPlan = this.buildWeeklyPlan(profile, overview)

    this.setData({ tips, today, streak, goalText, weeklyPlan })
  },

  calcStreak() {
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
  },

  buildTips(profile, today, streak, overview) {
    const tips = []
    const goalText = GOAL_TEXT[profile.goalType] || '健康管理'

    // 1. 当日热量状态
    const remaining = today.remaining
    if (today.foodKcal === 0) {
      tips.push({
        icon: '🍽️',
        title: '开始今天的第一餐',
        content: `今天还没有记录任何饮食。${goalText}的关键是规律，从一顿早餐开始吧，记录下来就能看到进步～`,
        tag: '今日'
      })
    } else if (remaining > 600) {
      tips.push({
        icon: '✨',
        title: '额度充足，营养均衡',
        content: `今天还能吃约 ${remaining} kcal，可以安排一顿营养均衡的正餐，注意多摄入蛋白质和蔬菜。`,
        tag: '今日'
      })
    } else if (remaining > 0) {
      tips.push({
        icon: '⚖️',
        title: '注意控制分量',
        content: `今天还剩约 ${remaining} kcal，建议选择低油低糖的食物，避免高热量加餐。`,
        tag: '今日'
      })
    } else {
      tips.push({
        icon: '💪',
        title: '已超出目标',
        content: `今天已超出目标 ${Math.abs(remaining)} kcal。别焦虑，可以通过运动消耗，或明天适当减少摄入。`,
        tag: '今日'
      })
    }

    // 2. 运动建议
    if (today.exerciseKcal === 0 && today.foodKcal > 0) {
      tips.push({
        icon: '🏃',
        title: '动一动更健康',
        content: '今天还没有运动。建议饭后散步 30 分钟，既能帮助消化，又能消耗额外热量。',
        tag: '运动'
      })
    } else if (today.exerciseKcal > 0) {
      tips.push({
        icon: '🔥',
        title: '今日运动已记录',
        content: `今天通过运动消耗了 ${today.exerciseKcal} kcal，坚持下去效果显著！`,
        tag: '运动'
      })
    }

    // 3. 连续打卡
    if (streak > 0) {
      tips.push({
        icon: '🌟',
        title: `连续打卡 ${streak} 天`,
        content: `你已经连续打卡 ${streak} 天了！这份坚持本身就是一种生长，保持这份节奏～`,
        tag: '习惯'
      })
    }

    // 4. 减重进度
    if (overview && overview.lost > 0) {
      tips.push({
        icon: '📉',
        title: `已成功减重 ${overview.lost} kg`,
        content: `从 ${overview.startWeight} kg 到 ${overview.currentWeight} kg，你已经迈出了重要一步！还需减 ${overview.remain} kg 达成目标。`,
        tag: '进度'
      })
    }

    // 5. 营养建议（基于时段）
    const h = new Date().getHours()
    if (h >= 10 && h < 14 && today.foodKcal < today.target * 0.3) {
      tips.push({
        icon: '🌤️',
        title: '别忘了吃早餐',
        content: '早餐能启动一天的代谢，建议摄入优质蛋白 + 碳水，如鸡蛋 + 燕麦 + 牛奶。',
        tag: '营养'
      })
    } else if (h >= 14 && h < 17 && today.foodKcal < today.target * 0.5) {
      tips.push({
        icon: '☀️',
        title: '午餐建议',
        content: '午餐占全天能量的 40% 左右，建议：1 份主食 + 1 份蛋白 + 2 份蔬菜。',
        tag: '营养'
      })
    } else if (h >= 17 && h < 21 && today.foodKcal < today.target * 0.7) {
      tips.push({
        icon: '🌙',
        title: '晚餐建议',
        content: '晚餐宜清淡，七分饱即可。多吃蔬菜和优质蛋白，减少主食分量。',
        tag: '营养'
      })
    } else if (h >= 21) {
      tips.push({
        icon: '🌃',
        title: '睡前小贴士',
        content: '睡前 2 小时尽量不要进食，保证充足睡眠（7-8 小时）有助于身体恢复和代谢。',
        tag: '营养'
      })
    }

    // 6. 达标率建议
    const compliance = calorie.weeklyCompliance()
    if (compliance < 50 && today.foodKcal > 0) {
      tips.push({
        icon: '📊',
        title: '本周达标率偏低',
        content: `本周达标率仅 ${compliance}%，建议回顾一下饮食结构，逐步调整到更可持续的节奏。`,
        tag: '周报'
      })
    } else if (compliance >= 80) {
      tips.push({
        icon: '🎯',
        title: `本周达标率 ${compliance}%`,
        content: '节奏非常稳！继续保持当前的饮食和运动习惯，你一定会达成目标。',
        tag: '周报'
      })
    }

    return tips
  },

  buildWeeklyPlan(profile, overview) {
    const weeklyRate = Number(profile.weeklyRate) || 0.5
    const target = (overview && overview.targetWeight) || (profile.targetWeight || 60)
    const remain = (overview && overview.remain) || 0
    const days = (overview && overview.daysToGoal) || 0

    return {
      rate: weeklyRate,
      target,
      remain,
      days
    }
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/calorie/add' })
  },

  goWeight() {
    wx.navigateTo({ url: '/pages/calorie/weight' })
  },

  goReport() {
    wx.navigateTo({ url: '/pages/report/weekly' })
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  }
})
