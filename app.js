// app.js
App({
  onLaunch() {
    // 展示本地存储能力（测试号 touristappid 下个别 jsapi 可能受限，做容错避免启动崩溃）
    try {
      const logs = wx.getStorageSync('logs') || []
      logs.unshift(Date.now())
      wx.setStorageSync('logs', logs)
    } catch (e) {
      // ignore
    }
  },

  globalData: {
    userInfo: null,
    systemInfo: null
  }
})
