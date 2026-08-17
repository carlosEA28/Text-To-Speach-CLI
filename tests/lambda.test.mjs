import { test } from "node:test"
import assert from "node:assert/strict"
import { createHandler } from "../lambda_function.mjs"

process.env.AUDIO_BUCKET = "test-bucket"
delete process.env.AWS_REGION

function makeDeps() {
  const synthesized = []
  const uploaded = []
  const polly = {
    send: async (command) => {
      synthesized.push(command.input)
      return {
        AudioStream: {
          transformToByteArray: async () => new Uint8Array([0x49, 0x44, 0x33, 0x00]),
        },
      }
    },
  }
  const s3 = {
    send: async (command) => {
      uploaded.push(command.input)
      return {}
    },
  }
  return { synthesized, uploaded, polly, s3 }
}

test("gera áudio e envia para o S3, retornando a URL", async () => {
  const { synthesized, uploaded, polly, s3 } = makeDeps()
  const handler = createHandler({ polly, s3, newKey: () => "audio/123.mp3" })

  const res = await handler({ text: "Olá mundo", voice: "Camila" })
  assert.equal(res.statusCode, 200)

  const body = JSON.parse(res.body)
  assert.equal(body.url, "https://test-bucket.s3.us-east-1.amazonaws.com/audio/123.mp3")
  assert.equal(body.voice, "Camila")

  assert.equal(synthesized.length, 1)
  assert.equal(synthesized[0].VoiceId, "Camila")
  assert.equal(synthesized[0].OutputFormat, "mp3")

  assert.equal(uploaded.length, 1)
  assert.equal(uploaded[0].Bucket, "test-bucket")
  assert.equal(uploaded[0].Key, "audio/123.mp3")
  assert.equal(uploaded[0].ContentType, "audio/mpeg")
  assert.ok(Buffer.isBuffer(uploaded[0].Body))
})

test("texto vazio retorna 400", async () => {
  const { polly, s3 } = makeDeps()
  const handler = createHandler({ polly, s3 })
  const res = await handler({ text: "   " })
  assert.equal(res.statusCode, 400)
  assert.match(JSON.parse(res.body).error, /text/i)
})

test("aceita payload do API Gateway (event.body como string JSON)", async () => {
  const { polly, s3, synthesized } = makeDeps()
  const handler = createHandler({ polly, s3 })
  const res = await handler({ body: JSON.stringify({ text: "oi", voice: "Vitoria" }) })
  assert.equal(res.statusCode, 200)
  assert.equal(JSON.parse(res.body).voice, "Vitoria")
  assert.equal(synthesized[0].VoiceId, "Vitoria")
})

test("resposta inclui headers de CORS", async () => {
  const { polly, s3 } = makeDeps()
  const handler = createHandler({ polly, s3 })
  const res = await handler({ text: "olá" })
  assert.equal(res.headers["Access-Control-Allow-Origin"], "*")
})

test("sem AUDIO_BUCKET retorna 400", async () => {
  const { polly, s3 } = makeDeps()
  delete process.env.AUDIO_BUCKET
  const handler = createHandler({ polly, s3 })
  const res = await handler({ text: "olá" })
  assert.equal(res.statusCode, 400)
  process.env.AUDIO_BUCKET = "test-bucket"
})