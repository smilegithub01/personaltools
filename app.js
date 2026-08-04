// app.js
App({
  onLaunch() {
    try {
      const logs = wx.getStorageSync('logs') || []
      logs.unshift(Date.now())
      wx.setStorageSync('logs', logs)
    } catch (e) {
      // ignore
    }
    // 初始化云开发（未开通时静默失败，不影响本地功能）
    // 用于：读取 app_config 集合的 AI 开关、调用 aiProxy 云函数
    if (wx.cloud) {
      try {
        wx.cloud.init({ traceUser: true, env: undefined })
      } catch (e) {
        console.warn('云环境初始化失败（可能未开通云开发）：', e)
      }
    }
  },

  globalData: {
    userInfo: null,
    systemInfo: null
  }
})
