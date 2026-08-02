// pages/qrcode/qrcode.js
const drawQrcode = require('../../utils/weapp-qrcode.js')

Page({
  data: {
    text: '',
    showResult: false,
    scanned: ''
  },

  onInput(e) {
    this.setData({ text: e.detail.value })
  },

  generate() {
    const text = (this.data.text || '').trim()
    if (!text) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    // 使用旧版 canvas 绘图（与 weapp-qrcode 默认 API 匹配）
    drawQrcode({
      width: 220,
      height: 220,
      canvasId: 'qrcode',
      text: text,
      _this: this,
      correctLevel: 2 // H
    })
    this.setData({ showResult: true, scanned: '' })
  },

  scan() {
    wx.scanCode({
      success: (res) => {
        const result = res.result || ''
        this.setData({ text: result, scanned: result })
        if (result) this.generate()
      },
      fail: () => {
        wx.showToast({ title: '已取消扫码', icon: 'none' })
      }
    })
  },

  save() {
    if (!this.data.showResult) {
      wx.showToast({ title: '请先生成二维码', icon: 'none' })
      return
    }
    wx.canvasToTempFilePath({
      canvasId: 'qrcode',
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: (err) => {
            if (/auth|deny/i.test(err.errMsg || '')) {
              wx.showModal({
                title: '需要相册权限',
                content: '保存图片需要授权相册，去设置开启？',
                success: (m) => {
                  if (m.confirm) wx.openSetting()
                }
              })
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' })
            }
          }
        })
      },
      fail: () => wx.showToast({ title: '导出失败', icon: 'none' })
    })
  }
})
