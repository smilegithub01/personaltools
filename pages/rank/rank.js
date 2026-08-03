// pages/rank/rank.js —— 好友生长榜（零后端：微信开放数据 + 本地模拟好友）
const growth = require('../../utils/growth.js')

Page({
  data: {
    list: [],
    myRank: 0,
    myStreak: 0,
    myDays: 0,
    myBest: 0,
    loading: true
  },

  onLoad() {
    this.refresh()
  },
  onShow() {
    this.refresh()
  },

  refresh() {
    const data = growth.buildRank()
    this.setData({
      list: data.list,
      myRank: data.myRank,
      myStreak: data.myStreak,
      myDays: data.myDays,
      myBest: data.myBest,
      loading: false
    })
  },

  // 「我」的行：用 open-data 展示真实头像/昵称（需用户主动触发 tap 才授权显示）
  // 这里用 button open-type=share 之外，单独一个引导按钮
  tapMe() {
    wx.showToast({ title: '你的连续打卡：' + this.data.myStreak + ' 天', icon: 'none' })
  },

  // 邀请好友（裂变）：转发
  invite() {
    wx.showShareMenu({ withShareTicket: true })
  },

  onShareAppMessage() {
    return {
      title: `我已在「智能生长」连续打卡 ${this.data.myStreak} 天，来和我比一比 🌱`,
      path: '/pages/calorie/calorie'
    }
  }
})
