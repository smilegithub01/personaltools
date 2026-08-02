// 复刻 calculator.js 逻辑做纯逻辑验证
function makeCalc() {
  const s = { display: '0', expression: '', previous: null, operator: null, waiting: false }
  const setData = p => Object.assign(s, p)
  function _calc(a, b, op) {
    let r
    switch (op) {
      case '+': r = a + b; break
      case '-': r = a - b; break
      case '*': r = a * b; break
      case '/': r = b === 0 ? '错误' : a / b; break
      default: r = b
    }
    return _round(r)
  }
  function _round(n) {
    if (typeof n !== 'number' || isNaN(n)) return '错误'
    if (!isFinite(n)) return '错误'
    return parseFloat(n.toPrecision(12)).toString()
  }
  function _opText(op) { return { '+': '+', '-': '-', '*': '*', '/': '/' }[op] || op }
  return {
    s,
    onDigit(d) { let { display, waiting } = s; if (waiting) { display = d; waiting = false } else { display = display === '0' ? d : display + d } setData({ display, waiting }) },
    onDot() { let { display, waiting } = s; if (waiting) { display = '0.'; waiting = false } else if (display.indexOf('.') === -1) { display = display + '.' } setData({ display, waiting }) },
    onPercent() { const v = parseFloat(s.display); if (isNaN(v)) return; setData({ display: _round(v / 100) }) },
    onOperator(op) {
      const curr = parseFloat(s.display)
      let { previous, operator, expression } = s
      if (previous === null) { previous = curr }
      else if (operator && !s.waiting) { const r = _calc(previous, curr, operator); previous = r; setData({ display: r }) }
      setData({ operator: op, waiting: true, expression: _round(previous) + ' ' + _opText(op) })
    },
    onEqual() {
      const { previous, operator, display } = s
      if (operator === null || previous === null) return
      const curr = parseFloat(display)
      const r = _calc(previous, curr, operator)
      setData({ display: r, expression: _round(previous) + ' ' + _opText(operator) + ' ' + _round(curr) + ' =', previous: null, operator: null, waiting: true })
    },
    onClear() { setData({ display: '0', expression: '', previous: null, operator: null, waiting: false }) },
    onDelete() { let display = s.display; if (s.waiting) return; display = display.length > 1 ? display.slice(0, -1) : '0'; setData({ display }) }
  }
}
function run(seq) {
  const c = makeCalc()
  for (const k of seq) {
    if (/^[0-9]$/.test(k)) c.onDigit(k)
    else if (k === '.') c.onDot()
    else if (k === '=') c.onEqual()
    else if (k === 'C') c.onClear()
    else if (k === 'D') c.onDelete()
    else if (k === '%') c.onPercent()
    else c.onOperator(k)
  }
  return c.s
}
const cases = [
  ['2', '+', '3', '='],
  ['6', '*', '7', '='],
  ['9', '-', '4', '='],
  ['8', '/', '2', '='],
  ['5', '/', '0', '='],
  ['2', '+', '3', '+', '4', '='],
  ['1', '0', '0', '%'],
  ['2', '+', '3', '*', '4', '=']
]
for (const seq of cases) {
  const r = run(seq)
  console.log(seq.join(' '), '=> display=', r.display, '| expr=', r.expression)
}
