import { logger } from '@audiwav/logger'
import { z } from 'zod'
import type { ErrorHandler } from 'hono'

export const errorHandler: ErrorHandler = (error, c) => {
  if (error instanceof z.ZodError) {
    logger.warn(
      {
        method: c.req.method,
        path: c.req.path,
        issues: error.issues,
      },
      'Request validation failed',
    )

    return c.json(
      {
        error: 'Validation failed',
        issues: error.issues,
      },
      400,
    )
  }

  logger.error(
    {
      err: error,
      method: c.req.method,
      path: c.req.path,
    },
    'Unhandled API error',
  )

  return c.json(
    {
      error: 'Internal server error',
    },
    500,
  )
}