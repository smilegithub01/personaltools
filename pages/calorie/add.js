// pages/calorie/add.js
const cal = require('../../utils/calorie.js')

Page({
  data: {
    tab: 'food',
    kw: '',
    foods: cal.FOOD_DB,
    selFood: null,
    grams: '',
    foodKcal: 0,
    meals: ['早餐', '午餐', '晚餐', '加餐'],
    meal: '午餐',

    ekw: '',
    exercises: cal.EXERCISE_DB,
    selEx: null,
    minutes: '',
    exKcal: 0,
    weight: 60
  },

  onLoad(options) {
    const p = cal.getProfile()
    this.setData({ weight: p ? p.weight : 60 })
    if (options && options.tab === 'exercise') {
      this.setData({ tab: 'exercise' })
    }
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  // ---- 饮食 ----
  onKw(e) {
    const kw = e.detail.value.trim()
    const foods = kw ? cal.FOOD_DB.filter((f) => f.name.indexOf(kw) >= 0) : cal.FOOD_DB
    this.setData({ kw, foods })
  },
  onPickFood(e) {
    const name = e.currentTarget.dataset.name
    const f = cal.FOOD_DB.find((x) => x.name === name)
    this.setData({ selFood: f, grams: '', foodKcal: 0 })
  },
  onMeal(e) {
    this.setData({ meal: e.currentTarget.dataset.m })
  },
  onQuick(e) {
    this.applyGrams(Number(e.currentTarget.dataset.g))
  },
  onGrams(e) {
    this.applyGrams(Number(e.detail.value))
  },
  applyGrams(g) {
    const f = this.data.selFood
    const kcal = f && g ? cal.calcFoodKcal(f.kcal, g) : 0
    this.setData({ grams: g ? String(g) : '', foodKcal: kcal })
  },
  onAddFood() {
    const { selFood, grams, meal } = this.data
    const g = Number(grams)
    if (!selFood) {
      wx.showToast({ title: '请选择食物', icon: 'none' })
      return
    }
    if (!g || g <= 0) {
      wx.showToast({ title: '请填写克数', icon: 'none' })
      return
    }
    const kcal = cal.calcFoodKcal(selFood.kcal, g)
    const today = cal.dateKey()
    const day = cal.getDayLog(today)
    day.foods.push({ name: selFood.name, kcal, grams: g, meal })
    cal.saveDayLog(today, day)
    wx.showToast({ title: `已记录 ${kcal} kcal`, icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  },

  // ---- 运动 ----
  onEkw(e) {
    const ekw = e.detail.value.trim()
    const exercises = ekw ? cal.EXERCISE_DB.filter((x) => x.name.indexOf(ekw) >= 0) : cal.EXERCISE_DB
    this.setData({ ekw, exercises })
  },
  onPickEx(e) {
    const name = e.currentTarget.dataset.name
    const ex = cal.EXERCISE_DB.find((x) => x.name === name)
    this.setData({ selEx: ex, minutes: '', exKcal: 0 })
  },
  onMinutes(e) {
    const m = Number(e.detail.value)
    const ex = this.data.selEx
    const kcal = ex && m ? cal.calcExerciseKcal(ex.met, m, this.data.weight) : 0
    this.setData({ minutes: e.detail.value, exKcal: kcal })
  },
  onAddEx() {
    const { selEx, minutes } = this.data
    const m = Number(minutes)
    if (!selEx) {
      wx.showToast({ title: '请选择运动', icon: 'none' })
      return
    }
    if (!m || m <= 0) {
      wx.showToast({ title: '请填写时长', icon: 'none' })
      return
    }
    const kcal = cal.calcExerciseKcal(selEx.met, m, this.data.weight)
    const today = cal.dateKey()
    const day = cal.getDayLog(today)
    day.exercises.push({ name: selEx.name, kcal, duration: m })
    cal.saveDayLog(today, day)
    wx.showToast({ title: `已记录 ${kcal} kcal`, icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  }
})
