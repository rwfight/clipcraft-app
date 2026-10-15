# ClipCraft for Mac

The [ClipCraft](https://clipcraft-ai-sage.vercel.app) video downloader and file converters
in their own Mac window. Free TikTok, Instagram Reels and X (Twitter) downloads with no
watermark, plus image, PDF, ZIP and data converters.

**[Download for Mac (Apple silicon)](https://github.com/rwfight/clipcraft-app/releases/latest/download/ClipCraft-mac-arm64.dmg)** · macOS 12 or later

## Install

1. Open `ClipCraft-mac-arm64.dmg` and drag **ClipCraft** into **Applications**.
2. Open ClipCraft. The first time, macOS may say it can't verify the app: click **Done**,
   open **System Settings → Privacy & Security**, scroll down and click **Open Anyway**.
   You only need to do this once.

Downloads save to your Downloads folder. ClipCraft needs an internet connection.

## Build

```bash
npm install
npm run package   # → dist/ClipCraft-mac-arm64.dmg
```
