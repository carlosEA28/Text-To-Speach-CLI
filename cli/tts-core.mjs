import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly"
import { resolveAwsProfile, resolveAwsRegion } from "./aws-config.mjs"

export const VOICES = ["Camila", "Vitoria", "Ricardo", "Joanna", "Matthew", "Salli"]

const profile = resolveAwsProfile()
if (profile) {
  process.env.AWS_PROFILE = profile
}

const region = resolveAwsRegion()

export async function synthesize(text, voice = "Camila") {
  const client = new PollyClient({ region })
  const command = new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: "mp3",
    VoiceId: voice,
  })

  const response = await client.send(command)
  const base64 = await response.AudioStream.transformToString("base64")

  return { base64, bytes: Buffer.byteLength(base64, "base64") }
}