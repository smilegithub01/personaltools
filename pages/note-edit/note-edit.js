// pages/note-edit/note-edit.js
const STORAGE_KEY = 'notes'

Page({
  data: {
    id: '',
    title: '',
    content: '',
    isNew: true
  },

  onLoad(options) {
    if (options.id) {
      const list = wx.getStorageSync(STORAGE_KEY) || []
      const note = list.find((n) => n.id === options.id)
      if (note) {
        this.setData({
          id: note.id,
          title: note.title,
          content: note.content,
          isNew: false
        })
      }
    }
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onSave() {
    const { id, title, content, isNew } = this.data
    if (!title.trim() && !content.trim()) {
      wx.showToast({ title: '内容不能为空', icon: 'none' })
      return
    }
    const list = wx.getStorageSync(STORAGE_KEY) || []
    const now = Date.now()
    let nextList
    if (isNew) {
      nextList = [{ id: 'n_' + now, title, content, updatedAt: now }, ...list]
    } else {
      nextList = list.map((n) =>
        n.id === id ? { ...n, title, content, updatedAt: now } : n
      )
    }
    wx.setStorageSync(STORAGE_KEY, nextList)
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 400)
  },

  onDelete() {
    wx.showModal({
      title: '删除备忘录',
      content: '确定要删除这条备忘录吗？',
      confirmColor: '#e54d42',
      success: (res) => {
        if (!res.confirm) return
        const list = (wx.getStorageSync(STORAGE_KEY) || []).filter((n) => n.id !== this.data.id)
        wx.setStorageSync(STORAGE_KEY, list)
        wx.showToast({ title: '已删除', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 400)
      }
    })
  }
})
