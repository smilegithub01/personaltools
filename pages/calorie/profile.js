// pages/calorie/profile.js
const cal = require('../../utils/calorie.js')

Page({
  data: {
    isEdit: false,
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
    bmi: null,
    warn: ''
  },

  onLoad() {
    const p = cal.getProfile()
    if (p) {
      const idx = cal.ACTIVITY.findIndex((a) => a.key === p.activity)
      const latestWeight = cal.getLatestWeight()
      this.setData({
        isEdit: true,
        gender: p.gender || 'male',
        age: p.age != null ? String(p.age) : '',
        height: p.height != null ? String(p.height) : '',
        weight: latestWeight != null ? String(latestWeight) : (p.weight != null ? String(p.weight) : ''),
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
    const bmi = cal.calcBMI(profile)
    this.setData({
      bmr,
      tdee,
      target: t.target,
      bmi,
      warn: t.warn
    })
  },

  onSave() {
    const d = this.data
    const age = Number(d.age)
    const height = Number(d.height)
    const weight = Number(d.weight)
    const targetWeight = Number(d.targetWeight)
    if (!Number.isInteger(age) || age < 10 || age > 100) {
      wx.showToast({ title: '年龄请输入 10-100 的整数', icon: 'none' })
      return
    }
    if (!Number.isFinite(height) || height < 100 || height > 250) {
      wx.showToast({ title: '身高请输入 100-250 cm', icon: 'none' })
      return
    }
    if (!Number.isFinite(weight) || weight < 20 || weight > 300) {
      wx.showToast({ title: '体重请输入 20-300 kg', icon: 'none' })
      return
    }
    if (!Number.isFinite(targetWeight) || targetWeight < 20 || targetWeight > 300) {
      wx.showToast({ title: '目标体重请输入 20-300 kg', icon: 'none' })
      return
    }
    if (targetWeight >= weight) {
      wx.showToast({ title: '减重目标需低于当前体重', icon: 'none' })
      return
    }
    // 目标体重健康下限：BMI 18.5 对应体重，避免设定过低伤害身体
    const minHealthy = Math.round((18.5 * Math.pow(height / 100, 2)) * 10) / 10
    if (targetWeight < minHealthy) {
      wx.showModal({
        title: '目标体重偏低',
        content: `按你的身高，健康体重建议不低于 ${minHealthy} kg。过低的目标可能影响代谢与健康，是否仍要保存？`,
        confirmText: '坚持保存',
        cancelText: '我再想想',
        success: (r) => { if (r.confirm) this.doSave(age, height, weight, targetWeight) }
      })
      return
    }
    this.doSave(age, height, weight, targetWeight)
  },

  doSave(age, height, weight, targetWeight) {
    const d = this.data
    const profile = {
      gender: d.gender,
      age,
      height,
      weight,
      activity: cal.ACTIVITY[d.activityIndex].key,
      targetWeight,
      weeklyRate: Number(d.weeklyRate)
    }
    if (!cal.saveProfile(profile)) return
    // 当前体重以每日体重记录为统一来源；同一天重复保存会覆盖，不会产生重复记录。
    if (!cal.saveWeight(cal.dateKey(), weight)) return
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      wx.navigateBack({
        delta: 1,
        fail: () => wx.reLaunch({ url: '/pages/calorie/calorie' })
      })
    }, 600)
  }
})
