// pages/index/index.js
const app = getApp()

Page({
  data: {
    tools: [
      { id: 'calculator', name: '计算器', desc: '日常计算工具', icon: '🧮' },
      { id: 'notes', name: '备忘录', desc: '随手记事', icon: '📝' },
      { id: 'converter', name: '单位换算', desc: '长度/重量/温度', icon: '📏' },
      { id: 'qrcode', name: '二维码', desc: '生成与扫描', icon: '📱' },
      { id: 'calorie', name: '卡路里管理', desc: '摄入/消耗/计划', icon: '🔥' }
    ]
  },

  onToolTap(e) {
    const { id } = e.currentTarget.dataset
    const routes = {
      calculator: '/pages/calculator/calculator',
      notes: '/pages/notes/notes',
      converter: '/pages/converter/converter',
      qrcode: '/pages/qrcode/qrcode',
      calorie: '/pages/calorie/calorie'
    }
    const url = routes[id]
    if (url) {
      wx.navigateTo({ url })
    } else {
      wx.showToast({ title: '暂未实现', icon: 'none' })
    }
  },

  onShareAppMessage() {
    return {
      title: 'Personal Tools - 个人工具集',
      path: '/pages/index/index'
    }
  }
})
