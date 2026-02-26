import "dotenv/config"
import cors from "cors"
import express from "express"
import morgan from "morgan"
import { z } from "zod"
import type { Request, Response } from "express"
import { validate } from "./middleware/validate.js"
import { simulateContractSchema, type SimulateContractInput } from "./schemas/soroban.js"
import { env } from "./schemas/env.js"

const app = express()

app.use(morgan("dev"))
app.use(express.json())
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(",").map((s: string) => s.trim()),
  }),
)

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "shelterflex-backend",
    env: env.NODE_ENV,
  })
})

app.get("/soroban/config", (_req: Request, res: Response) => {
  res.json({
    rpcUrl: env.SOROBAN_RPC_URL,
    networkPassphrase: env.SOROBAN_NETWORK_PASSPHRASE,
    contractId: env.SOROBAN_CONTRACT_ID ?? null,
  })
})

/**
 * POST /soroban/simulate
 *
 * Validates the request body with Zod before forwarding to the Soroban RPC.
 * Returns 400 with structured field-level errors on invalid input.
 *
 * Body: { contractId: string, method: string, args?: unknown[] }
 */
app.post(
  "/soroban/simulate",
  validate(simulateContractSchema),
  (req: Request, res: Response) => {
    const { contractId, method, args } = req.body as SimulateContractInput

    // TODO: replace stub with actual SorobanRpc.Server#simulateTransaction call
    res.json({
      contractId,
      method,
      args,
      status: "pending",
      message: "Simulation queued – RPC integration coming soon",
    })
  },
)

app.listen(env.PORT, () => {
  console.log(`[backend] listening on http://localhost:${env.PORT}`)
})
