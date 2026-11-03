import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Content, GoogleGenAI } from '@google/genai';
import { AiTool } from './ai.tools';

export interface LlmFunctionCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LlmTurn {
  text?: string;
  functionCalls: LlmFunctionCall[];
  /** The model's message, to append to the conversation unchanged. */
  content: Content;
}

export const LLM_CLIENT = Symbol('LLM_CLIENT');

/** Small seam over the model SDK so the assistant logic can be unit-tested with a fake. */
export interface LlmClient {
  readonly enabled: boolean;
  chat(contents: Content[], tools: AiTool[], systemInstruction: string): Promise<LlmTurn>;
}

@Injectable()
export class GeminiClient implements LlmClient {
  private readonly ai?: GoogleGenAI;
  private readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    this.model = config.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    if (apiKey) this.ai = new GoogleGenAI({ apiKey });
  }

  get enabled() {
    return !!this.ai;
  }

  async chat(contents: Content[], tools: AiTool[], systemInstruction: string): Promise<LlmTurn> {
    const res = await this.ai!.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
        tools: [
          {
            functionDeclarations: tools.map((t) => ({
              name: t.name,
              description: t.description,
              parametersJsonSchema: t.parameters,
            })),
          },
        ],
      },
    });
    return {
      text: res.text,
      functionCalls: (res.functionCalls ?? []).map((c) => ({
        id: c.id,
        name: c.name ?? '',
        args: (c.args as Record<string, unknown>) ?? {},
      })),
      content: res.candidates?.[0]?.content ?? { role: 'model', parts: [] },
    };
  }
}
