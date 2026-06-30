import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "..")
const selfPath = fileURLToPath(import.meta.url)

function isNodeSupported() {
  const match = process.version.match(/^v(\d+)\.(\d+)/)
  if (!match) return false
  const major = Number(match[1])
  const minor = Number(match[2])
  return major > 22 || (major === 22 && minor >= 22)
}

function ensureSupportedNode() {
  if (isNodeSupported()) return

  if (process.env.NEXVIO_N8N_DEV_REEXEC === "1") {
    console.error(`Node ${process.version} is not supported by n8n (need >=22.22).`)
    console.error("Run: nvm install 24 && nvm use 24")
    process.exit(1)
  }

  const nvmDir = process.env.NVM_DIR || `${process.env.HOME}/.nvm`
  const nvmSh = join(nvmDir, "nvm.sh")
  const nvmrcPath = join(rootDir, ".nvmrc")
  const wanted = existsSync(nvmrcPath) ? readFileSync(nvmrcPath, "utf8").trim() : "24.14.1"

  if (!existsSync(nvmSh)) {
    console.error(`Node ${process.version} is not supported by n8n (need >=22.22).`)
    console.error("Install nvm, then: nvm install 24 && nvm use 24")
    process.exit(1)
  }

  console.log(`Node ${process.version} is too old for n8n. Switching to ${wanted} via nvm...`)

  const result = spawnSync(
    "bash",
    ["-lc", `source "${nvmSh}" && nvm use ${wanted} >/dev/null && node "${selfPath}"`],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env, NEXVIO_N8N_DEV_REEXEC: "1" },
    },
  )

  process.exit(result.status ?? 1)
}

ensureSupportedNode()

const clientId = process.env.NEXVIO_OAUTH_CLIENT_ID?.trim()

const env = {
  ...process.env,
  N8N_PORT: process.env.N8N_PORT || "5680",
  N8N_RUNNERS_BROKER_PORT: process.env.N8N_RUNNERS_BROKER_PORT || "5681",
}

if (clientId) {
  env.CREDENTIALS_OVERWRITE_DATA = JSON.stringify({
    nexvioOAuth2Api: {
      clientId,
    },
  })
  console.log("Using NEXVIO_OAUTH_CLIENT_ID from environment for local OAuth dev")
} else {
  console.log("Set NEXVIO_OAUTH_CLIENT_ID to prefill OAuth Client ID during local dev")
}

console.log(`Starting n8n with Nexvio PKCE OAuth (Node ${process.version})`)

const n8nNodeBin = join(rootDir, "node_modules", ".bin", "n8n-node")
const n8nNode = existsSync(n8nNodeBin) ? n8nNodeBin : "n8n-node"
const binDir = join(rootDir, "node_modules", ".bin")

const child = spawn(n8nNode, ["dev"], {
  cwd: rootDir,
  env: {
    ...env,
    PATH: `${binDir}:${process.env.PATH || ""}`,
  },
  stdio: "inherit",
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})
