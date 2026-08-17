import { readFileSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const CONFIG_PATH = () =>
  process.env.AWS_CONFIG_FILE || join(homedir(), ".aws", "config")

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function readConfig() {
  const path = CONFIG_PATH()
  if (!existsSync(path)) return ""
  return readFileSync(path, "utf8")
}

function readProfileSection(config, profile) {
  const match = config.match(
    new RegExp(`^\\[profile\\s+${escapeRegExp(profile)}\\][^\\[]*`, "m"),
  )
  return match ? match[0] : ""
}

export function resolveAwsProfile() {
  if (process.env.AWS_PROFILE) return process.env.AWS_PROFILE
  if (process.env.AWS_ACCESS_KEY_ID) return undefined
  const config = readConfig()
  const match = config.match(/^\[profile\s+([^\]]+)\]/m)
  return match ? match[1].trim() : undefined
}

export function resolveAwsRegion() {
  if (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION) {
    return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION
  }
  const profile = resolveAwsProfile()
  if (profile) {
    const section = readProfileSection(readConfig(), profile)
    const region = section.match(/^region\s*=\s*(.+)$/m)?.[1]?.trim()
    if (region) return region
  }
  return "us-east-1"
}