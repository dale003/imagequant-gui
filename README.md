# ImageQuant 图片压缩工具

一个面向 Windows 的 PNG 批量压缩 GUI。程序通过 `pngquant` 使用
[`libimagequant`](https://github.com/ImageOptim/libimagequant) 进行调色板量化，
支持透明通道，并将运行所需文件一并放入安装包。

## 功能

- 拖拽或批量选择 PNG 图片
- 设置质量范围、最大颜色数和压缩速度
- 默认输出到每张原始图片所在文件夹，也可以选择统一输出目录
- 显示每张图片压缩状态、体积变化和总体节省空间
- 默认跳过压缩后体积更大的文件

## 本地开发

```powershell
npm install
npm start
```

## 构建 Windows 安装包

```powershell
npm run dist:installer
```

构建完成后，安装包位于 `release/`。安装包已经包含官方 Windows 版 `pngquant.exe`，目标 Windows
电脑无需安装 Node.js、Rust 或其他运行环境。

当前内置的是 [`pngquant.org`](https://pngquant.org/) 提供的 Windows ZIP 中的
`pngquant 2.17.0`。如果后续需要切换到 `pngquant 3.x`，需要使用 Rust 工具链和
Visual C++ Build Tools 从源码编译 Windows 版本，再替换 `vendor/pngquant/pngquant.exe`。

第三方组件来源、内置文件和许可证边界见
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。

## 许可证说明

本项目按 GPL-3.0-or-later 发布。`libimagequant` 对自由开源软件提供 GPL v3 或更高版本许可；
闭源软件或非 GPL 分发需要另行取得商业许可。详见
[`libimagequant` 官方仓库](https://github.com/ImageOptim/libimagequant#license)。
