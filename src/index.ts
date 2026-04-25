import { defineAgent, getEnvBoolean, getEnvString } from "@lifetimesoft/agent-sdk"
import { runWorker } from "./workers/pantipCommentWorker.js"
import { crawl } from "./jobs/pantipFeedJob.js"
import { runMaintenance, showStats } from "./tools/maintenance.js"

export default defineAgent({
    async run(ctx) {
        ctx.log.info('PT Commenter Agent starting...')
        ctx.log.info('scheduler type: ' + ctx.config.scheduler?.type)
        
        try {
            // Check for maintenance mode
            const mode = getEnvString(ctx.env, 'mode', 'normal');
            
            if (mode === 'maintenance') {
                ctx.log.info('Running in maintenance mode');
                await runMaintenance(ctx);
                return;
            }
            
            if (mode === 'stats') {
                ctx.log.info('Showing storage statistics');
                await showStats(ctx);
                return;
            }
            
            // Normal operation mode
            // Run the feed job once (RSS crawler)
            if (getEnvBoolean(ctx.env, 'feed_job_enable')) {
                await crawl(ctx)
                ctx.log.info('pt feed job completed')
            }
            
            // Run the comment worker once (processes all tasks from queue)
            if (getEnvBoolean(ctx.env, 'comment_enable', true)) {
                await runWorker(ctx)
                ctx.log.info('Pantip comment worker completed')
            }
            
            ctx.log.info('PT Commenter Agent run successfully')
            
        } catch (error) {
            const err = error as Error
            ctx.log.error('Failed to start: ' + err.message)
            throw err
        }
    },
})