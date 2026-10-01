import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const androidDir = resolve(dirname(fileURLToPath(import.meta.url)), '../android')
const result = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'gradlew.bat assembleDebug'], { cwd: androidDir, stdio: 'inherit' })
  : spawnSync('./gradlew', ['assembleDebug'], { cwd: androidDir, stdio: 'inherit' })
if (result.error) {
  console.error(result.error.message)
  process.exitCode = 1
} else {
  process.exitCode = result.status ?? 1
}
