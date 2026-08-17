import { handler } from "./lambda_function.mjs"
import { readFile } from "node:fs/promises"

const event = JSON.parse(
  await readFile(new URL("./event.json", import.meta.url), "utf8"),
)

const result = await handler(event, {})
console.log(JSON.stringify(result, null, 2))