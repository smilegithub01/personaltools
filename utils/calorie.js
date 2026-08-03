// utils/calorie.js
// 卡路里 / 减肥计划管理 共享逻辑库（纯本地，无后端）
// 计算采用通用公式：
//   BMR  (Mifflin-St Jeor): 男 10*kg+6.25*cm-5*age+5 ; 女 10*kg+6.25*cm-5*age-161
//   TDEE = BMR * 活动系数
//   每日目标摄入 = TDEE - 每周减重(kg)*7700/7
//   运动消耗(kcal) = MET * 3.5 * 体重(kg) / 200 * 分钟

// ---------- 内置食物库（kcal / 100g）----------
const FOOD_DB = [
  { name: '白米饭(熟)', kcal: 116, cat: '主食' },
  { name: '糙米饭', kcal: 112, cat: '主食' },
  { name: '馒头', kcal: 223, cat: '主食' },
  { name: '面条(煮)', kcal: 110, cat: '主食' },
  { name: '全麦面包', kcal: 246, cat: '主食' },
  { name: '燕麦片(干)', kcal: 367, cat: '主食' },
  { name: '红薯', kcal: 86, cat: '主食' },
  { name: '土豆', kcal: 77, cat: '主食' },
  { name: '玉米', kcal: 86, cat: '主食' },
  { name: '鸡胸肉(水煮)', kcal: 133, cat: '蛋白' },
  { name: '鸡蛋', kcal: 144, cat: '蛋白' },
  { name: '牛肉(瘦)', kcal: 125, cat: '蛋白' },
  { name: '猪肉(瘦)', kcal: 143, cat: '蛋白' },
  { name: '三文鱼', kcal: 139, cat: '蛋白' },
  { name: '虾', kcal: 93, cat: '蛋白' },
  { name: '豆腐', kcal: 76, cat: '蛋白' },
  { name: '牛奶(全脂)', kcal: 54, cat: '蛋白' },
  { name: '酸奶(原味)', kcal: 72, cat: '蛋白' },
  { name: '奶酪', kcal: 328, cat: '蛋白' },
  { name: '苹果', kcal: 52, cat: '果蔬' },
  { name: '香蕉', kcal: 89, cat: '果蔬' },
  { name: '橙子', kcal: 47, cat: '果蔬' },
  { name: '葡萄', kcal: 43, cat: '果蔬' },
  { name: '西瓜', kcal: 30, cat: '果蔬' },
  { name: '蓝莓', kcal: 57, cat: '果蔬' },
  { name: '牛油果', kcal: 160, cat: '果蔬' },
  { name: '西兰花', kcal: 34, cat: '果蔬' },
  { name: '番茄', kcal: 18, cat: '果蔬' },
  { name: '黄瓜', kcal: 15, cat: '果蔬' },
  { name: '菠菜', kcal: 23, cat: '果蔬' },
  { name: '胡萝卜', kcal: 41, cat: '果蔬' },
  { name: '花生', kcal: 567, cat: '零食' },
  { name: '杏仁', kcal: 579, cat: '零食' },
  { name: '食用油', kcal: 884, cat: '调料' },
  { name: '白砂糖', kcal: 400, cat: '调料' },
  { name: '可乐', kcal: 43, cat: '饮品' },
  { name: '啤酒', kcal: 43, cat: '饮品' },
  { name: '巧克力', kcal: 546, cat: '零食' }
]

// ---------- 内置运动库（MET 值）----------
const EXERCISE_DB = [
  { name: '步行(慢)', met: 3.5 },
  { name: '快走', met: 4.3 },
  { name: '慢跑', met: 7.0 },
  { name: '跑步(配速6)', met: 9.8 },
  { name: '骑行', met: 7.5 },
  { name: '游泳(休闲)', met: 6.0 },
  { name: '跳绳', met: 11.0 },
  { name: '瑜伽', met: 2.5 },
  { name: '力量训练', met: 5.0 },
  { name: '普拉提', met: 3.0 },
  { name: '椭圆机', met: 5.0 },
  { name: '动感单车', met: 8.5 },
  { name: '篮球', met: 6.5 },
  { name: '足球', met: 7.0 },
  { name: '羽毛球', met: 5.5 },
  { name: '网球', met: 7.3 },
  { name: '爬山', met: 7.0 },
  { name: '爬楼梯', met: 8.0 },
  { name: '跳舞', met: 5.0 },
  { name: '家务', met: 3.0 }
]

// 活动水平系数
const ACTIVITY = [
  { key: 'sedentary', label: '久坐（很少运动）', factor: 1.2 },
  { key: 'light', label: '轻度（每周1-3次）', factor: 1.375 },
  { key: 'moderate', label: '中度（每周3-5次）', factor: 1.55 },
  { key: 'active', label: '高度（每周6-7次）', factor: 1.725 },
  { key: 'athlete', label: '运动员（高强度）', factor: 1.9 }
]

const KCAL_PER_KG = 7700 // 减 1kg 脂肪约需 7700 kcal 缺口

// ---------- 存储 key ----------
const K_PROFILE = 'calorie_profile'
const K_WEIGHT = 'calorie_weight_log' // { 'YYYY-MM-DD': number }
const K_LOGS = 'calorie_logs' // { 'YYYY-MM-DD': { foods:[], exercises:[] } }

// ---------- 日期 ----------
function dateKey(d) {
  d = d || new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---------- 读写 ----------
function getProfile() {
  return wx.getStorageSync(K_PROFILE) || null
}
function saveProfile(p) {
  wx.setStorageSync(K_PROFILE, p)
}
function getWeightLog() {
  return wx.getStorageSync(K_WEIGHT) || {}
}
function saveWeight(date, value) {
  const log = getWeightLog()
  if (value === '' || value == null) {
    delete log[date]
  } else {
    log[date] = Number(value)
  }
  wx.setStorageSync(K_WEIGHT, log)
}
function getDayLog(date) {
  const all = wx.getStorageSync(K_LOGS) || {}
  return all[date] || { foods: [], exercises: [] }
}
function saveDayLog(date, day) {
  const all = wx.getStorageSync(K_LOGS) || {}
  all[date] = day
  wx.setStorageSync(K_LOGS, all)
}

// ---------- 计算 ----------
function calcBMR(p) {
  if (!p || !p.gender || !p.age || !p.height || !p.weight) return 0
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age
  return Math.round(p.gender === 'male' ? base + 5 : base - 161)
}

function getActivityFactor(key) {
  const a = ACTIVITY.find((x) => x.key === key)
  return a ? a.factor : 1.2
}

function calcTDEE(p) {
  const bmr = calcBMR(p)
  return Math.round(bmr * getActivityFactor(p.activity))
}

// 每日目标摄入：TDEE - 每周减重对应的每日缺口，并设安全下限
function calcTarget(p) {
  const tdee = calcTDEE(p)
  const weeklyRate = Number(p.weeklyRate) || 0.5
  const deficit = (weeklyRate * KCAL_PER_KG) / 7
  let target = tdee - deficit
  const bmr = calcBMR(p)
  // 安全下限：不低于 BMR，且不低于 1200
  const floor = Math.max(bmr, 1200)
  let warn = ''
  if (target < floor) {
    warn = `目标低于安全下限（不低于基础代谢 ${bmr} kcal），已调整到 ${floor} kcal。建议放慢减重速度。`
    target = floor
  }
  return { tdee, target, deficit: Math.round(deficit), warn }
}

// 运动消耗
function calcExerciseKcal(met, minutes, weight) {
  return Math.round((met * 3.5 * weight) / 200 * minutes)
}

// 食物热量
function calcFoodKcal(kcalPer100, grams) {
  return Math.round((kcalPer100 * grams) / 100)
}

// 当日汇总
function calcDaySummary(date, profile) {
  const day = getDayLog(date)
  const foodKcal = day.foods.reduce((s, f) => s + (Number(f.kcal) || 0), 0)
  const exerciseKcal = day.exercises.reduce((s, e) => s + (Number(e.kcal) || 0), 0)
  const target = profile ? calcTarget(profile).target : 0
  const budget = target + exerciseKcal // 运动可“赚”回额度
  const remaining = budget - foodKcal
  const ratio = target > 0 ? Math.min(1, foodKcal / target) : 0
  return {
    foodKcal,
    exerciseKcal,
    target,
    budget,
    remaining,
    ratio: Math.max(0, Math.min(1, ratio))
  }
}

// 减肥计划概览
function planOverview(profile) {
  const weightLog = getWeightLog()
  const keys = Object.keys(weightLog).sort()
  const startWeight = keys.length ? weightLog[keys[0]] : profile.weight
  // currentWeight 取最新一条体重记录，与 profile.weight 解耦，避免目标漂移
  const currentWeight = keys.length ? weightLog[keys[keys.length - 1]] : profile.weight
  const targetWeight = profile.targetWeight
  const totalToLose = Math.max(0, startWeight - targetWeight)
  const lost = Math.max(0, round1(startWeight - currentWeight))
  const remain = Math.max(0, round1(currentWeight - targetWeight))
  const weeklyRate = Number(profile.weeklyRate) || 0.5
  const daysToGoal = weeklyRate > 0 && remain > 0 ? Math.ceil((remain / weeklyRate) * 7) : 0
  const progress = totalToLose > 0 ? Math.min(1, lost / totalToLose) : 0
  return {
    startWeight: round1(startWeight),
    currentWeight: round1(currentWeight),
    targetWeight: round1(targetWeight),
    totalToLose: round1(totalToLose),
    lost,
    remain,
    daysToGoal,
    progress
  }
}

// BMI 计算与中文分级（亚洲标准）
function calcBMI(p) {
  if (!p || !p.height || !p.weight) return null
  const m = p.height / 100
  const bmi = p.weight / (m * m)
  let level = '正常'
  let cls = 'normal'
  if (bmi < 18.5) { level = '偏瘦'; cls = 'low' }
  else if (bmi < 24) { level = '正常'; cls = 'normal' }
  else if (bmi < 28) { level = '偏胖'; cls = 'high' }
  else { level = '肥胖'; cls = 'obese' }
  return { bmi: Math.round(bmi * 10) / 10, level, cls }
}

function round1(n) {
  return Math.round(n * 10) / 10
}

module.exports = {
  FOOD_DB,
  EXERCISE_DB,
  ACTIVITY,
  KCAL_PER_KG,
  dateKey,
  getProfile,
  saveProfile,
  getWeightLog,
  saveWeight,
  getDayLog,
  saveDayLog,
  calcBMR,
  calcTDEE,
  calcTarget,
  calcBMI,
  calcExerciseKcal,
  calcFoodKcal,
  calcDaySummary,
  planOverview
}
