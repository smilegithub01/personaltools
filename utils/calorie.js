// utils/calorie.js
// 卡路里 / 减肥计划管理 共享逻辑库（纯本地，无后端）
// 计算采用通用公式：
//   BMR  (Mifflin-St Jeor): 男 10*kg+6.25*cm-5*age+5 ; 女 10*kg+6.25*cm-5*age-161
//   TDEE = BMR * 活动系数
//   每日目标摄入 = TDEE - 每周减重(kg)*7700/7
//   运动消耗(kcal) = MET * 3.5 * 体重(kg) / 200 * 分钟

// ---------- 内置食物库（每100g：kcal 热量 / carb 碳水g / protein 蛋白g / fat 脂肪g）----------
// 数据参考《中国食物成分表》常见值，用于三大营养素分析
const FOOD_DB = [
  // 主食
  { name: '白米饭(熟)', kcal: 116, carb: 25.9, protein: 2.6, fat: 0.3, cat: '主食' },
  { name: '糙米饭', kcal: 112, carb: 23.5, protein: 2.6, fat: 0.9, cat: '主食' },
  { name: '馒头', kcal: 223, carb: 47.0, protein: 7.0, fat: 1.1, cat: '主食' },
  { name: '面条(煮)', kcal: 110, carb: 24.3, protein: 3.5, fat: 0.6, cat: '主食' },
  { name: '全麦面包', kcal: 246, carb: 43.0, protein: 9.0, fat: 4.2, cat: '主食' },
  { name: '燕麦片(干)', kcal: 367, carb: 61.6, protein: 15.0, fat: 6.7, cat: '主食' },
  { name: '红薯', kcal: 86, carb: 20.1, protein: 1.6, fat: 0.1, cat: '主食' },
  { name: '土豆', kcal: 77, carb: 17.2, protein: 2.0, fat: 0.2, cat: '主食' },
  { name: '玉米', kcal: 86, carb: 19.0, protein: 3.2, fat: 1.2, cat: '主食' },
  { name: '小米粥', kcal: 46, carb: 8.4, protein: 1.4, fat: 0.7, cat: '主食' },
  { name: '包子(猪肉)', kcal: 227, carb: 30.0, protein: 8.4, fat: 8.0, cat: '主食' },
  { name: '饺子(猪肉)', kcal: 240, carb: 27.0, protein: 9.0, fat: 10.0, cat: '主食' },
  { name: '年糕', kcal: 154, carb: 33.0, protein: 3.2, fat: 0.5, cat: '主食' },
  { name: '紫薯', kcal: 82, carb: 18.5, protein: 1.4, fat: 0.2, cat: '主食' },
  { name: '意大利面(煮)', kcal: 158, carb: 30.9, protein: 5.8, fat: 0.9, cat: '主食' },
  { name: '杂粮饭', kcal: 124, carb: 26.0, protein: 3.5, fat: 0.8, cat: '主食' },
  // 蛋白（肉禽蛋奶豆）
  { name: '鸡胸肉(水煮)', kcal: 133, carb: 0, protein: 30.0, fat: 1.2, cat: '蛋白' },
  { name: '鸡蛋', kcal: 144, carb: 1.5, protein: 13.3, fat: 8.8, cat: '蛋白' },
  { name: '牛肉(瘦)', kcal: 125, carb: 1.2, protein: 20.2, fat: 4.2, cat: '蛋白' },
  { name: '猪肉(瘦)', kcal: 143, carb: 1.5, protein: 20.3, fat: 6.2, cat: '蛋白' },
  { name: '三文鱼', kcal: 139, carb: 0, protein: 17.2, fat: 7.8, cat: '蛋白' },
  { name: '虾', kcal: 93, carb: 0, protein: 18.6, fat: 1.6, cat: '蛋白' },
  { name: '豆腐', kcal: 76, carb: 1.9, protein: 8.1, fat: 4.8, cat: '蛋白' },
  { name: '牛奶(全脂)', kcal: 54, carb: 3.4, protein: 3.0, fat: 3.2, cat: '蛋白' },
  { name: '酸奶(原味)', kcal: 72, carb: 9.3, protein: 2.5, fat: 2.7, cat: '蛋白' },
  { name: '奶酪', kcal: 328, carb: 3.5, protein: 25.7, fat: 23.5, cat: '蛋白' },
  { name: '鸡腿(去皮)', kcal: 181, carb: 0, protein: 24.0, fat: 9.0, cat: '蛋白' },
  { name: '鸭肉', kcal: 240, carb: 0.2, protein: 15.5, fat: 19.7, cat: '蛋白' },
  { name: '羊肉(瘦)', kcal: 118, carb: 0.2, protein: 20.5, fat: 3.9, cat: '蛋白' },
  { name: '带鱼', kcal: 127, carb: 0, protein: 17.7, fat: 4.9, cat: '蛋白' },
  { name: '鲫鱼', kcal: 108, carb: 0, protein: 17.1, fat: 2.7, cat: '蛋白' },
  { name: '龙利鱼', kcal: 83, carb: 0, protein: 17.7, fat: 1.0, cat: '蛋白' },
  { name: '鱿鱼', kcal: 92, carb: 3.0, protein: 17.0, fat: 1.0, cat: '蛋白' },
  { name: '蛋白(蛋清)', kcal: 60, carb: 1.0, protein: 11.6, fat: 0.1, cat: '蛋白' },
  { name: '豆浆(无糖)', kcal: 31, carb: 1.2, protein: 3.0, fat: 1.6, cat: '蛋白' },
  { name: '豆腐干', kcal: 153, carb: 4.2, protein: 16.2, fat: 8.6, cat: '蛋白' },
  { name: '培根', kcal: 181, carb: 1.4, protein: 22.0, fat: 9.0, cat: '蛋白' },
  { name: '火腿肠', kcal: 212, carb: 4.9, protein: 14.0, fat: 15.0, cat: '蛋白' },
  // 果蔬
  { name: '苹果', kcal: 52, carb: 13.8, protein: 0.3, fat: 0.2, cat: '果蔬' },
  { name: '香蕉', kcal: 89, carb: 22.8, protein: 1.1, fat: 0.3, cat: '果蔬' },
  { name: '橙子', kcal: 47, carb: 11.8, protein: 0.9, fat: 0.1, cat: '果蔬' },
  { name: '葡萄', kcal: 43, carb: 10.3, protein: 0.5, fat: 0.2, cat: '果蔬' },
  { name: '西瓜', kcal: 30, carb: 7.6, protein: 0.6, fat: 0.2, cat: '果蔬' },
  { name: '蓝莓', kcal: 57, carb: 14.5, protein: 0.7, fat: 0.3, cat: '果蔬' },
  { name: '牛油果', kcal: 160, carb: 8.5, protein: 2.0, fat: 14.7, cat: '果蔬' },
  { name: '西兰花', kcal: 34, carb: 4.3, protein: 4.1, fat: 0.6, cat: '果蔬' },
  { name: '番茄', kcal: 18, carb: 4.0, protein: 0.9, fat: 0.2, cat: '果蔬' },
  { name: '黄瓜', kcal: 15, carb: 2.9, protein: 0.8, fat: 0.2, cat: '果蔬' },
  { name: '菠菜', kcal: 23, carb: 2.8, protein: 2.6, fat: 0.3, cat: '果蔬' },
  { name: '胡萝卜', kcal: 41, carb: 10.2, protein: 1.0, fat: 0.2, cat: '果蔬' },
  { name: '生菜', kcal: 13, carb: 2.0, protein: 1.3, fat: 0.3, cat: '果蔬' },
  { name: '白菜', kcal: 17, carb: 3.2, protein: 1.5, fat: 0.1, cat: '果蔬' },
  { name: '芹菜', kcal: 12, carb: 1.6, protein: 1.2, fat: 0.1, cat: '果蔬' },
  { name: '茄子', kcal: 21, carb: 4.9, protein: 1.1, fat: 0.2, cat: '果蔬' },
  { name: '蘑菇', kcal: 22, carb: 4.1, protein: 3.1, fat: 0.3, cat: '果蔬' },
  { name: '木耳(水发)', kcal: 21, carb: 6.0, protein: 1.5, fat: 0.2, cat: '果蔬' },
  { name: '海带', kcal: 12, carb: 2.1, protein: 1.2, fat: 0.1, cat: '果蔬' },
  { name: '猕猴桃', kcal: 56, carb: 14.5, protein: 0.8, fat: 0.6, cat: '果蔬' },
  { name: '草莓', kcal: 32, carb: 7.1, protein: 0.7, fat: 0.3, cat: '果蔬' },
  { name: '柚子', kcal: 41, carb: 9.5, protein: 0.8, fat: 0.2, cat: '果蔬' },
  { name: '梨', kcal: 50, carb: 13.3, protein: 0.4, fat: 0.2, cat: '果蔬' },
  { name: '豌豆', kcal: 81, carb: 14.0, protein: 5.4, fat: 0.4, cat: '果蔬' },
  // 豆类/坚果
  { name: '花生', kcal: 567, carb: 16.0, protein: 25.8, fat: 49.2, cat: '坚果' },
  { name: '杏仁', kcal: 579, carb: 22.0, protein: 21.0, fat: 49.9, cat: '坚果' },
  { name: '核桃', kcal: 646, carb: 19.1, protein: 14.9, fat: 58.8, cat: '坚果' },
  { name: '腰果', kcal: 553, carb: 30.0, protein: 18.2, fat: 43.9, cat: '坚果' },
  { name: '开心果', kcal: 562, carb: 28.0, protein: 20.6, fat: 45.3, cat: '坚果' },
  { name: '黑豆', kcal: 381, carb: 33.6, protein: 36.0, fat: 15.9, cat: '坚果' },
  { name: '红豆', kcal: 309, carb: 55.7, protein: 21.7, fat: 0.7, cat: '坚果' },
  { name: '绿豆', kcal: 316, carb: 55.6, protein: 21.6, fat: 0.8, cat: '坚果' },
  // 零食/甜食
  { name: '巧克力', kcal: 546, carb: 59.0, protein: 7.3, fat: 31.0, cat: '零食' },
  { name: '薯片', kcal: 536, carb: 50.0, protein: 7.0, fat: 34.0, cat: '零食' },
  { name: '饼干', kcal: 433, carb: 67.0, protein: 9.0, fat: 13.0, cat: '零食' },
  { name: '蛋糕', kcal: 347, carb: 52.0, protein: 6.0, fat: 14.0, cat: '零食' },
  { name: '冰淇淋', kcal: 127, carb: 17.3, protein: 2.5, fat: 5.3, cat: '零食' },
  { name: '蛋黄派', kcal: 410, carb: 50.0, protein: 5.0, fat: 21.0, cat: '零食' },
  { name: '果冻', kcal: 60, carb: 15.0, protein: 0, fat: 0, cat: '零食' },
  // 调料/油脂
  { name: '食用油', kcal: 884, carb: 0, protein: 0, fat: 100.0, cat: '调料' },
  { name: '白砂糖', kcal: 400, carb: 99.9, protein: 0, fat: 0, cat: '调料' },
  { name: '蜂蜜', kcal: 304, carb: 75.6, protein: 0.3, fat: 0, cat: '调料' },
  { name: '芝麻酱', kcal: 618, carb: 22.0, protein: 19.0, fat: 52.7, cat: '调料' },
  { name: '番茄酱', kcal: 81, carb: 18.9, protein: 1.6, fat: 0.4, cat: '调料' },
  { name: '沙拉酱', kcal: 680, carb: 2.4, protein: 1.4, fat: 75.0, cat: '调料' },
  // 饮品
  { name: '可乐', kcal: 43, carb: 10.6, protein: 0, fat: 0, cat: '饮品' },
  { name: '啤酒', kcal: 43, carb: 3.6, protein: 0.5, fat: 0, cat: '饮品' },
  { name: '橙汁', kcal: 45, carb: 10.4, protein: 0.7, fat: 0.2, cat: '饮品' },
  { name: '拿铁咖啡', kcal: 75, carb: 5.7, protein: 3.4, fat: 4.0, cat: '饮品' },
  { name: '美式咖啡', kcal: 5, carb: 0.7, protein: 0.3, fat: 0.2, cat: '饮品' },
  { name: '奶茶(全糖)', kcal: 95, carb: 14.0, protein: 2.0, fat: 3.5, cat: '饮品' },
  { name: '柠檬水', kcal: 15, carb: 3.8, protein: 0.1, fat: 0, cat: '饮品' },
  // 菜肴（常见家常菜，估算值）
  { name: '番茄炒蛋', kcal: 110, carb: 4.5, protein: 6.5, fat: 7.5, cat: '菜肴' },
  { name: '宫保鸡丁', kcal: 215, carb: 8.0, protein: 14.0, fat: 15.0, cat: '菜肴' },
  { name: '红烧肉', kcal: 350, carb: 8.0, protein: 13.0, fat: 32.0, cat: '菜肴' },
  { name: '麻婆豆腐', kcal: 130, carb: 4.0, protein: 8.0, fat: 9.0, cat: '菜肴' },
  { name: '鱼香肉丝', kcal: 180, carb: 9.0, protein: 10.0, fat: 12.0, cat: '菜肴' },
  { name: '清炒西兰花', kcal: 55, carb: 4.5, protein: 3.5, fat: 2.5, cat: '菜肴' },
  { name: '醋溜土豆丝', kcal: 95, carb: 14.0, protein: 2.0, fat: 3.5, cat: '菜肴' },
  { name: '蛋炒饭', kcal: 174, carb: 25.0, protein: 5.5, fat: 6.0, cat: '菜肴' },
  { name: '火锅(人均每100g)', kcal: 180, carb: 6.0, protein: 10.0, fat: 14.0, cat: '菜肴' },
  { name: '麻辣烫', kcal: 130, carb: 8.0, protein: 8.0, fat: 8.0, cat: '菜肴' },
  { name: '汉堡', kcal: 295, carb: 24.0, protein: 13.0, fat: 17.0, cat: '菜肴' },
  { name: '披萨', kcal: 266, carb: 33.0, protein: 11.0, fat: 10.0, cat: '菜肴' },
  { name: '炸鸡', kcal: 246, carb: 12.0, protein: 19.0, fat: 15.0, cat: '菜肴' },
  { name: '寿司', kcal: 140, carb: 28.0, protein: 5.0, fat: 1.0, cat: '菜肴' }
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
const K_FREQUENT = 'calorie_frequent' // 常吃食物收藏 [{name,kcal,carb,protein,fat,cat}]
const K_WATER = 'calorie_water' // { 'YYYY-MM-DD': ml }
const K_MEASURE = 'calorie_measure' // { 'YYYY-MM-DD': {waist,hip,thigh,arm} }
const K_PERIOD = 'calorie_period' // { lastStart:'YYYY-MM-DD', cycleLen:28, periodLen:5, history:['YYYY-MM-DD'] }

// 按食物名查找库内记录（含营养素）
function findFood(name) {
  return FOOD_DB.find((f) => f.name === name) || null
}

// 取食物的营养素（每100g），优先用记录自带，否则查库
function foodNutrients(food) {
  if (food.carb != null || food.protein != null || food.fat != null) {
    return {
      carb: Number(food.carb) || 0,
      protein: Number(food.protein) || 0,
      fat: Number(food.fat) || 0
    }
  }
  const db = findFood(food.name)
  if (db) return { carb: db.carb || 0, protein: db.protein || 0, fat: db.fat || 0 }
  return { carb: 0, protein: 0, fat: 0 }
}

// ---------- 日期 ----------
function dateKey(d) {
  d = d || new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---------- 读写 ----------
function safeGet(key, fallback) {
  try {
    const value = wx.getStorageSync(key)
    return value === '' || value == null ? fallback : value
  } catch (error) {
    console.error(`读取本地数据失败: ${key}`, error)
    return fallback
  }
}
function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (error) {
    console.error(`保存本地数据失败: ${key}`, error)
    wx.showToast({ title: '本地数据保存失败', icon: 'none' })
    return false
  }
}
function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}
function getAllLogs() {
  const rawLogs = safeGet(K_LOGS, {})
  if (!isObject(rawLogs)) return {}
  const logs = {}
  Object.keys(rawLogs).forEach((date) => {
    const day = rawLogs[date]
    if (!isObject(day)) return
    logs[date] = {
      foods: Array.isArray(day.foods) ? day.foods : [],
      exercises: Array.isArray(day.exercises) ? day.exercises : []
    }
  })
  return logs
}
function getProfile() {
  const profile = safeGet(K_PROFILE, null)
  return isObject(profile) ? profile : null
}
function saveProfile(p) {
  return safeSet(K_PROFILE, p)
}
function getWeightLog() {
  const rawLog = safeGet(K_WEIGHT, {})
  if (!isObject(rawLog)) return {}
  const log = {}
  Object.keys(rawLog).forEach((date) => {
    const weight = Number(rawLog[date])
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(weight) && weight >= 20 && weight <= 300) {
      log[date] = weight
    }
  })
  return log
}
function getLatestWeight(log) {
  const weightLog = log || getWeightLog()
  const keys = Object.keys(weightLog).sort()
  return keys.length ? Number(weightLog[keys[keys.length - 1]]) : null
}
function syncProfileWeight(log) {
  const profile = getProfile()
  const latestWeight = getLatestWeight(log)
  if (profile && Number.isFinite(latestWeight) && Number(profile.weight) !== latestWeight) {
    saveProfile(Object.assign({}, profile, { weight: latestWeight }))
  }
  return latestWeight
}
function saveWeight(date, value) {
  const log = getWeightLog()
  if (value === '' || value == null) {
    delete log[date]
  } else {
    const weight = Number(value)
    if (!Number.isFinite(weight) || weight < 20 || weight > 300) {
      return false
    }
    log[date] = weight
  }
  if (!safeSet(K_WEIGHT, log)) return false
  syncProfileWeight(log)
  return true
}
function getDayLog(date) {
  const logs = getAllLogs()
  const day = isObject(logs[date]) ? logs[date] : {}
  return {
    foods: Array.isArray(day.foods) ? day.foods : [],
    exercises: Array.isArray(day.exercises) ? day.exercises : []
  }
}
function saveDayLog(date, day) {
  const logs = getAllLogs()
  logs[date] = {
    foods: Array.isArray(day.foods) ? day.foods : [],
    exercises: Array.isArray(day.exercises) ? day.exercises : []
  }
  return safeSet(K_LOGS, logs)
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
  // 三大营养素汇总（按实际克数折算）
  let carb = 0, protein = 0, fat = 0
  day.foods.forEach((f) => {
    const n = foodNutrients(f)
    const g = Number(f.grams) || 0
    carb += (n.carb * g) / 100
    protein += (n.protein * g) / 100
    fat += (n.fat * g) / 100
  })
  return {
    foodKcal,
    exerciseKcal,
    target,
    budget,
    remaining,
    ratio: Math.max(0, Math.min(1, ratio)),
    carb: Math.round(carb * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    fat: Math.round(fat * 10) / 10
  }
}

// 三大营养素热量占比与均衡度评分（0-100）
// 参考比例：碳水 50% / 蛋白 20% / 脂肪 30%，偏离扣分
function calcNutrientScore(carb, protein, fat) {
  const cK = carb * 4, pK = protein * 4, fK = fat * 9
  const total = cK + pK + fK
  if (total < 50) return { score: 0, carbPct: 0, proteinPct: 0, fatPct: 0 }
  const carbPct = Math.round((cK / total) * 100)
  const proteinPct = Math.round((pK / total) * 100)
  const fatPct = 100 - carbPct - proteinPct
  // 偏离参考比例的绝对差，越小越好
  const dev = Math.abs(carbPct - 50) + Math.abs(proteinPct - 20) + Math.abs(fatPct - 30)
  const score = Math.max(0, Math.min(100, 100 - dev))
  return { score, carbPct, proteinPct, fatPct }
}

// ---------- 常吃食物收藏 ----------
function getFrequent() {
  const list = safeGet(K_FREQUENT, [])
  return Array.isArray(list) ? list : []
}
function addFrequent(food) {
  const list = getFrequent()
  if (!list.find((f) => f.name === food.name)) {
    list.unshift({
      name: food.name,
      kcal: food.kcal,
      carb: food.carb || 0,
      protein: food.protein || 0,
      fat: food.fat || 0,
      cat: food.cat || ''
    })
    safeSet(K_FREQUENT, list.slice(0, 30))
  }
  return list
}
function removeFrequent(name) {
  const list = getFrequent().filter((f) => f.name !== name)
  safeSet(K_FREQUENT, list)
  return list
}

// ---------- 饮水量记录 ----------
function getWater(date) {
  const log = safeGet(K_WATER, {})
  return isObject(log) ? (Number(log[date]) || 0) : 0
}
function saveWater(date, ml) {
  const log = safeGet(K_WATER, {})
  log[date] = Math.max(0, Number(ml) || 0)
  return safeSet(K_WATER, log)
}
function addWater(date, delta) {
  const cur = getWater(date)
  return saveWater(date, cur + (Number(delta) || 0))
}

// ---------- 身体围度记录 ----------
function getMeasureLog() {
  const log = safeGet(K_MEASURE, {})
  return isObject(log) ? log : {}
}
function getMeasure(date) {
  return getMeasureLog()[date] || null
}
function saveMeasure(date, m) {
  const log = getMeasureLog()
  log[date] = {
    waist: Number(m.waist) || 0,
    hip: Number(m.hip) || 0,
    thigh: Number(m.thigh) || 0,
    arm: Number(m.arm) || 0
  }
  return safeSet(K_MEASURE, log)
}

// ---------- 经期记录 ----------
function getPeriod() {
  return safeGet(K_PERIOD, { lastStart: '', cycleLen: 28, periodLen: 5, history: [] })
}
function savePeriod(p) {
  return safeSet(K_PERIOD, {
    lastStart: p.lastStart || '',
    cycleLen: Number(p.cycleLen) || 28,
    periodLen: Number(p.periodLen) || 5,
    history: Array.isArray(p.history) ? p.history.slice(-60) : []
  })
}
// 记录一次经期开始日
function logPeriodStart(date) {
  const p = getPeriod()
  if (p.lastStart === date) return p
  p.history.push(date)
  p.history = p.history.slice(-60)
  p.lastStart = date
  savePeriod(p)
  return p
}
// 预测下次经期开始日
function predictNextPeriod() {
  const p = getPeriod()
  if (!p.lastStart) return ''
  const d = new Date(p.lastStart)
  d.setDate(d.getDate() + (Number(p.cycleLen) || 28))
  return dateKey(d)
}
// 判断某日是否在经期范围内
function isPeriodDay(date) {
  const p = getPeriod()
  if (!p.lastStart) return false
  const start = new Date(p.lastStart)
  const end = new Date(p.lastStart)
  end.setDate(end.getDate() + (Number(p.periodLen) || 5) - 1)
  const target = new Date(date)
  return target >= start && target <= end
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
  getLatestWeight,
  syncProfileWeight,
  saveWeight,
  getAllLogs,
  getDayLog,
  saveDayLog,
  calcBMR,
  calcTDEE,
  calcTarget,
  calcBMI,
  calcExerciseKcal,
  calcFoodKcal,
  calcDaySummary,
  calcNutrientScore,
  findFood,
  foodNutrients,
  getFrequent,
  addFrequent,
  removeFrequent,
  getWater,
  saveWater,
  addWater,
  getMeasureLog,
  getMeasure,
  saveMeasure,
  getPeriod,
  savePeriod,
  logPeriodStart,
  predictNextPeriod,
  isPeriodDay,
  planOverview
}
