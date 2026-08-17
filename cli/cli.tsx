import { createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard } from "@opentui/react"
import { useCallback, useState } from "react"
import { writeFile } from "node:fs/promises"
import { synthesize, VOICES } from "./tts-core.mjs"

const VOICE_OPTIONS = VOICES.map((voice) => ({ name: voice, value: voice }))

type Status = { kind: "idle" | "busy" | "success" | "error"; message: string }

const STATUS_COLORS: Record<Status["kind"], string> = {
  idle: "#94a3b8",
  busy: "#facc15",
  success: "#22c55e",
  error: "#ef4444",
}

function App() {
  const [text, setText] = useState("")
  const [voice, setVoice] = useState(VOICES[0])
  const [focused, setFocused] = useState<"text" | "voice">("text")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>({
    kind: "idle",
    message: "Digite o texto e pressione Enter para converter.",
  })

  useKeyboard((key) => {
    if (key.name === "tab") {
      setFocused((prev) => (prev === "text" ? "voice" : "text"))
    } else if (key.name === "escape") {
      process.exit(0)
    }
  })

  const convert = useCallback(
    async (value?: string) => {
      const input = (value ?? text).trim()
      if (!input) {
        setStatus({ kind: "error", message: "Informe um texto primeiro." })
        return
      }
      if (busy) return
      setBusy(true)
      setStatus({ kind: "busy", message: `Gerando áudio com a voz ${voice}...` })
      try {
        const { base64, bytes } = await synthesize(input, voice)
        await writeFile("output.mp3", Buffer.from(base64, "base64"))
        setStatus({
          kind: "success",
          message: `Áudio salvo em output.mp3 (${bytes} bytes) — voz ${voice}`,
        })
      } catch (err) {
        const message = (err as Error).message
        const hint = /credentials|Credential|token|ExpiredToken/i.test(message)
          ? " — rode: aws sso login --profile " +
            (process.env.AWS_PROFILE || "seu-perfil")
          : ""
        setStatus({ kind: "error", message: `Erro: ${message}${hint}` })
      } finally {
        setBusy(false)
      }
    },
    [text, voice, busy],
  )

  return (
    <box
      title=" 🔊 Text-to-Speech · AWS Polly "
      titleColor="cyan"
      border
      borderStyle="double"
      borderColor="cyan"
      padding={1}
      paddingLeft={2}
      paddingRight={2}
      flexDirection="column"
      gap={1}
      minWidth={64}
    >
      <text fg="#94a3b8">Texto</text>
      <box title="Texto para converter" titleColor={focused === "text" ? "cyan" : "#475569"} border width="100%">
        <input
          placeholder="Digite o texto a ser convertido..."
          value={text}
          onInput={setText}
          onSubmit={convert}
          focused={focused === "text"}
        />
      </box>

      <text fg="#94a3b8">Voz</text>
      <box title="Escolha a voz (setas para navegar)" titleColor={focused === "voice" ? "cyan" : "#475569"} border width={48}>
        <select
          options={VOICE_OPTIONS}
          selectedIndex={Math.max(0, VOICE_OPTIONS.findIndex((o) => o.value === voice))}
          onChange={(_, option) => {
            if (option?.value) setVoice(option.value)
          }}
          onSelect={() => convert()}
          focused={focused === "voice"}
          showDescription={false}
          showScrollIndicator
        />
      </box>

      <box>
        <text fg={STATUS_COLORS[status.kind]}>{status.message}</text>
      </box>
      <text fg="#475569" dim>
        Tab para alternar · Enter para converter · Esc para sair
      </text>
    </box>
  )
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App />)