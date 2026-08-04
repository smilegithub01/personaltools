// pages/growth/tree.js —— 我的生长树
const growth = require('../../utils/growth.js')

Page({
  data: {
    tree: {},
    animateGrow: false,
    leaves: []
  },

  onLoad() {
    this.refresh()
  },
  onShow() {
    // 打卡后从首页返回可能数据变化
    this.refresh()
  },

  refresh() {
    const tree = growth.buildTreeData()
    const leaves = this.genLeaves(tree.stage)
    this.setData({ tree, leaves }, () => {
      // 触发一次生长动画
      this.setData({ animateGrow: false })
      wx.nextTick(() => this.setData({ animateGrow: true }))
    })
  },

  // 根据阶段生成装饰元素（叶子/果实/花）
  genLeaves(stage) {
    const count = [0, 3, 6, 10, 14][stage] || 0
    const arr = []
    for (let i = 0; i < count; i++) {
      // 在树冠范围内随机分布
      const x = 30 + Math.random() * 40   // 百分比
      const y = 25 + Math.random() * 35
      arr.push({
        left: x.toFixed(1) + '%',
        top: y.toFixed(1) + '%',
        // 开花阶段 50% 概率显示花朵
        isFlower: stage === 4 && Math.random() > 0.5
      })
    }
    return arr
  },

  goCheckin() {
    wx.navigateTo({ url: '/pages/calorie/calorie' })
  },

  goRank() {
    wx.navigateTo({ url: '/pages/rank/rank' })
  },

  onShareAppMessage() {
    const t = this.data.tree
    return {
      title: `我的健康生长树已长成「${t.stageName}」，连续打卡 ${t.streak} 天🌱`,
      path: '/pages/calorie/calorie'
    }
  }
})
