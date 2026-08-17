import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "node:crypto"

const REGION = process.env.AWS_REGION || "us-east-1"

function headers() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  }
}

function ok(body) {
  return { statusCode: 200, headers: headers(), body: JSON.stringify(body) }
}

function bad(message) {
  return { statusCode: 400, headers: headers(), body: JSON.stringify({ error: message }) }
}

function parseEvent(event) {
  if (!event) return {}
  if (!event.body) return event
  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body
  } catch {
    return {}
  }
}

export function createHandler(overrides = {}) {
  const polly = overrides.polly ?? new PollyClient({ region: REGION })
  const s3 = overrides.s3 ?? new S3Client({ region: REGION })
  const newKey = overrides.newKey ?? (() => `audio/${Date.now()}-${randomUUID()}.mp3`)

  return async (event) => {
    const input = parseEvent(event)
    const text = (input?.text || "").trim()
    if (!text) return bad("O campo 'text' é obrigatório.")

    const voice = input?.voice || "Camila"
    const engine = input?.engine || "standard"

    const synth = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3",
      VoiceId: voice,
      EngineType: engine,
    })
    const response = await polly.send(synth)
    const audioBytes = Buffer.from(await response.AudioStream.transformToByteArray())

    const bucket = process.env.AUDIO_BUCKET
    if (!bucket) return bad("Bucket de áudio não configurado (AUDIO_BUCKET).")

    const key = newKey()
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: audioBytes,
        ContentType: "audio/mpeg",
      }),
    )

    const url = `https://${bucket}.s3.${REGION}.amazonaws.com/${key}`
    return ok({ message: "Áudio gerado com sucesso", url, key, voice, engine, text })
  }
}

export const handler = createHandler()