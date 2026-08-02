// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 获取系统信息：使用新版拆分 API，避免使用已废弃的 getSystemInfoSync
    // （后者在测试号 touristappid 下会触发 webapi_getwxaasyncsecinfo:fail invalid scope）
    try {
      this.globalData.systemInfo = {
        ...wx.getWindowInfo(),
        ...wx.getDeviceInfo()
      }
    } catch (e) {
      this.globalData.systemInfo = null
    }
  },

  globalData: {
    userInfo: null,
    systemInfo: null
  }
})
