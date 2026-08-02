function makeCalc() {
  const s = { display: '0', expression: '', previous: null, operator: null, waiting: false }
  const setData = p => Object.assign(s, p)
  function _calc(a, b, op) {
    let r
    switch (op) {
      case '+': r = a + b; break
      case '-': r = a - b; break
      case '*': r = a * b; break
      case '/': if (b === 0) return '错误'; r = a / b; break
      default: r = b
    }
    return r
  }
  function _round(n) {
    if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return '错误'
    return parseFloat(n.toPrecision(12)).toString()
  }
  function _opText(op) { return { '+': '+', '-': '-', '*': '*', '/': '/' }[op] || op }
  function _clearError() { if (s.display === '错误') setData({ display: '0', expression: '', previous: null, operator: null, waiting: false }) }
  return {
    s,
    onDigit(d) { _clearError(); let { display, waiting } = s; if (waiting) { display = d; waiting = false } else { display = display === '0' ? d : display + d } setData({ display, waiting }) },
    onDot() { _clearError(); let { display, waiting } = s; if (waiting) { display = '0.'; waiting = false } else if (display.indexOf('.') === -1) { display = display + '.' } setData({ display, waiting }) },
    onPercent() { _clearError(); const v = parseFloat(s.display); if (isNaN(v)) return; setData({ display: _round(v / 100) }) },
    onOperator(op) {
      _clearError();
      const curr = parseFloat(s.display)
      let { previous, operator } = s
      let newDisplay = s.display
      if (previous === null) { previous = curr }
      else if (operator && !s.waiting) {
        const r = _calc(previous, curr, operator)
        if (r === '错误') { setData({ display: '错误', previous: null, operator: null, waiting: true, expression: '' }); return }
        previous = r; newDisplay = _round(r)
      }
      setData({ display: newDisplay, previous: previous, operator: op, waiting: true, expression: _round(previous) + ' ' + _opText(op) })
    },
    onEqual() {
      const { previous, operator, display } = s
      if (operator === null || previous === null) return
      const curr = parseFloat(display)
      const r = _calc(previous, curr, operator)
      setData({ display: r === '错误' ? '错误' : _round(r), expression: _round(previous) + ' ' + _opText(operator) + ' ' + _round(curr) + ' =', previous: null, operator: null, waiting: true })
    },
    onClear() { setData({ display: '0', expression: '', previous: null, operator: null, waiting: false }) },
    onDelete() { let display = s.display; if (s.waiting || display === '错误') return; display = display.length > 1 ? display.slice(0, -1) : '0'; setData({ display }) }
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
  ['0', '.', '1', '+', '0', '.', '2', '='],
  ['9', '+', '=', '3'],
  ['1', '2', '3', 'D', 'D', '=', '5', '+', '4', '='],
  ['7', '+', '8', '*', '2', '=']
]
for (const seq of cases) {
  const r = run(seq)
  console.log(seq.join(' ').padEnd(28), '=> display=', String(r.display).padEnd(8), '| expr=', r.expression)
}
