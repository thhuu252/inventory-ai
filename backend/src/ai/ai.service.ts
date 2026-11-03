import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Content } from '@google/genai';
import { ReportsService } from '../reports/reports.service';
import { AskDto } from './ai.dto';
import { AI_TOOLS } from './ai.tools';
import { LLM_CLIENT, LlmClient } from './llm.client';

const MAX_STEPS = 5;

export interface AskResult {
  answer: string;
  toolCalls: { name: string; args: Record<string, unknown> }[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
    private readonly reports: ReportsService,
  ) {}

  get enabled() {
    return this.llm.enabled;
  }

  systemInstruction(now = new Date()) {
    return [
      'You are the assistant of an inventory management system for a Vietnamese company.',
      `Today is ${now.toISOString().slice(0, 10)} (timezone Asia/Ho_Chi_Minh).`,
      'Answer ONLY using data returned by the provided functions; call them whenever the question needs data.',
      'If the data does not contain the answer, say so. Never invent numbers, products or warehouses.',
      'Reply in the same language as the user (usually Vietnamese), concisely, using bullet points or a short table for lists.',
      'Money is in VND: format like 1.250.000 ₫.',
      'You are read-only: if asked to create, change or delete data, explain that it must be done in the app.',
    ].join('\n');
  }

  async ask(dto: AskDto): Promise<AskResult> {
    if (!this.llm.enabled) {
      throw new ServiceUnavailableException('AI assistant is not configured (missing GEMINI_API_KEY)');
    }
    const contents: Content[] = [
      ...(dto.history ?? []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: dto.question }] },
    ];
    const toolCalls: AskResult['toolCalls'] = [];
    const system = this.systemInstruction();

    // Agent loop: the model either answers or asks us to run tools, then sees the results.
    for (let step = 0; step < MAX_STEPS; step++) {
      const turn = await this.llm.chat(contents, AI_TOOLS, system);
      if (!turn.functionCalls.length) {
        return { answer: turn.text?.trim() || 'Xin lỗi, tôi chưa trả lời được câu hỏi này.', toolCalls };
      }
      contents.push(turn.content);
      const responses = await Promise.all(
        turn.functionCalls.map(async (call) => {
          toolCalls.push({ name: call.name, args: call.args });
          return {
            functionResponse: { id: call.id, name: call.name, response: await this.runTool(call.name, call.args) },
          };
        }),
      );
      contents.push({ role: 'user', parts: responses });
    }
    return { answer: 'Câu hỏi quá phức tạp, vui lòng hỏi cụ thể hơn.', toolCalls };
  }

  private async runTool(name: string, args: Record<string, unknown>) {
    const tool = AI_TOOLS.find((t) => t.name === name);
    if (!tool) return { error: `Unknown function ${name}` };
    try {
      return { result: await tool.run(this.reports, args) };
    } catch (e) {
      this.logger.warn(`Tool ${name} failed: ${(e as Error).message}`);
      return { error: 'The function failed; check the arguments (dates must be YYYY-MM-DD).' };
    }
  }
}
