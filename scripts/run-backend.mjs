import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const backendDir = join(process.cwd(), "backend");
const localPython =
  process.platform === "win32"
    ? join(backendDir, ".venv", "Scripts", "python.exe")
    : join(backendDir, ".venv", "bin", "python");
const python = existsSync(localPython) ? localPython : "python";

const result = spawnSync(python, process.argv.slice(2), {
  cwd: backendDir,
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
