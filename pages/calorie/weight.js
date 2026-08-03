// pages/calorie/weight.js
const cal = require('../../utils/calorie.js')

Page({
  data: {
    today: '',
    weightInput: '',
    list: [],
    ov: { currentWeight: 0, targetWeight: 0, lost: 0, remain: 0, daysToGoal: 0, progressPercent: 0 },
    points: 0
  },

  onLoad() {
    this.setData({ today: cal.dateKey() })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const profile = cal.getProfile()
    if (!profile) {
      wx.showToast({ title: '请先完善资料', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    const wl = cal.getWeightLog()
    const keys = Object.keys(wl).sort()
    const today = cal.dateKey()
    // 当前体重 = 最新记录；否则用资料里的当前体重
    const latest = keys.length ? wl[keys[keys.length - 1]] : profile.weight
    const startWeight = keys.length ? wl[keys[0]] : profile.weight
    if (profile.weight !== latest) {
      profile.weight = latest
      cal.saveProfile(profile)
    }
    const ov = cal.planOverview(profile)

    // 历史列表：补充星期、相对变化标签
    const dows = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const list = keys
      .slice()
      .reverse()
      .map((date, i) => {
        const w = wl[date]
        let deltaClass = 'flat'
        let deltaText = ''
        const originalIndex = keys.length - 1 - i
        if (originalIndex > 0) {
          const prevW = wl[keys[originalIndex - 1]]
          const diff = w - prevW
          if (Math.abs(diff) < 0.05) {
            deltaClass = 'flat'
            deltaText = '—'
          } else if (diff < 0) {
            deltaClass = 'down'
            deltaText = diff.toFixed(1)
          } else {
            deltaClass = 'up'
            deltaText = '+' + diff.toFixed(1)
          }
        }
        const d = new Date(date.replace(/-/g, '/'))
        return { date, weight: w, dow: dows[d.getDay()], deltaClass, deltaText }
      })

    // 整体趋势标签
    let trendClass = 'flat'
    let trendText = '持平'
    if (keys.length >= 2) {
      const diff = latest - startWeight
      if (diff < -0.05) {
        trendClass = 'down'
        trendText = '↓ 下降中'
      } else if (diff > 0.05) {
        trendClass = 'up'
        trendText = '↑ 上升中'
      }
    }

    this.setData({
      weightInput: wl[today] != null ? String(wl[today]) : '',
      list,
      points: keys.length,
      ov: {
        currentWeight: ov.currentWeight,
        targetWeight: ov.targetWeight,
        lost: ov.lost,
        remain: ov.remain,
        daysToGoal: ov.daysToGoal,
        progressPercent: Math.round(ov.progress * 100),
        startWeight: startWeight,
        trendClass,
        trendText
      }
    })
    this.drawTrend()
  },

  onInput(e) {
    this.setData({ weightInput: e.detail.value })
  },

  onSave() {
    const v = Number(this.data.weightInput)
    if (!v || v < 20 || v > 300) {
      wx.showToast({ title: '请填写有效体重', icon: 'none' })
      return
    }
    if (!cal.saveWeight(cal.dateKey(), v)) return
    wx.showToast({ title: '已记录', icon: 'success' })
    this.refresh()
  },

  onDelete(e) {
    const date = e.currentTarget.dataset.date
    wx.showModal({
      title: '删除记录',
      content: `确定删除 ${date} 的体重记录？`,
      success: (r) => {
        if (r.confirm) {
          if (!cal.saveWeight(date, '')) return
          this.refresh()
        }
      }
    })
  },

  drawTrend() {
    const wl = cal.getWeightLog()
    const keys = Object.keys(wl).sort()
    if (keys.length < 2) return
    const profile = cal.getProfile()
    const target = profile ? profile.targetWeight : null
    const pts = keys.map((d) => ({ x: d, y: wl[d] }))
    const values = pts.map((p) => p.y).concat(target != null ? [target] : [])
    let min = Math.min.apply(null, values)
    let max = Math.max.apply(null, values)
    if (max - min < 1) {
      min -= 1
      max += 1
    }
    const pad = (max - min) * 0.15
    min -= pad
    max += pad

    const query = wx.createSelectorQuery()
    query
      .select('#trend')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        let dpr = 2
        try {
          dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || 2
        } catch (e) {}
        const W = res[0].width
        const H = res[0].height
        canvas.width = W * dpr
        canvas.height = H * dpr
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, W, H)

        const padL = 36
        const padR = 16
        const padT = 16
        const padB = 24
        const cw = W - padL - padR
        const ch = H - padT - padB

        const xOf = (i) => padL + (pts.length === 1 ? cw / 2 : (cw * i) / (pts.length - 1))
        const yOf = (v) => padT + ch * (1 - (v - min) / (max - min))

        // 目标线
        if (target != null) {
          const ty = yOf(target)
          ctx.strokeStyle = '#ff7e8a'
          ctx.setLineDash([6, 6])
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(padL, ty)
          ctx.lineTo(W - padR, ty)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = '#ff7e8a'
          ctx.font = '11px sans-serif'
          ctx.fillText('目标', 4, ty + 4)
        }

        // 折线
          ctx.strokeStyle = '#ff7e8a'
        ctx.lineWidth = 2.5
        ctx.lineJoin = 'round'
        ctx.beginPath()
        pts.forEach((p, i) => {
          const x = xOf(i)
          const y = yOf(p.y)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()

        // 点
        pts.forEach((p, i) => {
          const x = xOf(i)
          const y = yOf(p.y)
          ctx.fillStyle = i === pts.length - 1 ? '#ff7e8a' : '#ffc2c9'
          ctx.beginPath()
          ctx.arc(x, y, i === pts.length - 1 ? 5 : 3.5, 0, Math.PI * 2)
          ctx.fill()
        })

        // 端点数值
        ctx.fillStyle = '#333'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        const last = pts[pts.length - 1]
        ctx.fillText(String(last.y), xOf(pts.length - 1), yOf(last.y) - 10)
      })
  }
})
