# 安安的素描本聊天框 Frontend Ver.

[![License](https://img.shields.io/github/license/ZiAzusa/nonebot_plugin_anans_sketchbook)](LICENSE)
[![JavaScript Version](https://img.shields.io/badge/JavaScript-ES2020-yellow)](https://developer.mozilla.org/)
[![Chrome](https://img.shields.io/badge/Chrome-79%2B-blue)](https://www.google.com/chrome/)
[![Firefox](https://img.shields.io/badge/Firefox-75%2B-orange)](https://www.firefox.com/)
[![Edge](https://img.shields.io/badge/Edge-79%2B-lightgreen)](https://www.microsoft.com/edge/)
[![Safari](https://img.shields.io/badge/Safari-13.4%2B-lightblue)](https://www.apple.com/safari/)


本分支是 <a href="https://github.com/MarkCup-Official/Anan-s-Sketchbook-Chat-Box">MarkCup-Official/Anan-s-Sketchbook-Chat-Box</a> 的前端网页复现，避免了对Python及pywin32的依赖，但也缺失了Win32API带来的便捷。

初衷是方便移动端也可以用简单的方式绘制安安的素描本。

可以访问这里使用：https://anan.lie.moe

## 部署

随便丢到个GitHub Pages或者类似的提供网页托管服务的地方即可，这里使用的是Cloudflare Pages

## 配置参数

配置文件位于 js/config.js，也可以查看 js/config.demo.js 了解具体配置的含义

主要可配置项包括：
- 文本颜色和洗脑文本颜色
- 文本框和图片框的坐标范围
- 字体文件路径
- 底图和遮罩图路径
- 特殊差分的对默认配置的替换

## 使用

浏览器开箱即用

## 更新历史

2025/11/09 添加了点击预览区域或按下Ctrl+C即可将生成的安安复制到剪贴板的功能

2025/11/10 添加了对于GIF动图的支持

2025/11/11 添加了在当前页面按下Ctrl+V，如果剪贴板中存在图片，则将剪贴板中的图片上传的功能

2025/11/11 重构了配置文件，添加了魔女化表情，实现了响应式的按钮自动创建

2025/11/13 内置字体使用了字体分包项目 [中文 Web Font 切割工具](https://github.com/KonghaYao/cn-font-split) 进行分包，优化使用体验

2025/11/14 跟进原项目，支持图文混排

## 许可证

本项目基于MIT协议传播，仅供个人学习交流使用，不拥有相关素材的版权。进行分发时应注意不违反素材版权与官方二次创造协定。

<hr>

更多信息请查看原项目 [MarkCup-Official/Anan-s-Sketchbook-Chat-Box](https://github.com/MarkCup-Official/Anan-s-Sketchbook-Chat-Box)
