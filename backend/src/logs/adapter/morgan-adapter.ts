import morgan, { type FormatFn, type Options } from "morgan"
import { randomUUID } from "crypto"
import type { IncomingMessage, ServerResponse } from "http"
import type { Request } from "express"
import type { ILoggingAdapter } from "../interfaces/ILoggin-adapter.js"

type MorganFormat = string | FormatFn

export interface MorganAdapterConfig {
  /** Morgan format string or format function. Defaults to `:id :method :url :status :response-time ms` */
  format?: MorganFormat
  /** Native morgan options (stream, skip, etc.) */
  options?: Options<IncomingMessage, ServerResponse>
  /**
   * Automatically attach a unique `x-request-id` header to every request
   * and expose it as the `:id` token. Defaults to `true`.
   */
  withRequestId?: boolean
}

export class MorganAdapter implements ILoggingAdapter {
  private constructor(
    private readonly format: MorganFormat,
    private readonly options?: Options<IncomingMessage, ServerResponse>,
  ) {}

  /**
   * Factory method — the only way to create a MorganAdapter.
   *
   * @example
   * // dev: skip health checks
   * const logger = MorganAdapter.create({
   *   options: { skip: (req) => req.path === "/health" },
   * })
   * app.use(logger.middleware())
   *
   * @example
   * // prod: combined format, no request-id
   * const logger = MorganAdapter.create({
   *   format: "combined",
   *   withRequestId: false,
   * })
   */
  static create(config: MorganAdapterConfig = {}): MorganAdapter {
    const {
      format = ":id :method :url :status :response-time ms",
      options,
      withRequestId = true,
    } = config

    // Register the :id token globally once per adapter creation.
    // morgan.token is idempotent — re-registering just overwrites.
    if (withRequestId) {
      morgan.token("id", (req: Request) => {
        req.headers["x-request-id"] ??= randomUUID()
        return req.headers["x-request-id"] as string
      })
    }

    return new MorganAdapter(format, options)
  }

  middleware() {
    return morgan(this.format as string, this.options)
  }
}

