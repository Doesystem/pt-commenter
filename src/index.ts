import { defineAgent, getEnvBoolean, getEnvString, getEnvNumber, hasEnv } from "@lifetimesoft/agent-sdk"
import { runWorker } from "./workers/ptCommentWorker.js"
import { crawl } from "./jobs/ptFeedJob.js"
import { runMaintenance, showStats } from "./tools/maintenance.js"
import type { Context } from "@lifetimesoft/agent-sdk"

function validateEnv(ctx: Context): void {
    const commentEnable = getEnvBoolean(ctx.env, 'comment_enable', true)

    // credentials required when comment worker is enabled
    if (commentEnable) {
        if (!hasEnv(ctx.env, 'pt_username')) {
            ctx.log.error('Missing required env: pt_username (needed when comment_enable=true)')
            throw new Error('Missing required env: pt_username')
        }
        if (!hasEnv(ctx.env, 'pt_password')) {
            ctx.log.error('Missing required env: pt_password (needed when comment_enable=true)')
            throw new Error('Missing required env: pt_password')
        }
    }

    // validate wait time range
    const minWait = getEnvNumber(ctx.env, 'min_wait_minutes', 2) ?? 2
    const maxWait = getEnvNumber(ctx.env, 'max_wait_minutes', 6) ?? 6

    if (minWait <= 0 || maxWait <= 0) {
        throw new Error(`Wait times must be positive (min_wait_minutes=${minWait}, max_wait_minutes=${maxWait})`)
    }
    if (minWait > maxWait) {
        throw new Error(`min_wait_minutes (${minWait}) must be <= max_wait_minutes (${maxWait})`)
    }

    const maxTasksPerRun = getEnvNumber(ctx.env, 'max_tasks_per_run', 1) ?? 1
    if (maxTasksPerRun < 1) {
        throw new Error(`max_tasks_per_run must be >= 1 (got ${maxTasksPerRun})`)
    }
}

export default defineAgent({
    async run(ctx) {
        ctx.log.info('PT Commenter Agent starting...')

        try {
            const mode = getEnvString(ctx.env, 'mode', 'normal')

            if (mode === 'maintenance') {
                ctx.log.info('Running in maintenance mode')
                await runMaintenance(ctx)
                return
            }

            if (mode === 'stats') {
                ctx.log.info('Showing storage statistics')
                await showStats(ctx)
                return
            }

            // validate env before doing any real work
            validateEnv(ctx)

            // Run the feed job once (RSS crawler)
            if (getEnvBoolean(ctx.env, 'feed_job_enable')) {
                await crawl(ctx)
                ctx.log.info('PT feed job completed')
            }

            // Run the comment worker once (processes all tasks from queue)
            if (getEnvBoolean(ctx.env, 'comment_enable', true)) {
                await runWorker(ctx)
                ctx.log.info('PT comment worker completed')
            }

            ctx.log.info('PT Commenter Agent run successfully')

        } catch (error) {
            const err = error as Error
            ctx.log.error('Failed: ' + err.message)
            throw err
        }
    },
})
