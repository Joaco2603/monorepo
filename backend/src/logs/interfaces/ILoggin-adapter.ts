
import type { RequestHandler } from "express"

/**
 * Contract that every HTTP logging adapter must fulfill.
 * Keeping it minimal ensures any provider (Morgan, Winston, Pino…)
 * can implement it without leaking provider-specific details.
 */
export interface ILoggingAdapter {
  middleware(): RequestHandler
}
