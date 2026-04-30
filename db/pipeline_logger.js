/**
 * Persistent pipeline logger — writes to pipeline_log table in Supabase.
 *
 * Usage:
 *   const logger = new PipelineLogger(pgClient);
 *   const runId = await logger.start('reconcile');
 *   // ... do work ...
 *   await logger.complete(runId, { cards_affected: 172 });
 *   // or on error:
 *   await logger.fail(runId, err, { cards_affected: 0 });
 */

class PipelineLogger {
  constructor(client) {
    this.client = client;
  }

  /**
   * Log the start of a pipeline operation.
   * @param {string} operation - 'reconcile' | 'insert_card' | 'indexnow' | 'deploy'
   * @param {object} [detail={}] - Additional metadata (e.g. { files: ['card.json'] })
   * @returns {string} run_id (UUID) for subsequent complete/fail calls
   */
  async start(operation, detail = {}) {
    try {
      const { rows } = await this.client.query(
        `INSERT INTO pipeline_log (operation, status, detail)
         VALUES ($1, 'started', $2)
         RETURNING run_id`,
        [operation, JSON.stringify(detail)]
      );
      return rows[0].run_id;
    } catch (err) {
      console.error('PipelineLogger.start failed:', err.message);
      return null;
    }
  }

  /**
   * Mark a pipeline run as completed.
   * @param {string} runId - UUID from start()
   * @param {object} opts
   * @param {number} [opts.cards_affected=0]
   * @param {number} [opts.duration_ms]
   * @param {object} [opts.detail] - Merged into existing detail
   */
  async complete(runId, opts = {}) {
    if (!runId) return;
    try {
      await this.client.query(
        `UPDATE pipeline_log
         SET status = 'completed',
             cards_affected = $2,
             duration_ms = $3,
             detail = detail || $4::jsonb,
             completed_at = NOW()
         WHERE run_id = $1 AND status = 'started'`,
        [
          runId,
          opts.cards_affected || 0,
          opts.duration_ms || null,
          JSON.stringify(opts.detail || {}),
        ]
      );
    } catch (err) {
      console.error('PipelineLogger.complete failed:', err.message);
    }
  }

  /**
   * Mark a pipeline run as failed.
   * @param {string} runId - UUID from start()
   * @param {Error} error - The caught error
   * @param {object} [opts] - Same as complete() opts
   */
  async fail(runId, error, opts = {}) {
    if (!runId) return;
    try {
      await this.client.query(
        `UPDATE pipeline_log
         SET status = 'failed',
             cards_affected = $2,
             duration_ms = $3,
             detail = detail || $4::jsonb,
             error_message = $5,
             error_stack = $6,
             completed_at = NOW()
         WHERE run_id = $1 AND status = 'started'`,
        [
          runId,
          opts.cards_affected || 0,
          opts.duration_ms || null,
          JSON.stringify(opts.detail || {}),
          error.message || String(error),
          error.stack || null,
        ]
      );
    } catch (logErr) {
      console.error('PipelineLogger.fail failed:', logErr.message);
    }
  }
}

module.exports = { PipelineLogger };
