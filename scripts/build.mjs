// Builds dist/ClipCraft-mac-arm64.dmg (Apple silicon). Run with `npm run package`.

import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { packager } from "@electron/packager";

const root = process.cwd();
const dist = path.join(root, "dist");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

await rm(dist, { recursive: true, force: true });
const [appDir] = await packager({
  dir: root,
  out: dist,
  name: "ClipCraft",
  appBundleId: "app.clipcraft.mac",
  appVersion: pkg.version,
  appCategoryType: "public.app-category.productivity",
  platform: "darwin",
  arch: "arm64",
  icon: path.join(root, "src", "icon.icns"),
  asar: true,
  overwrite: true,
  ignore: [/^\/dist($|\/)/, /^\/scripts($|\/)/, /^\/README\.md$/],
});

// Apple silicon refuses to launch unsigned code, so sign the bundle ad hoc.
// (A Developer ID signature would need a paid Apple Developer account.)
const bundle = path.join(appDir, "ClipCraft.app");
execFileSync("codesign", ["--force", "--deep", "--sign", "-", bundle], { stdio: "inherit" });

// Disk image with the usual "drag to Applications" layout.
const staging = path.join(dist, "dmg");
await mkdir(staging);
execFileSync("ditto", [bundle, path.join(staging, "ClipCraft.app")]);
await symlink("/Applications", path.join(staging, "Applications"));
await writeFile(
  path.join(staging, "First launch - read me.txt"),
  "Drag ClipCraft into Applications, then open it.\n\n" +
    "The first time, macOS may say it can't verify ClipCraft. Click Done, open\n" +
    "System Settings > Privacy & Security, scroll down and click \"Open Anyway\".\n" +
    "You only need to do this once.\n",
);
const dmg = path.join(dist, "ClipCraft-mac-arm64.dmg");
execFileSync("hdiutil", ["create", "-volname", "ClipCraft", "-srcfolder", staging, "-fs", "HFS+", "-format", "UDZO", "-imagekey", "zlib-level=9", "-ov", dmg], { stdio: "inherit" });
await rm(staging, { recursive: true, force: true });
console.log(`[build] ${dmg}`);
