// pages/converter/converter.js
// 线性单位用相对基准单位的倍率 f；温度用 key 走特殊换算。
const CATEGORIES = [
  {
    name: '长度',
    units: [
      { n: '毫米(mm)', f: 0.001 },
      { n: '厘米(cm)', f: 0.01 },
      { n: '米(m)', f: 1 },
      { n: '千米(km)', f: 1000 },
      { n: '英寸(in)', f: 0.0254 },
      { n: '英尺(ft)', f: 0.3048 },
      { n: '英里(mi)', f: 1609.344 }
    ]
  },
  {
    name: '重量',
    units: [
      { n: '毫克(mg)', f: 0.000001 },
      { n: '克(g)', f: 0.001 },
      { n: '千克(kg)', f: 1 },
      { n: '吨(t)', f: 1000 },
      { n: '盎司(oz)', f: 0.0283495 },
      { n: '磅(lb)', f: 0.453592 }
    ]
  },
  {
    name: '温度',
    temp: true,
    units: [
      { n: '摄氏度(℃)', key: 'C' },
      { n: '华氏度(℉)', key: 'F' },
      { n: '开尔文(K)', key: 'K' }
    ]
  },
  {
    name: '面积',
    units: [
      { n: '平方厘米(cm²)', f: 0.0001 },
      { n: '平方米(m²)', f: 1 },
      { n: '平方千米(km²)', f: 1000000 },
      { n: '公顷(ha)', f: 10000 },
      { n: '亩', f: 666.6667 },
      { n: '平方英尺(ft²)', f: 0.092903 },
      { n: '英亩(acre)', f: 4046.8564 }
    ]
  },
  {
    name: '体积',
    units: [
      { n: '毫升(mL)', f: 0.001 },
      { n: '升(L)', f: 1 },
      { n: '立方米(m³)', f: 1000 },
      { n: '加仑(美,gal)', f: 3.78541 },
      { n: '品脱(美,pt)', f: 0.473176 }
    ]
  }
]

Page({
  data: {
    categories: CATEGORIES,
    activeCat: 0,
    units: [],
    fromIndex: 0,
    toIndex: 1,
    inputValue: '',
    resultValue: ''
  },

  onLoad() {
    this.applyCategory(0)
  },

  onCategory(e) {
    this.applyCategory(Number(e.currentTarget.dataset.i))
  },

  applyCategory(i) {
    const cat = CATEGORIES[i]
    const units = cat.units.map((u) => u.n)
    this.setData(
      { activeCat: i, units, fromIndex: 0, toIndex: 1, inputValue: '', resultValue: '' },
      () => this.compute()
    )
  },

  onFromUnit(e) {
    this.setData({ fromIndex: Number(e.detail.value) }, () => this.compute())
  },

  onToUnit(e) {
    this.setData({ toIndex: Number(e.detail.value) }, () => this.compute())
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value }, () => this.compute())
  },

  onSwap() {
    const { fromIndex, toIndex } = this.data
    this.setData({ fromIndex: toIndex, toIndex: fromIndex }, () => this.compute())
  },

  compute() {
    const v = parseFloat(this.data.inputValue)
    if (isNaN(v)) {
      this.setData({ resultValue: '' })
      return
    }
    const cat = CATEGORIES[this.data.activeCat]
    const r = this.convert(v, cat, this.data.fromIndex, this.data.toIndex)
    this.setData({ resultValue: this.format(r) })
  },

  convert(v, cat, fromIdx, toIdx) {
    if (cat.temp) {
      const c = this.toCelsius(cat.units[fromIdx].key, v)
      return this.fromCelsius(cat.units[toIdx].key, c)
    }
    const f1 = cat.units[fromIdx].f
    const f2 = cat.units[toIdx].f
    return (v * f1) / f2
  },

  toCelsius(key, v) {
    if (key === 'C') return v
    if (key === 'F') return ((v - 32) * 5) / 9
    return v - 273.15 // K
  },

  fromCelsius(key, c) {
    if (key === 'C') return c
    if (key === 'F') return (c * 9) / 5 + 32
    return c + 273.15 // K
  },

  format(n) {
    if (!isFinite(n)) return '错误'
    // 最多 10 位有效数字，去掉多余小数与尾随 0
    return parseFloat(n.toPrecision(10)).toString()
  }
})
