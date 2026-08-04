// pages/calorie/add.js
const cal = require('../../utils/calorie.js')
const ai = require('../../utils/ai.js')

Page({
  data: {
    // 多 tab：饮食/运动默认显示，饮水/围度/经期左滑出现（扩展功能）
    tab: 'food',
    tabs: ['food', 'exercise', 'water', 'measure', 'period'],
    tabLabels: { food: '记饮食', exercise: '记运动', water: '饮水', measure: '围度', period: '经期' },
    showPeriod: false, // 仅女性显示经期 tab

    // 饮食
    kw: '',
    foods: cal.FOOD_DB,
    frequent: [],
    favorList: [], // 收藏的常吃食物
    selFood: null,
    grams: '',
    foodKcal: 0,
    meals: ['早餐', '午餐', '晚餐', '加餐'],
    meal: '午餐',
    yesterdayFoods: [], // 昨日饮食（用于复制）

    // 运动
    ekw: '',
    exercises: cal.EXERCISE_DB,
    selEx: null,
    minutes: '',
    exKcal: 0,
    weight: 60,

    // 饮水
    waterToday: 0,
    waterGoal: 1500,

    // 围度
    measure: { waist: '', hip: '', thigh: '', arm: '' },

    // 经期
    period: { lastStart: '', cycleLen: 28, periodLen: 5, history: [] },
    nextPeriod: '',
    isPeriodToday: false,

    // 本次会话已添加项（支持连续录入多项后再返回）
    addedCount: 0
  },

  onLoad(options) {
    const p = cal.getProfile()
    const today = cal.dateKey()
    // 性别判断：仅女性显示经期 tab
    const showPeriod = p && p.gender === 'female'
    const tabs = showPeriod
      ? ['food', 'exercise', 'water', 'measure', 'period']
      : ['food', 'exercise', 'water', 'measure']
    this.setData({
      weight: p ? p.weight : 60,
      meal: ai.predictMeal(),
      frequent: ai.frequentFoods(6),
      favorList: cal.getFrequent(),
      showPeriod,
      tabs,
      // 饮水
      waterToday: cal.getWater(today),
      // 围度
      measure: this.loadMeasure(today),
      // 经期
      period: cal.getPeriod(),
      nextPeriod: cal.predictNextPeriod(),
      isPeriodToday: cal.isPeriodDay(today)
    })
    // 昨日饮食（用于复制昨日）
    const yesterday = this.yesterdayKey()
    const yDay = cal.getDayLog(yesterday)
    this.setData({ yesterdayFoods: yDay.foods || [] })

    if (options && options.tab && tabs.indexOf(options.tab) >= 0) {
      this.setData({ tab: options.tab })
    }
    // 首页饮食推荐跳转：带入搜索词并预填
    if (options && options.kw) {
      const kw = decodeURIComponent(options.kw)
      const foods = ai.semanticSearch(kw, cal.FOOD_DB)
      this.setData({ kw, foods })
    }
  },

  yesterdayKey() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return cal.dateKey(d)
  },

  loadMeasure(date) {
    const m = cal.getMeasure(date)
    return m ? { waist: String(m.waist || ''), hip: String(m.hip || ''), thigh: String(m.thigh || ''), arm: String(m.arm || '') }
      : { waist: '', hip: '', thigh: '', arm: '' }
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  // ---- 饮食 ----
  onKw(e) {
    const kw = e.detail.value.trim()
    const foods = ai.semanticSearch(kw, cal.FOOD_DB)
    this.setData({ kw, foods })
  },
  onPickFood(e) {
    const name = e.currentTarget.dataset.name
    const f = cal.FOOD_DB.find((x) => x.name === name)
    this.setData({ selFood: f, grams: '', foodKcal: 0 })
  },
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
  // 收藏/取消收藏当前食物到常吃
  onToggleFavor() {
    const f = this.data.selFood
    if (!f) return
    const list = cal.getFrequent()
    const exists = list.find((x) => x.name === f.name)
    if (exists) {
      cal.removeFrequent(f.name)
      wx.showToast({ title: '已取消收藏', icon: 'none' })
    } else {
      cal.addFrequent({ name: f.name, kcal: f.kcal, carb: f.carb || 0, protein: f.protein || 0, fat: f.fat || 0, cat: f.cat })
      wx.showToast({ title: '已加入常吃', icon: 'success' })
    }
    this.setData({ favorList: cal.getFrequent() })
  },
  // 点击收藏的常吃食物
  onPickFavor(e) {
    const name = e.currentTarget.dataset.name
    const f = cal.getFrequent().find((x) => x.name === name) || cal.FOOD_DB.find((x) => x.name === name)
    if (f) this.setData({ selFood: f, grams: '', foodKcal: 0 })
  },
  // 复制昨日某餐到今日
  onCopyYesterday(e) {
    const meal = e.currentTarget.dataset.meal || ''
    const yFoods = this.data.yesterdayFoods
    if (!yFoods || !yFoods.length) {
      wx.showToast({ title: '昨天没有饮食记录', icon: 'none' })
      return
    }
    const toCopy = meal ? yFoods.filter((f) => f.meal === meal) : yFoods
    if (!toCopy.length) {
      wx.showToast({ title: `昨天没有${meal}记录`, icon: 'none' })
      return
    }
    const today = cal.dateKey()
    const day = cal.getDayLog(today)
    toCopy.forEach((f) => {
      day.foods.push({ name: f.name, kcal: f.kcal, grams: f.grams, meal: f.meal, carb: f.carb || 0, protein: f.protein || 0, fat: f.fat || 0 })
    })
    if (!cal.saveDayLog(today, day)) return
    const count = this.data.addedCount + toCopy.length
    this.setData({ addedCount: count })
    wx.showToast({ title: `已复制 ${toCopy.length} 项`, icon: 'success' })
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
    // 保存营养素（库内食物自带，自定义食物为0）
    const carb = selFood.carb || 0
    const protein = selFood.protein || 0
    const fat = selFood.fat || 0
    const today = cal.dateKey()
    const day = cal.getDayLog(today)
    day.foods.push({ name: String(name).slice(0, 30), kcal, grams: g, meal, carb, protein, fat })
    if (!cal.saveDayLog(today, day)) return
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
    const exercises = ai.semanticSearch(ekw, cal.EXERCISE_DB)
    this.setData({ ekw, exercises })
  },
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
    const count = this.data.addedCount + 1
    this.setData({
      addedCount: count,
      selEx: null,
      minutes: '',
      exKcal: 0
    })
    wx.showToast({ title: `已添加 ${kcal} kcal (${count})`, icon: 'success' })
  },

  // ---- 饮水 ----
  onAddWater(e) {
    const delta = Number(e.currentTarget.dataset.ml) || 0
    const today = cal.dateKey()
    cal.addWater(today, delta)
    const waterToday = cal.getWater(today)
    this.setData({ waterToday })
    wx.showToast({ title: `+${delta}ml`, icon: 'none' })
  },
  onSubWater() {
    const today = cal.dateKey()
    const cur = cal.getWater(today)
    const next = Math.max(0, cur - 200)
    cal.saveWater(today, next)
    this.setData({ waterToday: next })
  },
  onClearWater() {
    const today = cal.dateKey()
    cal.saveWater(today, 0)
    this.setData({ waterToday: 0 })
  },

  // ---- 围度 ----
  onMeasureInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['measure.' + field]: e.detail.value })
  },
  onSaveMeasure() {
    const m = this.data.measure
    const today = cal.dateKey()
    cal.saveMeasure(today, {
      waist: Number(m.waist) || 0,
      hip: Number(m.hip) || 0,
      thigh: Number(m.thigh) || 0,
      arm: Number(m.arm) || 0
    })
    const count = this.data.addedCount + 1
    this.setData({ addedCount: count })
    wx.showToast({ title: '围度已记录', icon: 'success' })
  },

  // ---- 经期 ----
  onPeriodStart() {
    const today = cal.dateKey()
    const p = cal.logPeriodStart(today)
    this.setData({
      period: p,
      nextPeriod: cal.predictNextPeriod(),
      isPeriodToday: true
    })
    const count = this.data.addedCount + 1
    this.setData({ addedCount: count })
    wx.showToast({ title: '已记录经期开始', icon: 'success' })
  },
  onCycleInput(e) {
    const v = Number(e.detail.value) || 28
    const p = cal.getPeriod()
    p.cycleLen = Math.max(15, Math.min(60, v))
    cal.savePeriod(p)
    this.setData({ period: p, nextPeriod: cal.predictNextPeriod() })
  },
  onPeriodLenInput(e) {
    const v = Number(e.detail.value) || 5
    const p = cal.getPeriod()
    p.periodLen = Math.max(1, Math.min(15, v))
    cal.savePeriod(p)
    this.setData({ period: p, isPeriodToday: cal.isPeriodDay(cal.dateKey()) })
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
