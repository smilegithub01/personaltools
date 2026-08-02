// pages/notes/notes.js
const util = require('../../utils/util.js')

const STORAGE_KEY = 'notes'

Page({
  data: {
    notes: []
  },

  onShow() {
    this.loadNotes()
  },

  onPullDownRefresh() {
    this.loadNotes()
    wx.stopPullDownRefresh()
  },

  loadNotes() {
    const list = wx.getStorageSync(STORAGE_KEY) || []
    const notes = list.map((n) => ({
      ...n,
      timeText: util.formatTime(new Date(n.updatedAt))
    }))
    this.setData({ notes })
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/note-edit/note-edit' })
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/note-edit/note-edit?id=${id}` })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除备忘录',
      content: '确定要删除这条备忘录吗？',
      confirmColor: '#e54d42',
      success: (res) => {
        if (!res.confirm) return
        const list = (wx.getStorageSync(STORAGE_KEY) || []).filter((n) => n.id !== id)
        wx.setStorageSync(STORAGE_KEY, list)
        this.loadNotes()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  }
})
