# Personal Tools

一个微信小程序个人工具集。

## 功能

- 🧮 计算器：四则运算、百分比、退格、连续计算
- 📝 备忘录：基于本地存储的增删改查（列表 + 编辑页）
- 📏 单位换算：长度 / 重量 / 温度 / 面积 / 体积，实时双向换算，支持单位互换
- 📱 二维码：生成二维码（vendor 的 `weapp-qrcode`）与扫码，可保存到相册

> 二维码生成使用了本地内置的 `utils/weapp-qrcode.js`（开源库 weapp-qrcode 的 CommonJS 构建），
> 无需在开发者工具中「构建 npm」。

## 项目结构

```
personaltools/
├── app.js                  # 小程序入口逻辑
├── app.json                # 全局配置（已注册全部页面）
├── app.wxss                # 全局样式
├── project.config.json     # 项目配置（开发者工具）
├── sitemap.json            # 索引配置
├── pages/
│   ├── index/              # 首页（工具列表入口）
│   ├── calculator/         # 计算器
│   ├── notes/              # 备忘录列表
│   ├── note-edit/          # 备忘录编辑
│   ├── converter/          # 单位换算
│   └── qrcode/             # 二维码生成 / 扫码
├── utils/
│   ├── util.js             # 工具函数（formatTime 等）
│   └── weapp-qrcode.js     # 二维码生成库（vendored）
└── images/                 # 图片资源
```

## 开发

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本项目目录
3. AppID 可使用"测试号"或填入自己的 AppID
4. 点击编译预览

## 技术栈

- 微信小程序原生框架
- WXML / WXSS / JavaScript

## License

MIT
