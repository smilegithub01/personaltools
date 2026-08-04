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
    // 云开发已移除（个人主体审核限制），本地功能正常运行
  },

  globalData: {
    userInfo: null,
    systemInfo: null
  }
})
