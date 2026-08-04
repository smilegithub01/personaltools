// pages/calorie/add.js
const cal = require('../../utils/calorie.js')
const ai = require('../../utils/ai.js')

Page({
  data: {
    tab: 'food',
    kw: '',
    foods: cal.FOOD_DB,
    frequent: [],
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
    weight: 60,

    // 本次会话已添加项（支持一餐多种食物/运动连续录入，确认后才返回）
    addedCount: 0
  },

  onLoad(options) {
    const p = cal.getProfile()
    this.setData({
      weight: p ? p.weight : 60,
      meal: ai.predictMeal(),
      frequent: ai.frequentFoods(6)
    })
    if (options && options.tab === 'exercise') {
      this.setData({ tab: 'exercise' })
    }
    // 首页饮食推荐跳转：带入搜索词并预填
    if (options && options.kw) {
      const kw = decodeURIComponent(options.kw)
      const foods = ai.semanticSearch(kw, cal.FOOD_DB)
      this.setData({ kw, foods })
    }
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  // ---- 饮食 ----
  onKw(e) {
    const kw = e.detail.value.trim()
    const foods = ai.semanticSearch(kw, cal.FOOD_DB) // 语义搜索
    this.setData({ kw, foods })
  },
  onPickFood(e) {
    const name = e.currentTarget.dataset.name
    const f = cal.FOOD_DB.find((x) => x.name === name)
    this.setData({ selFood: f, grams: '', foodKcal: 0 })
  },
  // 自定义食物：打开录入面板，进入自定义编辑态
  onCustomFood() {
    this.setData({
      selFood: { name: '', kcal: '', cat: '自定义', custom: true },
      grams: '',
      foodKcal: 0
    })
  },
  onCustomName(e) {
    this.setData({ 'selFood.name': e.detail.value })
  },
  onCustomKcal(e) {
    this.setData({ 'selFood.kcal': e.detail.value })
    this.applyGrams(Number(this.data.grams))
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
    const kcalPer100 = Number(f && f.kcal)
    const kcal = f && kcalPer100 && g ? cal.calcFoodKcal(kcalPer100, g) : 0
    this.setData({ grams: g ? String(g) : '', foodKcal: kcal })
  },
  onAddFood() {
    const { selFood, grams, meal } = this.data
    const g = Number(grams)
    if (!selFood) {
      wx.showToast({ title: '请选择食物', icon: 'none' })
      return
    }
    let name = selFood.name
    let kcalPer100 = Number(selFood.kcal)
    // 自定义食物：校验名称与热量
    if (selFood.custom) {
      name = (name || '').trim()
      if (!name) {
        wx.showToast({ title: '请输入食物名称', icon: 'none' })
        return
      }
      if (!Number.isFinite(kcalPer100) || kcalPer100 <= 0 || kcalPer100 > 5000) {
        wx.showToast({ title: '请填写有效热量(每100g)', icon: 'none' })
        return
      }
    }
    if (!Number.isFinite(g) || g <= 0) {
      wx.showToast({ title: '请填写有效克数', icon: 'none' })
      return
    }
    if (g > 5000) {
      wx.showToast({ title: '克数请控制在 5000 g 内', icon: 'none' })
      return
    }
    const kcal = cal.calcFoodKcal(kcalPer100, g)
    if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 50000) {
      wx.showToast({ title: '本次热量数值异常', icon: 'none' })
      return
    }
    const today = cal.dateKey()
    const day = cal.getDayLog(today)
    day.foods.push({ name: String(name).slice(0, 30), kcal, grams: g, meal })
    if (!cal.saveDayLog(today, day)) return
    // 添加成功后不返回，清空面板，支持继续录入下一项
    const count = this.data.addedCount + 1
    this.setData({
      addedCount: count,
      selFood: null,
      grams: '',
      foodKcal: 0
    })
    wx.showToast({ title: `已添加 ${kcal} kcal (${count})`, icon: 'success' })
  },

  // ---- 运动 ----
  onEkw(e) {
    const ekw = e.detail.value.trim()
    const exercises = ai.semanticSearch(ekw, cal.EXERCISE_DB) // 语义搜索
    this.setData({ ekw, exercises })
  },

  // 点击「常吃」快捷项，直接选中对应食物
  onFrequent(e) {
    const name = e.currentTarget.dataset.name
    const f = cal.FOOD_DB.find((x) => x.name === name)
    if (f) this.setData({ selFood: f, grams: '', foodKcal: 0, kw: '' })
  },
  onPickEx(e) {
    const name = e.currentTarget.dataset.name
    const ex = cal.EXERCISE_DB.find((x) => x.name === name)
    this.setData({ selEx: ex, minutes: '', exKcal: 0 })
  },
  // 关闭底部录入面板
  onClosePanel() {
    if (this.data.tab === 'food') {
      this.setData({ selFood: null, grams: '', foodKcal: 0 })
    } else {
      this.setData({ selEx: null, minutes: '', exKcal: 0 })
    }
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
    if (!Number.isFinite(m) || m <= 0) {
      wx.showToast({ title: '请填写有效运动时长', icon: 'none' })
      return
    }
    if (m > 600) {
      wx.showToast({ title: '时长请控制在 600 分钟内', icon: 'none' })
      return
    }
    const kcal = cal.calcExerciseKcal(selEx.met, m, this.data.weight)
    if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 10000) {
      wx.showToast({ title: '本次消耗热量异常', icon: 'none' })
      return
    }
    const today = cal.dateKey()
    const day = cal.getDayLog(today)
    day.exercises.push({ name: selEx.name.slice(0, 30), kcal, duration: m })
    if (!cal.saveDayLog(today, day)) return
    // 添加成功后不返回，清空面板，支持继续录入下一项
    const count = this.data.addedCount + 1
    this.setData({
      addedCount: count,
      selEx: null,
      minutes: '',
      exKcal: 0
    })
    wx.showToast({ title: `已添加 ${kcal} kcal (${count})`, icon: 'success' })
  },

  // 完成录入：返回上一页
  onDone() {
    if (this.data.addedCount > 0) {
      wx.showToast({ title: `本次共记录 ${this.data.addedCount} 项`, icon: 'success' })
      setTimeout(() => wx.navigateBack(), 400)
    } else {
      wx.navigateBack()
    }
  }
})
