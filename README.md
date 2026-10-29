# Benchsquare Demo

专业数据众包与赛事协作平台的前端交互演示，使用原生 HTML、CSS 和 JavaScript，无需安装 npm 依赖。

支持赛事发现、报名组队、主办方中心、个人资料、任务提交及模拟审核。数据保存在当前浏览器的 localStorage 中，附件仅保留在页面会话中；尚未接入真实后端、身份认证、附件上传和支付服务。

比赛详情的排行榜支持搜索团队、仅看我的团队、同分并列、分页和更新；内置赛事提供三种成绩演示场景，不提供榜单下载。[排行榜 PRD、流程图与原型图](docs/leaderboard/README.md)。

## 本地运行

安装 Node.js 24 后，在项目目录执行：

```sh
node frontend/serve.cjs
```

打开 <http://127.0.0.1:4173/frontend/>。

## 检查与构建

```sh
npm test
npm run build
```

构建输出位于 `dist/`，包含首页入口、`frontend/` 和页面所需字体资源。

## GitHub Pages 发布

1. 将项目推送到 GitHub 仓库的 `main` 分支。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
3. 在 **Actions** 页面运行 **Deploy demo to GitHub Pages**，或推送一次新提交。
4. 工作流成功后，在 **Settings → Pages** 中打开网站链接。

后续推送到 `main` 会自动检查并发布。配置遵循 [GitHub Pages 自定义工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

仓库忽略生成目录、预览截图、日志及本地参考资料，仅包含演示源码、测试和必要资源。
