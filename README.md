# Personal Tools

一个微信小程序个人工具集。

## 功能

- 🧮 计算器
- 📝 备忘录
- 📏 单位换算
- 📱 二维码

## 项目结构

```
personaltools/
├── app.js                  # 小程序入口逻辑
├── app.json                # 全局配置
├── app.wxss                # 全局样式
├── project.config.json     # 项目配置（开发者工具）
├── sitemap.json            # 索引配置
├── pages/
│   └── index/              # 首页
│       ├── index.js
│       ├── index.json
│       ├── index.wxml
│       └── index.wxss
├── utils/
│   └── util.js             # 工具函数
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
