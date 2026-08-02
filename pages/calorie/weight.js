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
    const list = keys
      .slice()
      .reverse()
      .map((date) => ({ date, weight: wl[date] }))
    const today = cal.dateKey()
    // 当前体重 = 最新记录；否则用资料里的当前体重
    const latest = keys.length ? wl[keys[keys.length - 1]] : profile.weight
    if (profile.weight !== latest) {
      profile.weight = latest
      cal.saveProfile(profile)
    }
    const ov = cal.planOverview(profile)
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
        progressPercent: Math.round(ov.progress * 100)
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
    cal.saveWeight(cal.dateKey(), v)
    // 同步更新资料里的当前体重
    const p = cal.getProfile()
    if (p) {
      p.weight = v
      cal.saveProfile(p)
    }
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
          cal.saveWeight(date, '')
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
          ctx.strokeStyle = '#ff7043'
          ctx.setLineDash([6, 6])
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(padL, ty)
          ctx.lineTo(W - padR, ty)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = '#ff7043'
          ctx.font = '11px sans-serif'
          ctx.fillText('目标', 4, ty + 4)
        }

        // 折线
        ctx.strokeStyle = '#4caf50'
        ctx.lineWidth = 2.5
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
          ctx.fillStyle = i === pts.length - 1 ? '#ff7043' : '#4caf50'
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
