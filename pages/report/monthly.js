// pages/report/monthly.js —— 可分享月报卡片（含营养素环形图 + 体重曲线）
const growth = require('../../utils/growth.js')

Page({
  data: {
    report: {},
    // 营养素环形图周长参数（半径 60，周长 439.8）
    carbArc: 0,
    proteinArc: 0,
    fatArc: 0,
    // 体重变化展示
    weightText: '—',
    weightDir: 0,            // -1 减重 / 0 无变化 / 1 增重 / null 无记录
    canvasReady: false,
    savedTip: ''
  },

  onLoad() {
    const report = growth.buildMonthlyReport()
    const carbArc = Math.round(439.8 * (report.carbPct / 100))
    const proteinArc = Math.round(439.8 * (report.proteinPct / 100))
    const fatArc = Math.round(439.8 * (report.fatPct / 100))
    // 体重变化展示文案
    let weightText = '—'
    let weightDir = 0
    if (report.weightChange == null) {
      weightText = '本月暂无记录'
      weightDir = null
    } else if (report.weightChange < 0) {
      weightText = '↓ ' + Math.abs(report.weightChange).toFixed(1) + ' kg'
      weightDir = -1
    } else if (report.weightChange > 0) {
      weightText = '↑ ' + report.weightChange.toFixed(1) + ' kg'
      weightDir = 1
    } else {
      weightText = '持平'
      weightDir = 0
    }
    this.setData({ report, carbArc, proteinArc, fatArc, weightText, weightDir })
    // 等 canvas 节点渲染后标记 ready
    wx.nextTick(() => this.setData({ canvasReady: true }))
  },

  // 保存卡片到相册（生成图片）
  saveCard() {
    if (!this.data.canvasReady) {
      wx.showToast({ title: '卡片生成中…', icon: 'none' })
      return
    }
    const query = wx.createSelectorQuery()
    query.select('#cardCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          wx.showToast({ title: '画布未就绪', icon: 'none' })
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        this.drawCard(canvas, ctx, () => {
          wx.canvasToTempFilePath({
            canvas,
            success: (r) => {
              this.saveToAlbum(r.tempFilePath)
            },
            fail: (e) => {
              wx.showToast({ title: '生成失败', icon: 'none' })
              console.warn('canvasToTempFilePath fail', e)
            }
          })
        })
      })
  },

  saveToAlbum(tempPath) {
    wx.saveImageToPhotosAlbum({
      filePath: tempPath,
      success: () => {
        this.setData({ savedTip: '已保存到相册，去朋友圈分享吧 🌿' })
        wx.showToast({ title: '已保存', icon: 'success' })
      },
      fail: (err) => {
        if (/auth|deny|authorize/i.test(String(err.errMsg))) {
          // 引导开启权限
          wx.showModal({
            title: '需开启相册权限',
            content: '保存月报卡片需要相册权限，是否前往设置开启？',
            confirmText: '去设置',
            success: (m) => { if (m.confirm) wx.openSetting() }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  // 在 Canvas 2D 上绘制月报卡片（月度数据 + 体重曲线简图）
  drawCard(canvas, ctx, done) {
    const r = this.data.report
    const dpr = wx.getSystemInfoSync().pixelRatio || 2
    const W = 300, H = 520
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    // 背景圆角
    this.roundRect(ctx, 0, 0, W, H, 20)
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#1d3b32')
    bg.addColorStop(1, '#2f7d5b')
    ctx.fillStyle = bg
    ctx.fill()

    // 顶部标题
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText('📊 我的健康月报', 22, 44)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,.7)'
    ctx.fillText(r.monthLabel + '  ·  ' + r.goalText, 22, 66)

    // 分割线
    ctx.strokeStyle = 'rgba(255,255,255,.18)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(22, 82); ctx.lineTo(W - 22, 82); ctx.stroke()

    // 三大数据
    const wcText = r.weightChange == null
      ? '—'
      : (r.weightChange < 0 ? '-' : '+') + Math.abs(r.weightChange).toFixed(1)
    const stats = [
      { num: r.checkinDays, label: '本月打卡(天)' },
      { num: r.streak, label: '连续打卡(天)' },
      { num: wcText, label: '体重变化(kg)' }
    ]
    const colW = (W - 44) / 3
    stats.forEach((s, i) => {
      const x = 22 + colW * i
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(s.num), x + colW / 2, 124)
      ctx.font = '11px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,.7)'
      ctx.fillText(s.label, x + colW / 2, 146)
    })
    ctx.textAlign = 'left'

    // 本月热量
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.font = '13px sans-serif'
    ctx.fillText('本月摄入 ' + r.totalFood + ' kcal', 22, 184)
    ctx.fillText('运动消耗 ' + r.totalExercise + ' kcal', 22, 206)
    const net = r.totalFood - r.totalExercise
    ctx.fillStyle = net <= 0 ? '#bff0c8' : '#ffd9a8'
    ctx.fillText('净热量 ' + net + ' kcal', 22, 228)

    // 营养素占比
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,.6)'
    ctx.fillText('营养素占比 · 均衡分 ' + r.score, 22, 256)
    const nutCols = [
      { name: '碳水', pct: r.carbPct, color: '#4facfe' },
      { name: '蛋白', pct: r.proteinPct, color: '#43e97b' },
      { name: '脂肪', pct: r.fatPct, color: '#ff9a9e' }
    ]
    nutCols.forEach((n, i) => {
      const x = 22 + i * 90
      ctx.fillStyle = n.color
      this.roundRect(ctx, x, 266, 8, 8, 4)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.9)'
      ctx.font = '11px sans-serif'
      ctx.fillText(n.name + ' ' + n.pct + '%', x + 14, 274)
    })

    // 体重曲线简图
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,.6)'
    ctx.fillText('体重曲线', 22, 304)
    this.drawWeightCurve(ctx, r.weightPoints, 22, 314, W - 44, 70)

    // 底部 slogan
    this.roundRect(ctx, 22, 442, W - 44, 56, 12)
    ctx.fillStyle = 'rgba(255,255,255,.1)'
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('坚持，是看得见的生长', W / 2, 466)
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,.6)'
    ctx.fillText('— 来自「智能生长」小程序', W / 2, 486)
    ctx.textAlign = 'left'

    done()
  },

  // 体重曲线简图：在指定区域内绘制折线 + 圆点
  drawWeightCurve(ctx, points, x, y, w, h) {
    if (!points || points.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,.4)'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('本月暂无体重记录', x + w / 2, y + h / 2)
      ctx.textAlign = 'left'
      return
    }
    const pts = points.map((p) => Number(p.weight)).filter((v) => Number.isFinite(v))
    if (pts.length === 0) return
    let minW = Math.min.apply(null, pts)
    let maxW = Math.max.apply(null, pts)
    if (maxW - minW < 1) { minW -= 1; maxW += 1 } // 区间过窄时拉平
    const span = maxW - minW || 1
    const padX = 10
    const innerW = w - padX * 2
    const innerH = h - 16
    // 折线
    ctx.strokeStyle = '#9fe6c0'
    ctx.lineWidth = 2
    ctx.beginPath()
    pts.forEach((v, i) => {
      const px = x + padX + (pts.length === 1 ? innerW / 2 : (innerW * i) / (pts.length - 1))
      const py = y + 8 + innerH - ((v - minW) / span) * innerH
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()
    // 圆点
    pts.forEach((v, i) => {
      const px = x + padX + (pts.length === 1 ? innerW / 2 : (innerW * i) / (pts.length - 1))
      const py = y + 8 + innerH - ((v - minW) / span) * innerH
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#7cc47f'
      ctx.fill()
    })
  },

  // 圆角矩形辅助
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  },

  onShareAppMessage() {
    const r = this.data.report
    return {
      title: `本月打卡 ${r.checkinDays} 天，连续 ${r.streak} 天！我的健康月报`,
      path: '/pages/calorie/calorie'
    }
  }
})
