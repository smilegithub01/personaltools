// pages/report/weekly.js —— 可分享周报卡片
const growth = require('../../utils/growth.js')

Page({
  data: {
    report: {},
    canvasReady: false,
    savedTip: ''          // 保存结果提示
  },

  onLoad() {
    const report = growth.buildWeeklyReport()
    this.setData({ report })
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
            content: '保存周报卡片需要相册权限，是否前往设置开启？',
            confirmText: '去设置',
            success: (m) => { if (m.confirm) wx.openSetting() }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  // 在 Canvas 2D 上绘制周报卡片
  drawCard(canvas, ctx, done) {
    const r = this.data.report
    const dpr = wx.getSystemInfoSync().pixelRatio || 2
    const W = 300, H = 460
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
    ctx.fillText('🌱 我的健康周报', 22, 44)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,.7)'
    ctx.fillText(r.weekLabel + '  ·  ' + r.goalText, 22, 66)

    // 分割线
    ctx.strokeStyle = 'rgba(255,255,255,.18)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(22, 82); ctx.lineTo(W - 22, 82); ctx.stroke()

    // 三大数据
    const stats = [
      { num: r.checkinDays, label: '本周打卡(天)' },
      { num: r.streak, label: '连续打卡(天)' },
      { num: (r.lost >= 0 ? '-' : '+') + Math.abs(r.lost).toFixed(1), label: '累计变化(kg)' }
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

    // 本周热量
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.font = '13px sans-serif'
    ctx.fillText('本周摄入 ' + r.totalFood + ' kcal', 22, 184)
    ctx.fillText('运动消耗 ' + r.totalExercise + ' kcal', 22, 206)
    const net = r.totalFood - r.totalExercise
    ctx.fillStyle = net <= 0 ? '#bff0c8' : '#ffd9a8'
    ctx.fillText('净热量 ' + net + ' kcal', 22, 228)

    // 7 天打卡格子
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,.6)'
    ctx.fillText('每日打卡', 22, 260)
    const startX = 22, gap = 36, box = 28
    r.dayRecords.forEach((d, i) => {
      const x = startX + i * gap
      this.roundRect(ctx, x, 272, box, box, 8)
      ctx.fillStyle = d.checked ? '#7cc47f' : 'rgba(255,255,255,.12)'
      ctx.fill()
      ctx.fillStyle = d.checked ? '#0d281f' : 'rgba(255,255,255,.5)'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(d.weekday, x + box / 2, 289)
      ctx.font = '9px sans-serif'
      ctx.fillText(d.checked ? '✓' : '·', x + box / 2, 300)
    })
    ctx.textAlign = 'left'

    // 底部 slogan
    this.roundRect(ctx, 22, 388, W - 44, 50, 12)
    ctx.fillStyle = 'rgba(255,255,255,.1)'
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('坚持，是看得见的生长', W / 2, 410)
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,.6)'
    ctx.fillText('— 来自「智能生长」小程序', W / 2, 428)
    ctx.textAlign = 'left'

    done()
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
      title: `本周打卡 ${r.checkinDays} 天，连续 ${r.streak} 天！我的健康周报`,
      path: '/pages/calorie/calorie'
    }
  }
})
