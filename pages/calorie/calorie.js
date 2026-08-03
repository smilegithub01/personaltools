// pages/calorie/calorie.js
const cal = require('../../utils/calorie.js')
const ai = require('../../utils/ai.js')

Page({
  data: {
    hasProfile: false,
    ov: { lost: 0, targetWeight: 0, remain: 0, daysToGoal: 0 },
    target: 0,
    foodKcal: 0,
    exerciseKcal: 0,
    remaining: 0,
    ratioPercent: 0,
    ringColor: '#ff7e8a',
    foods: [],
    exercises: [],
    // AI 增强
    bannerTitle: '今天也要向目标前进一步',
    bannerSub: '记录每一餐 · 看见每一次改变',
    recommends: [],
    streak: 0
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
    const streak = ai.calcStreak()
    const bmi = cal.calcBMI(profile)
    const compliance = ai.weeklyCompliance()
    // 动态激励文案：标题用完整、自然的一句鼓励语，副标题补充状态
    const bannerTitle = ai.motivate({
      remaining: summary.remaining,
      foodKcal: summary.foodKcal,
      target: summary.target,
      streak
    })
    const bannerSub = streak > 0
      ? `你已经连续坚持打卡 ${streak} 天，记录好每一餐，改变正在发生`
      : '今天从记录第一餐开始，迈出减脂的第一步'
    // 剩余额度内的饮食推荐
    const recommends = ai.recommendFoods(summary.remaining, 3)
    this.setData({
      hasProfile: true,
      ov: {
        lost: ov.lost,
        targetWeight: ov.targetWeight,
        remain: ov.remain,
        daysToGoal: ov.daysToGoal,
        currentWeight: ov.currentWeight
      },
      bmi,
      compliance,
      target: summary.target,
      foodKcal: summary.foodKcal,
      exerciseKcal: summary.exerciseKcal,
      remaining: summary.remaining,
      ratioPercent: Math.round(ratio * 100),
      ringOffset: Math.max(0, 628.3 * (1 - Math.min(ratio, 1))),
      totalKcal: summary.foodKcal,
      ringColor: summary.remaining < 0 ? '#e53935' : '#ff7e8a',
      foods: day.foods,
      exercises: day.exercises,
      bannerTitle,
      bannerSub,
      recommends,
      streak
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
  },
  goAddFood(e) {
    const name = e.currentTarget.dataset.name || ''
    wx.navigateTo({ url: `/pages/calorie/add?tab=food&kw=${encodeURIComponent(name)}` })
  },

  onShareAppMessage() {
    return {
      title: '卡路里计划 · 记录每一次改变',
      path: '/pages/calorie/calorie'
    }
  }
})
