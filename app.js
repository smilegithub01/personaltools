// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 获取系统信息
    this.globalData.systemInfo = wx.getSystemInfoSync()
  },

  globalData: {
    userInfo: null,
    systemInfo: null
  }
})
