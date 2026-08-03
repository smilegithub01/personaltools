// utils/growth.js
// 「生长树 / 周报 / 好友榜」共享逻辑库（纯本地，零后端）
// 依赖：utils/calorie.js 的本地数据

const cal = require('./calorie.js')

// 本地存储 key
const K_STREAK_BEST = 'growth_streak_best'   // 历史最长连续打卡
const K_TREE_STAGE = 'growth_tree_stage'     // 当前树等级（0-4），避免回退
const K_FRIENDS = 'growth_friends'           // 本地模拟好友榜（演示用，零后端）

// ---------- 通用：安全读写 ----------
function safeGet(key, fallback) {
  try {
    const v = wx.getStorageSync(key)
    return v === '' || v == null ? fallback : v
  } catch (e) { return fallback }
}
function safeSet(key, value) {
  try { wx.setStorageSync(key, value); return true } catch (e) { return false }
}

// ---------- 计算连续打卡天数（含今天） ----------
function calcStreak() {
  const logs = cal.getAllLogs()
  const today = cal.dateKey()
  let streak = 0
  const d = new Date()
  // 今天无记录则从昨天起算
  if (!hasLog(logs, today)) d.setDate(d.getDate() - 1)
  for (let i = 0; i < 365; i++) {
    const k = cal.dateKey(d)
    if (hasLog(logs, k)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
function hasLog(logs, dateKey) {
  const day = logs[dateKey]
  return day && ((day.foods && day.foods.length) || (day.exercises && day.exercises.length))
}

// ---------- 计算累计打卡天数（历史有记录的天数） ----------
function calcTotalCheckins() {
  const logs = cal.getAllLogs()
  return Object.keys(logs).filter(k => hasLog(logs, k)).length
}

// ---------- 生长树等级体系 ----------
// 5 个阶段，由「累计打卡天数」决定，但用 K_TREE_STAGE 防止回退（只升不降）
const TREE_STAGES = [
  { stage: 0, name: '种子', need: 0,  desc: '种下健康的种子，今天就开始吧' },
  { stage: 1, name: '幼苗', need: 3,  desc: '嫩芽破土，坚持让它长大' },
  { stage: 2, name: '小树', need: 7,  desc: '一周不缺席，小树有了枝干' },
  { stage: 3, name: '大树', need: 21, desc: '养成习惯，已长成挺拔的大树' },
  { stage: 4, name: '开花', need: 60, desc: '坚持绽放，你的生长树开花啦🌸' }
]

function getTreeStage(totalDays) {
  let stage = 0
  for (let i = TREE_STAGES.length - 1; i >= 0; i--) {
    if (totalDays >= TREE_STAGES[i].need) { stage = i; break }
  }
  // 只升不降：写入本地，下次即使数据异常也不回退
  const saved = safeGet(K_TREE_STAGE, 0)
  if (stage > saved) {
    safeSet(K_TREE_STAGE, stage)
    return stage
  }
  return saved
}

// 当前阶段进度（0~1）：到下一阶段还需多少天
function getTreeProgress(totalDays) {
  const stage = getTreeStage(totalDays)
  const cur = TREE_STAGES[stage]
  const next = TREE_STAGES[stage + 1]
  if (!next) return 1 // 已满级
  const span = next.need - cur.need
  const done = totalDays - cur.need
  return Math.max(0, Math.min(1, span > 0 ? done / span : 1))
}

// 汇总：给生长树页面用的数据
function buildTreeData() {
  const totalDays = calcTotalCheckins()
  const streak = calcStreak()
  const stage = getTreeStage(totalDays)
  const info = TREE_STAGES[stage]
  const next = TREE_STAGES[stage + 1]
  const progress = getTreeProgress(totalDays)
  // 历史最长连续
  const best = Math.max(safeGet(K_STREAK_BEST, 0), streak)
  safeSet(K_STREAK_BEST, best)

  return {
    totalDays,
    streak,
    stage,                 // 0-4
    stageName: info.name,
    stageDesc: info.desc,
    nextStageName: next ? next.name : '',
    nextNeed: next ? next.need : 0,
    daysToNext: next ? Math.max(0, next.need - totalDays) : 0,
    progress,              // 0-1
    bestStreak: best
  }
}

// ---------- 周报数据 ----------
function getWeekRange() {
  const now = new Date()
  const day = now.getDay() || 7 // 周日=7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1))
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(cal.dateKey(d))
  }
  return dates
}

function buildWeeklyReport() {
  const profile = cal.getProfile() || {}
  const dates = getWeekRange()
  const logs = cal.getAllLogs()
  let checkinDays = 0
  let totalFood = 0
  let totalExercise = 0
  const dayRecords = []
  dates.forEach((date, idx) => {
    const day = logs[date] || { foods: [], exercises: [] }
    const foodK = (day.foods || []).reduce((s, f) => s + (Number(f.kcal) || 0), 0)
    const exK = (day.exercises || []).reduce((s, e) => s + (Number(e.kcal) || 0), 0)
    const checked = (day.foods && day.foods.length) || (day.exercises && day.exercises.length)
    if (checked) checkinDays++
    totalFood += foodK
    totalExercise += exK
    dayRecords.push({
      idx,
      weekday: ['一', '二', '三', '四', '五', '六', '日'][idx],
      checked,
      foodK,
      exK
    })
  })
  const streak = calcStreak()
  const ov = cal.planOverview(profile)
  const compliance = checkinDays // 本周打卡天数即达标直观体现

  return {
    weekLabel: `${dates[0].slice(5)} ~ ${dates[6].slice(5)}`,
    checkinDays,
    totalFood: Math.round(totalFood),
    totalExercise: Math.round(totalExercise),
    streak,
    lost: ov.lost,
    currentWeight: ov.currentWeight,
    targetWeight: ov.targetWeight,
    dayRecords,
    nickname: profile.nickName || '我',
    goalText: ({ lose: '减脂', gain: '增肌', keep: '保持体重' })[profile.goalType] || '健康管理'
  }
}

// ---------- 好友榜（零后端：微信开放数据 + 本地模拟） ----------
// 说明：微信小游戏有开放数据域托管，但小程序无法直接读取好友数据。
// 真实社交需后端，本方案用「本地模拟好友 + 开放数据展示自己头像昵称」实现零成本演示，
// 后期接后端时只需替换 getFriends() 的数据来源。
function ensureFriendsSeed() {
  let friends = safeGet(K_FRIENDS, null)
  if (friends && Array.isArray(friends) && friends.length) return friends
  // 首次进入：生成 8 个模拟好友（零后端演示）
  const names = ['小鹿', '阿强', '柠檬', '大鱼', '可乐', '果冻', '北北', '七七']
  const avatars = ['🦌', '💪', '🍋', '🐟', '🥤', '🍮', '🐻', '🌿']
  friends = names.map((name, i) => ({
    id: 'f' + i,
    name,
    avatar: avatars[i],
    streak: Math.floor(Math.random() * 40) + 3,   // 3~42 天连续打卡
    days: Math.floor(Math.random() * 80) + 10,     // 累计 10~89 天
    isMe: false
  }))
  safeSet(K_FRIENDS, friends)
  return friends
}

function buildRank() {
  const myStreak = calcStreak()
  const myDays = calcTotalCheckins()
  const myBest = Math.max(safeGet(K_STREAK_BEST, 0), myStreak)

  const friends = ensureFriendsSeed().map(f => ({
    id: f.id,
    name: f.name,
    avatar: f.avatar,
    streak: f.streak,
    days: f.days,
    isMe: false
  }))

  // 把自己插入榜单（用 open-data 展示真实头像昵称由 wxml 处理）
  const me = { id: 'me', name: '我', avatar: '🙂', streak: myStreak, days: myDays, isMe: true }
  let list = friends.concat([me])
  // 按连续打卡降序
  list.sort((a, b) => b.streak - a.streak)
  list = list.map((item, i) => Object.assign({}, item, { rank: i + 1 }))

  const myRank = list.find(x => x.isMe).rank
  return { list, myRank, myStreak, myDays, myBest }
}

module.exports = {
  TREE_STAGES,
  calcStreak,
  calcTotalCheckins,
  getTreeStage,
  getTreeProgress,
  buildTreeData,
  buildWeeklyReport,
  buildRank,
  safeGet,
  safeSet
}
