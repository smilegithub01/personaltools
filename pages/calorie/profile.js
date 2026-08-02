// pages/calorie/profile.js
const cal = require('../../utils/calorie.js')

Page({
  data: {
    gender: 'male',
    age: '',
    height: '',
    weight: '',
    activityIndex: 1,
    activityLabels: cal.ACTIVITY.map((a) => a.label),
    targetWeight: '',
    weeklyRate: 0.5,
    bmr: '',
    tdee: '',
    target: '',
    warn: ''
  },

  onLoad() {
    const p = cal.getProfile()
    if (p) {
      const idx = cal.ACTIVITY.findIndex((a) => a.key === p.activity)
      this.setData({
        gender: p.gender || 'male',
        age: p.age != null ? String(p.age) : '',
        height: p.height != null ? String(p.height) : '',
        weight: p.weight != null ? String(p.weight) : '',
        activityIndex: idx >= 0 ? idx : 1,
        targetWeight: p.targetWeight != null ? String(p.targetWeight) : '',
        weeklyRate: p.weeklyRate || 0.5
      })
    }
    this.recompute()
  },

  onGender(e) {
    this.setData({ gender: e.currentTarget.dataset.g }, () => this.recompute())
  },
  onAge(e) {
    this.setData({ age: e.detail.value }, () => this.recompute())
  },
  onHeight(e) {
    this.setData({ height: e.detail.value }, () => this.recompute())
  },
  onWeight(e) {
    this.setData({ weight: e.detail.value }, () => this.recompute())
  },
  onTarget(e) {
    this.setData({ targetWeight: e.detail.value }, () => this.recompute())
  },
  onActivity(e) {
    this.setData({ activityIndex: Number(e.detail.value) }, () => this.recompute())
  },
  onRate(e) {
    this.setData({ weeklyRate: e.detail.value }, () => this.recompute())
  },

  recompute() {
    const d = this.data
    const age = Number(d.age)
    const height = Number(d.height)
    const weight = Number(d.weight)
    if (!age || !height || !weight) {
      this.setData({ bmr: '', tdee: '', target: '', warn: '' })
      return
    }
    const profile = {
      gender: d.gender,
      age,
      height,
      weight,
      activity: cal.ACTIVITY[d.activityIndex].key,
      targetWeight: Number(d.targetWeight) || weight,
      weeklyRate: Number(d.weeklyRate)
    }
    const bmr = cal.calcBMR(profile)
    const tdee = cal.calcTDEE(profile)
    const t = cal.calcTarget(profile)
    this.setData({
      bmr,
      tdee,
      target: t.target,
      warn: t.warn
    })
  },

  onSave() {
    const d = this.data
    const age = Number(d.age)
    const height = Number(d.height)
    const weight = Number(d.weight)
    const targetWeight = Number(d.targetWeight)
    if (!age || age < 10 || age > 100) {
      wx.showToast({ title: '请填写有效年龄', icon: 'none' })
      return
    }
    if (!height || height < 100 || height > 250) {
      wx.showToast({ title: '请填写有效身高', icon: 'none' })
      return
    }
    if (!weight || weight < 30 || weight > 300) {
      wx.showToast({ title: '请填写有效体重', icon: 'none' })
      return
    }
    if (!targetWeight || targetWeight <= 0) {
      wx.showToast({ title: '请填写目标体重', icon: 'none' })
      return
    }
    const profile = {
      gender: d.gender,
      age,
      height,
      weight,
      activity: cal.ACTIVITY[d.activityIndex].key,
      targetWeight,
      weeklyRate: Number(d.weeklyRate)
    }
    cal.saveProfile(profile)
    // 同时记录今日体重（若未记录）
    const today = cal.dateKey()
    const wl = cal.getWeightLog()
    if (!wl[today]) cal.saveWeight(today, weight)
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      wx.navigateBack({
        delta: 1,
        fail: () => wx.reLaunch({ url: '/pages/calorie/calorie' })
      })
    }, 600)
  }
})
