// pages/calorie/calorie.js
const cal = require('../../utils/calorie.js')
const ai = require('../../utils/ai.js')
const growth = require('../../utils/growth.js')

// Banner 主标题文案池（品牌 slogan + 数据驱动激励），每次进入随机抽一句
const BANNER_TITLES = [
  // 品牌氛围
  '坚持，是看得见的生长',
  '今天的小改变，明天的加速度',
  '把健康，过成日常',
  '记录每一口，掌握每一斤',
  '慢慢来，比较快',
  '你的身体，正在悄悄变好',
  '不急于一时，胜在每一天',
  '种一棵树最好的时间是现在',
  // 数据驱动激励（由 ai.motivate 动态生成后可追加到池里）
]

// 随机抽一句 banner 主标题
function pickBannerTitle() {
  return BANNER_TITLES[Math.floor(Math.random() * BANNER_TITLES.length)]
}

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
    bannerTitle: '坚持，是看得见的生长',
    bannerSub: '连续打卡 0 天 · 记录好每一餐',
    recommends: [],
    streak: 0,
    // 隐私：是否隐藏体重/BMI（本地持久化）
    hiddenWeight: false,
    // banner 背景图（按性别切换，默认女生图）
    bannerImg: '/images/fitness-banner.png'
  },

  onShow() {
    // 读取隐私开关（持久化）
    let hidden = false
    try { hidden = wx.getStorageSync('hide_weight_privacy') === true } catch (e) {}
    this.setData({ hiddenWeight: hidden })
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
    // banner 主标题从文案池随机抽一句；副标题保留连续打卡状态（精简）
    const bannerSub = streak > 0
      ? `连续打卡 ${streak} 天 · 记录好每一餐`
      : '今天从记录第一餐开始'
    // 剩余额度内的饮食推荐
    const recommends = ai.recommendFoods(summary.remaining, 3)
    // 生长树当前阶段名（用于首页入口展示）
    const tree = growth.buildTreeData()
    // banner 图片按性别切换：男用户看女生图，女用户看男生跑步图
    const bannerImg = profile.gender === 'male'
      ? '/images/fitness-banner.png'
      : '/images/fitness-banner-man.jpg'
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
      bannerTitle: pickBannerTitle(),
      bannerSub,
      bannerImg,
      recommends,
      streak,
      treeStageName: tree.stageName
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
  goCoach() {
    wx.navigateTo({ url: '/pages/coach/coach' })
  },
  // 生长中心入口
  goTree() {
    wx.navigateTo({ url: '/pages/growth/tree' })
  },
  goReport() {
    wx.navigateTo({ url: '/pages/report/weekly' })
  },
  goRank() {
    wx.navigateTo({ url: '/pages/rank/rank' })
  },
  // 隐私：切换体重/BMI 显示与隐藏（本地持久化）
  toggleWeight() {
    const next = !this.data.hiddenWeight
    try { wx.setStorageSync('hide_weight_privacy', next) } catch (e) {}
    this.setData({ hiddenWeight: next })
  },

  deleteRecord(e) {
    const type = e.currentTarget.dataset.type
    const idx = Number(e.currentTarget.dataset.idx)
    const isFood = type === 'food'
    const item = (isFood ? this.data.foods : this.data.exercises)[idx]
    if (!item) return

    wx.showModal({
      title: '删除记录',
      content: `确定删除“${item.name}”吗？`,
      confirmColor: '#ff7e8a',
      success: (res) => {
        if (!res.confirm) return
        const day = cal.getDayLog(cal.dateKey())
        const target = isFood ? day.foods : day.exercises
        if (!target[idx]) return
        target.splice(idx, 1)
        if (!cal.saveDayLog(cal.dateKey(), day)) return
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '卡路里计划 · 记录每一次改变',
      path: '/pages/calorie/calorie'
    }
  }
})
