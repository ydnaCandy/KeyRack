# Node.js 20 + Debian ベースの公式 devcontainer イメージ
FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

# better-sqlite3 等のネイティブモジュールのビルドに必要なツール群
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    # Electron の実行に必要な X11 / Wayland 関連ライブラリ
    libxtst6 \
    libxss1 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libgtk-3-0 \
    # 仮想ディスプレイ（Electron の開発サーバー起動用）
    xvfb \
    # Windows 向けクロスコンパイル (electron-builder build:win) に必要
    wine \
    wine64 \
    && rm -rf /var/lib/apt/lists/*

# Xvfb を起動するラッパースクリプトを配置
# コンテナ起動後に `start-xvfb` を実行すれば DISPLAY=:99 が使用可能になる
RUN printf '#!/bin/bash\nXvfb :99 -screen 0 1280x720x24 &\nexport DISPLAY=:99\necho "Xvfb started on DISPLAY=:99"\n' \
    > /usr/local/bin/start-xvfb && chmod +x /usr/local/bin/start-xvfb
