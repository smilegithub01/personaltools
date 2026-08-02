// pages/calorie/calorie.js
const cal = require('../../utils/calorie.js')

Page({
  data: {
    hasProfile: false,
    ov: { lost: 0, targetWeight: 0, remain: 0, daysToGoal: 0 },
    target: 0,
    foodKcal: 0,
    exerciseKcal: 0,
    remaining: 0,
    ratioPercent: 0,
    ringColor: '#ff7043',
    foods: [],
    exercises: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const profile = cal.getProfile()
    if (!profile) {
      this.setData({ hasProfile: false })
      return
    }
    const today = cal.dateKey()
    const summary = cal.calcDaySummary(today, profile)
    const ov = cal.planOverview(profile)
    const day = cal.getDayLog(today)
    const ratio = summary.ratio
    this.setData({
      hasProfile: true,
      ov: {
        lost: ov.lost,
        targetWeight: ov.targetWeight,
        remain: ov.remain,
        daysToGoal: ov.daysToGoal
      },
      target: summary.target,
      foodKcal: summary.foodKcal,
      exerciseKcal: summary.exerciseKcal,
      remaining: summary.remaining,
      ratioPercent: Math.round(ratio * 100),
      ringColor: summary.remaining < 0 ? '#e53935' : '#ff7043',
      foods: day.foods,
      exercises: day.exercises
    })
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/calorie/profile' })
  },
  goWeight() {
    wx.navigateTo({ url: '/pages/calorie/weight' })
  },
  goAdd(e) {
    const tab = e.currentTarget.dataset.tab || 'food'
    wx.navigateTo({ url: `/pages/calorie/add?tab=${tab}` })
  }
})
