import { test } from "node:test"
import assert from "node:assert/strict"
import { writeFileSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const dir = mkdtempSync(join(tmpdir(), "aws-config-test-"))
const configPath = join(dir, "config")
writeFileSync(
  configPath,
  [
    "[profile dev]",
    "region = sa-east-1",
    "sso_session = rocketseat-sso",
    "",
    "[profile prod]",
    "region = us-east-1",
    "",
  ].join("\n"),
)

process.env.AWS_CONFIG_FILE = configPath
delete process.env.AWS_PROFILE
delete process.env.AWS_REGION
delete process.env.AWS_ACCESS_KEY_ID

const { resolveAwsProfile, resolveAwsRegion } = await import("../cli/aws-config.mjs")

test("detecta o primeiro perfil do config", () => {
  assert.equal(resolveAwsProfile(), "dev")
})

test("usa a região do perfil detectado", () => {
  assert.equal(resolveAwsRegion(), "sa-east-1")
})

test("AWS_PROFILE tem prioridade", () => {
  process.env.AWS_PROFILE = "prod"
  assert.equal(resolveAwsProfile(), "prod")
  assert.equal(resolveAwsRegion(), "us-east-1")
  delete process.env.AWS_PROFILE
})

test("AWS_REGION tem prioridade sobre o perfil", () => {
  process.env.AWS_PROFILE = "dev"
  process.env.AWS_REGION = "us-west-2"
  assert.equal(resolveAwsRegion(), "us-west-2")
  delete process.env.AWS_REGION
  delete process.env.AWS_PROFILE
})

test("sem config nem env, retorna undefined/us-east-1", () => {
  process.env.AWS_CONFIG_FILE = join(dir, "inexistente")
  delete process.env.AWS_PROFILE
  delete process.env.AWS_REGION
  delete process.env.AWS_ACCESS_KEY_ID
  assert.equal(resolveAwsProfile(), undefined)
  assert.equal(resolveAwsRegion(), "us-east-1")
})