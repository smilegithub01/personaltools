// pages/index/index.js
const app = getApp()

Page({
  data: {
    tools: [
      { id: 'calculator', name: '计算器', desc: '日常计算工具', icon: '🧮' },
      { id: 'notes', name: '备忘录', desc: '随手记事', icon: '📝' },
      { id: 'converter', name: '单位换算', desc: '长度/重量/温度', icon: '📏' },
      { id: 'qrcode', name: '二维码', desc: '生成与扫描', icon: '📱' }
    ],
    systemInfo: null
  },

  onLoad() {
    this.setData({ systemInfo: app.globalData.systemInfo })
  },

  onToolTap(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showToast({
      title: `${name} 开发中`,
      icon: 'none',
      duration: 1500
    })
    console.log('点击工具:', id)
  },

  onShareAppMessage() {
    return {
      title: 'Personal Tools - 个人工具集',
      path: '/pages/index/index'
    }
  }
})
