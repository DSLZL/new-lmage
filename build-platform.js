#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=== [老王跨平台构建系统] 启动编译 ===');

// 1. 检查 cargo 是否在环境 PATH 中
let hasCargo = false;
try {
  execSync('cargo --version', { stdio: 'ignore' });
  hasCargo = true;
} catch (e) {
  // 未找到
}

// 2. 如果没有 cargo，且是 Linux 平台，说明在 Cloudflare CI 容器，尝试自动安装 Rust
if (!hasCargo) {
  if (process.platform === 'linux') {
    console.log('🚨 检测到云端 CI 缺少 Rust 工具链，开始临时白嫖安装...');
    try {
      // 执行 rustup 一键安装
      execSync('curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --target wasm32-unknown-unknown', { stdio: 'inherit' });
      
      // 把 ~/.cargo/bin 加入当前进程的环境变量，供后面的子进程使用
      const cargoBin = path.join(os.homedir(), '.cargo', 'bin');
      process.env.PATH = `${cargoBin}${path.delimiter}${process.env.PATH}`;
      console.log(`✅ Rust 工具链安装成功，已将 ${cargoBin} 注入临时 PATH。`);
      
      // 确认 cargo 现已可用
      execSync('cargo --version', { stdio: 'inherit' });
      hasCargo = true;
    } catch (err) {
      console.error('❌ 安装 Rust 工具链失败:', err.message);
      process.exit(1);
    }
  } else {
    console.error('❌ 错误：在非 Linux 平台下缺少 cargo 工具，请先在本地安装 Rust 语言环境！');
    process.exit(1);
  }
} else {
  console.log('✅ 检测到系统中已存在 Rust 工具链。');
}

// 3. 构建前端
try {
  console.log('📦 正在打包前端 React + TS 极致瀑布流...');
  execSync('npm --prefix client install', { stdio: 'inherit' });
  execSync('npm --prefix client run build', { stdio: 'inherit' });
} catch (err) {
  console.error('❌ 打包前端出错:', err.message);
  process.exit(1);
}

// 4. 检查并安装 worker-build
let hasWorkerBuild = false;
try {
  execSync('worker-build --version', { stdio: 'ignore' });
  hasWorkerBuild = true;
} catch (e) {
  // 未找到
}

if (!hasWorkerBuild) {
  console.log('🚨 未在系统中检测到 worker-build，开始安装...');
  try {
    execSync('cargo install -q worker-build', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ 安装 worker-build 失败:', err.message);
    process.exit(1);
  }
}

// 5. 编译 Rust 边缘 Worker
try {
  console.log('🦀 编译 Rust 边缘 Worker WebAssembly...');
  execSync('worker-build --release', { stdio: 'inherit' });
  console.log('=== 🎉 全套编译构建大功告成！ ===');
} catch (err) {
  console.error('❌ 编译 Wasm Worker 失败:', err.message);
  process.exit(1);
}
