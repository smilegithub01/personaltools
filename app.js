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

    // 初始化云开发（未开通云开发时静默失败，不影响其他页面）
    if (wx.cloud) {
      try {
        wx.cloud.init({
          traceUser: true,
          env: undefined // 使用默认环境；如多环境请在 project.config.json 指定 cloudbaseEnv
        })
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
