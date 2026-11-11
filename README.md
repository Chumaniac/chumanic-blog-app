<img src="site/journal.svg" width="56" height="56" alt="" />

# Chumanic Journal

[![Build](https://github.com/Chumaniac/chumanic-blog-app/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/Chumaniac/chumanic-blog-app/actions/workflows/pages.yml) [![License](https://img.shields.io/badge/license-MIT-555)](LICENSE)

检索文章，点击「保存阅读位置」可让当前浏览器下次回到这篇文章。

[打开阅读样例](https://chumaniac.github.io/chumanic-blog-app/)

## 快速开始

```sh
git clone https://github.com/Chumaniac/chumanic-blog-app.git
cd chumanic-blog-app
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
```

打开 `http://127.0.0.1:8000/`。样例包含三篇原创短文，支持标题与正文搜索。用 Tab 移动焦点、用 Enter 选择文章。清空搜索会回到先前选中的篇目；刷新时只恢复主动保存的篇目。

展开「阅读设置」可调整正文字号、行距和栏宽。浏览器允许时跨篇记住这些设置；「恢复默认」保留已保存的阅读篇目。

## 常见问题

**需要配置服务吗？** 无需密钥、数据库或环境变量。页面加载后，检索和阅读都在本地完成。

**能登录我的私人订阅吗？** 此仓库只展示阅读交互。私人订阅、管理服务、稿件和部署配置由站点所有者维护。

改动页面后，可在窄屏和桌面测试搜索、空结果与保存位置。许可见 [MIT](LICENSE)。
