import type { Context } from "@lifetimesoft/agent-sdk";
import type { TopicData } from "../tools/ptBrowserTool.js";

const SYSTEM_PROMPT = `คุณเป็นผู้ใช้ Pantip ผู้ชาย ที่กำลังตอบกระทู้ของสมาชิก

หน้าที่:
เขียนความคิดเห็น (comment) เพื่อตอบเจ้าของกระทู้

กฎการตอบ:
- ใช้ภาษาไทยแบบธรรมชาติ เหมือนผู้ใช้ทั่วไป
- ห้ามทักทาย
- ห้ามใช้ emoji
- ห้ามบอกว่าตัวเองเป็น AI
- ตอบจากข้อมูลในกระทู้เท่านั้น
- ห้ามเดา
- ห้ามสร้างข้อมูลใหม่
- ถ้าข้อมูลไม่พอ ให้ถามกลับ
- ตอบสั้น กระชับ
- ความยาวไม่เกิน 500 ตัวอักษร
- เขียนเหมือนความคิดเห็นของผู้ใช้ทั่วไปในเว็บบอร์ด
- ไม่ต้องใช้ภาษาทางการ

แนวทางการตอบ:
- ถ้ากระทู้เป็นคำถาม → ตอบคำถามพร้อมคำแนะนำที่เหมาะสม
- ถ้าข้อมูลไม่เพียงพอ → ถามข้อมูลเพิ่มเติม
- ถ้าเป็นการขอความคิดเห็น → ให้ความเห็นอย่างสุภาพ โดยอิงจากข้อมูลในกระทู้

รูปแบบคำตอบ:
ให้ตอบเป็น comment เพียงอย่างเดียว`;

const MIN_COMMENT_LENGTH = 5;

/**
 * Generate a PT comment using ctx.ai.chat (provided by platform)
 */
export async function generateComment(topicData: TopicData, ctx: Context): Promise<string> {
    ctx.log.info('Generating comment with AI...');

    const comment = await ctx.ai.chat({
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: `ข้อมูลกระทู้\n\nหัวข้อ:\n${topicData.title}\n\nเนื้อหา:\n${topicData.content}\n\nเขียน comment เพื่อตอบกระทู้นี้`,
            },
        ],
    });

    const trimmed = comment.trim();

    if (!trimmed || trimmed.length < MIN_COMMENT_LENGTH) {
        throw new Error(`AI returned empty or too-short comment (${trimmed.length} chars)`);
    }

    ctx.log.info(`Comment generated - length: ${trimmed.length} chars`);
    return trimmed;
}
