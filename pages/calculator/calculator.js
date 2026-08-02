// pages/calculator/calculator.js
Page({
  data: {
    display: '0',
    expression: '',
    previous: null,   // 上一次运算的结果（始终为数字，供计算使用）
    operator: null,   // 待执行的运算符
    waiting: false    // 下一个数字是否开启新输入
  },

  onLoad() {
    this._initAudio()
  },

  onUnload() {
    this._audioCtx = null
  },

  // ---------- 音效：用 WebAudio 实时合成短促点击声，无需音频文件 ----------
  _initAudio() {
    if (this._audioCtx) return
    try {
      this._audioCtx = wx.createWebAudioContext()
    } catch (e) {
      this._audioCtx = null
    }
  },

  // freq 不同按键用不同音调，增强反馈感
  _click(freq) {
    let ctx = this._audioCtx
    if (!ctx) {
      this._initAudio()
      ctx = this._audioCtx
    }
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq || 880
      const t0 = ctx.currentTime
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.09)
    } catch (e) {
      // 部分基础库不支持 WebAudio 时静默忽略，不影响计算
    }
  },

  // 若处于错误态，先复位再继续
  _clearError() {
    if (this.data.display === '错误') {
      this.setData({ display: '0', expression: '', previous: null, operator: null, waiting: false })
    }
  },

  // 输入数字
  onDigit(e) {
    this._click(880)
    this._clearError()
    const d = e.currentTarget.dataset.d
    let { display, waiting } = this.data
    if (waiting) {
      display = d
      waiting = false
    } else {
      display = display === '0' ? d : display + d
    }
    this.setData({ display, waiting })
  },

  // 小数点
  onDot() {
    this._click(880)
    this._clearError()
    let { display, waiting } = this.data
    if (waiting) {
      display = '0.'
      waiting = false
    } else if (display.indexOf('.') === -1) {
      display = display + '.'
    }
    this.setData({ display, waiting })
  },

  // 百分比
  onPercent() {
    this._click(520)
    this._clearError()
    const v = parseFloat(this.data.display)
    if (isNaN(v)) return
    this.setData({ display: this._round(v / 100) })
  },

  // 选择运算符
  onOperator(e) {
    this._click(660)
    this._clearError()
    const op = e.currentTarget.dataset.op
    const curr = parseFloat(this.data.display)
    let { previous, operator } = this.data
    let newDisplay = this.data.display

    if (previous === null) {
      previous = curr
    } else if (operator && !this.data.waiting) {
      const r = this._calc(previous, curr, operator)
      if (r === '错误') {
        this.setData({ display: '错误', previous: null, operator: null, waiting: true, expression: '' })
        return
      }
      previous = r
      newDisplay = this._round(r)
    }
    // 关键：previous 必须 setData 写回（且保持为数字，供下一次计算）
    this.setData({
      display: newDisplay,
      previous: previous,
      operator: op,
      waiting: true,
      expression: this._round(previous) + ' ' + this._opText(op)
    })
  },

  // 等于
  onEqual() {
    this._click(1200)
    const { previous, operator, display } = this.data
    if (operator === null || previous === null) return
    const curr = parseFloat(display)
    const r = this._calc(previous, curr, operator)
    this.setData({
      display: r === '错误' ? '错误' : this._round(r),
      expression: this._round(previous) + ' ' + this._opText(operator) + ' ' + this._round(curr) + ' =',
      previous: null,
      operator: null,
      waiting: true
    })
  },

  // 清除
  onClear() {
    this._click(520)
    this.setData({
      display: '0',
      expression: '',
      previous: null,
      operator: null,
      waiting: false
    })
  },

  // 退格
  onDelete() {
    this._click(520)
    let display = this.data.display
    if (this.data.waiting || display === '错误') return
    display = display.length > 1 ? display.slice(0, -1) : '0'
    this.setData({ display })
  },

  // 计算：返回数字；除零返回 '错误'
  _calc(a, b, op) {
    let r
    switch (op) {
      case '+': r = a + b; break
      case '-': r = a - b; break
      case '*': r = a * b; break
      case '/':
        if (b === 0) return '错误'
        r = a / b
        break
      default: r = b
    }
    return r
  },

  _round(n) {
    if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return '错误'
    // 保留最多 12 位有效数字，去掉多余小数
    return parseFloat(n.toPrecision(12)).toString()
  },

  _opText(op) {
    return { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || op
  }
})
