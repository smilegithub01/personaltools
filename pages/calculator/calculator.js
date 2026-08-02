// pages/calculator/calculator.js
Page({
  data: {
    display: '0',
    expression: '',
    previous: null,   // 上一次运算的结果
    operator: null,   // 待执行的运算符
    waiting: false    // 下一个数字是否开启新输入
  },

  // 输入数字
  onDigit(e) {
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
    const v = parseFloat(this.data.display)
    if (isNaN(v)) return
    this.setData({ display: this._round(v / 100) })
  },

  // 选择运算符
  onOperator(e) {
    const op = e.currentTarget.dataset.op
    const curr = parseFloat(this.data.display)
    let { previous, operator, expression } = this.data

    if (previous === null) {
      previous = curr
    } else if (operator && !this.data.waiting) {
      const r = this._calc(previous, curr, operator)
      previous = r
      this.setData({ display: r })
    }
    this.setData({
      operator: op,
      waiting: true,
      expression: this._round(previous) + ' ' + this._opText(op)
    })
  },

  // 等于
  onEqual() {
    const { previous, operator, display } = this.data
    if (operator === null || previous === null) return
    const curr = parseFloat(display)
    const r = this._calc(previous, curr, operator)
    this.setData({
      display: r,
      expression: this._round(previous) + ' ' + this._opText(operator) + ' ' + this._round(curr) + ' =',
      previous: null,
      operator: null,
      waiting: true
    })
  },

  // 清除
  onClear() {
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
    let display = this.data.display
    if (this.data.waiting) return
    display = display.length > 1 ? display.slice(0, -1) : '0'
    this.setData({ display })
  },

  // 计算
  _calc(a, b, op) {
    let r
    switch (op) {
      case '+': r = a + b; break
      case '-': r = a - b; break
      case '*': r = a * b; break
      case '/': r = b === 0 ? '错误' : a / b; break
      default: r = b
    }
    return this._round(r)
  },

  _round(n) {
    if (typeof n !== 'number' || isNaN(n)) return '错误'
    // 保留最多 10 位有效数字，去掉多余小数
    if (!isFinite(n)) return '错误'
    return parseFloat(n.toPrecision(12)).toString()
  },

  _opText(op) {
    return { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || op
  }
})
