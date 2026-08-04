// utils/ai.js
// 端侧轻量「AI 助手」—— 零联网、纯本地，无需后端/大模型
// 提供四类能力：
//   1. 语义搜索：拼音首字母 + 同义词 + 模糊匹配，增强食物/运动检索
//   2. 餐次预测：根据当前时间与历史习惯预选餐次
//   3. 动态激励文案：根据当日剩余热量/连续打卡生成鼓励语
//   4. 饮食推荐：剩余额度内推荐营养更优的食物组合
//
// 设计原则：不依赖网络，所有数据来自 utils/calorie.js 的本地库与本地存储。

const cal = require('./calorie.js')

// ------------------------------------------------------------------
// 1. 语义搜索
// ------------------------------------------------------------------

// 拼音首字母索引（覆盖 FOOD_DB / EXERCISE_DB 的中文名）
// 仅收录常用别名的首字母，避免体积过大
const PINYIN_INITIAL = {
  '白米饭(熟)': 'bmf', '糙米饭': 'cmf', '馒头': 'mt', '面条(煮)': 'mtz',
  '全麦面包': 'qmmb', '燕麦片(干)': 'ymp', '红薯': 'hs', '土豆': 'td',
  '玉米': 'ym', '鸡胸肉(水煮)': 'jxr', '鸡蛋': 'jd', '牛肉(瘦)': 'nrs',
  '猪肉(瘦)': 'zrs', '三文鱼': 'swy', '虾': 'x', '豆腐': 'df',
  '牛奶(全脂)': 'nn', '酸奶(原味)': 'sn', '奶酪': 'nl', '苹果': 'pg',
  '香蕉': 'xj', '橙子': 'cz', '葡萄': 'pt', '西瓜': 'xg', '蓝莓': 'lm',
  '牛油果': 'nyg', '西兰花': 'xlh', '番茄': 'fq', '黄瓜': 'hg', '菠菜': 'bc',
  '胡萝卜': 'hlb', '花生': 'hs', '杏仁': 'xr', '食用油': 'syy',
  '白砂糖': 'bst', '可乐': 'kl', '啤酒': 'pj', '巧克力': 'qkl',
  '步行(慢)': 'bxm', '快走': 'kz', '慢跑': 'jm', '跑步(配速6)': 'pb',
  '骑行': 'qx', '游泳(休闲)': 'yy', '跳绳': 'ts', '瑜伽': 'yj',
  '力量训练': 'llxl', '普拉提': 'plt', '椭圆机': 'tyj', '动感单车': 'dgdc',
  '篮球': 'lq', '足球': 'zq', '羽毛球': 'ymq', '网球': 'wq', '爬山': 'ps',
  '爬楼梯': 'plt', '跳舞': 'tw', '家务': 'jw'
}

// 同义词 / 口语别名 -> 标准名（命中后回查库）
const ALIAS = {
  '饭': '白米饭(熟)', '米饭': '白米饭(熟)', '大米': '白米饭(熟)',
  '杂粮饭': '糙米饭', '馒头饼': '馒头', '面': '面条(煮)', '面包': '全麦面包',
  '燕麥': '燕麦片(干)', '地瓜': '红薯', '马铃薯': '土豆', '洋芋': '土豆',
  '鸡肉': '鸡胸肉(水煮)', '蛋': '鸡蛋', '牛排': '牛肉(瘦)', '猪肉': '猪肉(瘦)',
  '鱼': '三文鱼', '牛奶奶': '牛奶(全脂)', '酸奶奶': '酸奶(原味)', '芝士': '奶酪',
  '梨': '苹果', '芭蕉': '香蕉', '桔子': '橙子', '提子': '葡萄',
  '西蓝花': '西兰花', '西红柿': '番茄', '胡瓜': '黄瓜', '波菜': '菠菜',
  '红萝卜': '胡萝卜', '花生米': '花生', '杏仁仁': '杏仁', '油': '食用油',
  '糖': '白砂糖', '雪碧': '可乐', '酒': '啤酒', '朱古力': '巧克力',
  '走': '快走', '散步': '步行(慢)', '跑': '慢跑', '骑车': '骑行',
  '游水': '游泳(休闲)', '跳': '跳绳', '瑜珈': '瑜伽', '撸铁': '力量训练',
  '单车': '动感单车', '打球': '篮球', '踢球': '足球', '羽毛球球': '羽毛球',
  '网卓球': '网球', '登山': '爬山', '楼梯': '爬楼梯', '舞蹈': '跳舞',
  '做家务': '家务', 'run': '慢跑', 'running': '慢跑', 'walk': '快走'
}

// 将字符串归一化为小写、去空格、去括号内容（用于别名匹配）
function normalize(s) {
  return String(s || '').toLowerCase().replace(/[\s()（）]/g, '')
}

// 语义搜索：输入关键字，从库里返回排序后的候选
// list: [{name, ...}] 数组；返回 score 降序的前 N 条
function semanticSearch(kw, list, limit) {
  kw = normalize(kw)
  if (!kw) return list.slice(0, limit || list.length)
  const scored = list.map((item) => {
    const name = item.name
    const nname = normalize(name)
    const initials = PINYIN_INITIAL[name] || ''
    let score = 0
    if (nname.indexOf(kw) >= 0) score = 100 - nname.indexOf(kw) // 名称包含关键字，越靠前越高
    else if (initials && initials.indexOf(kw) >= 0) score = 80 // 拼音首字母命中
    else if (initials && kw.indexOf(initials) >= 0) score = 70
    else if (PINYIN_INITIAL[kw] && PINYIN_INITIAL[kw] === initials) score = 60 // 反查
    // 别名匹配
    const aliasMatch = ALIAS[kw]
    if (aliasMatch && aliasMatch === name) score = Math.max(score, 90)
    // 部分别名包含（如 “鸡” 命中 “鸡肉”）
    for (const a in ALIAS) {
      if (a.indexOf(kw) >= 0 && ALIAS[a] === name) score = Math.max(score, 75)
    }
    return { item, score }
  }).filter((x) => x.score > 0)
  scored.sort((a, b) => b.score - a.score)
  const out = scored.map((x) => x.item)
  return limit ? out.slice(0, limit) : out
}

// ------------------------------------------------------------------
// 2. 餐次预测
// ------------------------------------------------------------------

// 根据当前小时推荐默认餐次
function predictMeal(date) {
  const h = (date || new Date()).getHours()
  if (h < 10) return '早餐'
  if (h < 14) return '午餐'
  if (h < 17) return '加餐'
  if (h < 21) return '晚餐'
  return '加餐'
}

// 根据用户历史记录，返回最常吃的若干食物（用于"常吃"快捷区）
function frequentFoods(limit) {
  const all = cal.getAllLogs()
  const counter = {}
  Object.keys(all).forEach((d) => {
    ;(all[d].foods || []).forEach((f) => {
      counter[f.name] = (counter[f.name] || 0) + 1
    })
  })
  const top = Object.keys(counter)
    .sort((a, b) => counter[b] - counter[a])
    .slice(0, limit || 6)
  return top.map((name) => {
    const f = cal.FOOD_DB.find((x) => x.name === name) || { name, kcal: 0, cat: '' }
    return { name: f.name, kcal: f.kcal, cat: f.cat }
  })
}

// ------------------------------------------------------------------
// 3. 动态激励文案
// ------------------------------------------------------------------

// 依据当日状态生成一句完整、自然的动态鼓励语（不含额度数字，避免干扰 banner 阅读）
// 额度信息展示在今日环形与「还能吃这些」推荐区，不在此处重复
// ctx: { remaining, foodKcal, target, streak }
function motivate(ctx) {
  const remaining = ctx.remaining || 0
  const foodKcal = ctx.foodKcal || 0
  if (foodKcal === 0) return '今天从记录第一餐开始，迈出减脂的第一步'
  if (remaining > 600) return '节奏很稳，今天放心吃顿营养好的'
  if (remaining > 0) return '继续保持，注意晚餐的分量就稳了'
  if (remaining === 0) return '刚刚好达标，今天的节奏非常完美'
  return '今天稍超了一点，别焦虑，明天多走几步就能追回来'
}

// 计算连续打卡天数（基于有饮食或运动或体重记录的最近连续日期）
// 今天还没记录则不计入但当天的“空缺”不中断序列（从昨天往前算）
function calcStreak() {
  const logs = cal.getAllLogs()
  const wl = cal.getWeightLog()
  const days = new Set(Object.keys(logs).filter((k) => {
    const e = logs[k]
    return e && ((e.foods && e.foods.length) || (e.exercises && e.exercises.length))
  }).concat(Object.keys(wl)))
  let streak = 0
  const d = new Date()
  // 今天若无记录则从昨天起算；一旦遇到空日期即中断
  for (let i = 0; i < 366; i++) {
    if (i === 0 && !days.has(cal.dateKey(d))) {
      d.setDate(d.getDate() - 1)
      continue
    }
    if (days.has(cal.dateKey(d))) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ------------------------------------------------------------------
// 4. 饮食推荐
// ------------------------------------------------------------------

// 在剩余额度内，推荐热量合适、营养更优的食物组合
// remaining: 剩余 kcal；返回推荐列表（含自然克数建议）
function recommendFoods(remaining, limit) {
  limit = limit || 3
  if (remaining <= 0) return []
  // 目标分量：剩余额度的 50%~70%，并约束在合理单份范围内
  const targetKcal = remaining * 0.6
  const cands = cal.FOOD_DB.filter((f) => {
    if (f.kcal <= 0) return false
    const grams = (targetKcal / f.kcal) * 100
    // 单份克数需在 20~500g 之间，避免推“10g 奶酪”这类不自然建议
    return grams >= 20 && grams <= 500
  })
  const priority = { 蛋白: 3, 果蔬: 2, 主食: 1, 零食: 0, 调料: 0, 饮品: 0 }
  cands.sort((a, b) => {
    const pa = priority[a.cat] || 0
    const pb = priority[b.cat] || 0
    if (pa !== pb) return pb - pa
    return Math.abs(a.kcal - targetKcal) - Math.abs(b.kcal - targetKcal)
  })
  return cands.slice(0, limit).map((f) => {
    const grams = Math.round(((targetKcal / f.kcal) * 100) / 5) * 5 // 取整到 5g
    return {
      name: f.name,
      kcal: f.kcal,
      cat: f.cat,
      suggest: `约 ${grams} g`
    }
  })
}

// 本周达标率：最近 7 天中“未超标”的天数占比
function weeklyCompliance() {
  const logs = cal.getAllLogs()
  const profile = cal.getProfile()
  if (!profile) return 0
  let done = 0
  let hit = 0
  const d = new Date()
  for (let i = 0; i < 7; i++) {
    const key = cal.dateKey(d)
    const day = logs[key]
    if (day && (day.foods.length || day.exercises.length)) {
      done++
      const s = cal.calcDaySummary(key, profile)
      if (s.remaining >= 0) hit++
    }
    d.setDate(d.getDate() - 1)
  }
  return done ? Math.round((hit / done) * 100) : 0
}

module.exports = {
  semanticSearch,
  predictMeal,
  frequentFoods,
  motivate,
  calcStreak,
  recommendFoods,
  weeklyCompliance
}
