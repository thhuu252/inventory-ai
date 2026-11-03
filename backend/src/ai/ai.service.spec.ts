import { ServiceUnavailableException } from '@nestjs/common';
import { ReportsService } from '../reports/reports.service';
import { AiService } from './ai.service';
import { LlmClient, LlmTurn } from './llm.client';

const textTurn = (text: string): LlmTurn => ({
  text,
  functionCalls: [],
  content: { role: 'model', parts: [{ text }] },
});
const callTurn = (name: string, args: Record<string, unknown> = {}): LlmTurn => ({
  functionCalls: [{ id: 'c1', name, args }],
  content: { role: 'model', parts: [{ functionCall: { id: 'c1', name, args } }] },
});

describe('AiService', () => {
  let llm: { enabled: boolean; chat: jest.Mock };
  let reports: { lowStock: jest.Mock; summary: jest.Mock };
  let service: AiService;

  beforeEach(() => {
    llm = { enabled: true, chat: jest.fn() };
    reports = {
      lowStock: jest.fn().mockResolvedValue([{ sku: 'LAP-MBA-M3', totalStock: 2, minStock: 5 }]),
      summary: jest.fn().mockRejectedValue(new Error('db down')),
    };
    service = new AiService(llm as unknown as LlmClient, reports as unknown as ReportsService);
  });

  it('answers directly when the model needs no data', async () => {
    llm.chat.mockResolvedValueOnce(textTurn('Xin chào!'));
    await expect(service.ask({ question: 'hi' })).resolves.toEqual({ answer: 'Xin chào!', toolCalls: [] });
  });

  it('runs the requested tool and sends the result back to the model', async () => {
    llm.chat
      .mockResolvedValueOnce(callTurn('get_low_stock_products', { limit: 5 }))
      .mockResolvedValueOnce(textTurn('MacBook Air M3 sắp hết hàng.'));

    const res = await service.ask({ question: 'Sản phẩm nào sắp hết?' });

    expect(reports.lowStock).toHaveBeenCalledWith(5);
    expect(res.answer).toBe('MacBook Air M3 sắp hết hàng.');
    expect(res.toolCalls).toEqual([{ name: 'get_low_stock_products', args: { limit: 5 } }]);
    const contents = llm.chat.mock.calls[1][0];
    expect(contents.at(-1).parts[0].functionResponse.response).toEqual({
      result: [{ sku: 'LAP-MBA-M3', totalStock: 2, minStock: 5 }],
    });
  });

  it('reports unknown tools and tool failures to the model instead of crashing', async () => {
    llm.chat
      .mockResolvedValueOnce(callTurn('drop_database'))
      .mockResolvedValueOnce(callTurn('get_inventory_summary'))
      .mockResolvedValueOnce(textTurn('Không lấy được dữ liệu.'));

    const res = await service.ask({ question: 'x' });

    const responses = llm.chat.mock.calls[2][0]
      .filter((c: any) => c.parts?.[0]?.functionResponse)
      .map((c: any) => c.parts[0].functionResponse.response);
    expect(responses[0]).toEqual({ error: 'Unknown function drop_database' });
    expect(responses[1]).toHaveProperty('error');
    expect(res.answer).toBe('Không lấy được dữ liệu.');
  });

  it('stops after a bounded number of tool rounds', async () => {
    llm.chat.mockResolvedValue(callTurn('get_low_stock_products'));
    const res = await service.ask({ question: 'loop' });
    expect(llm.chat).toHaveBeenCalledTimes(5);
    expect(res.answer).toMatch(/phức tạp/);
  });

  it('maps chat history to model roles', async () => {
    llm.chat.mockResolvedValueOnce(textTurn('ok'));
    await service.ask({
      question: 'còn kho HN thì sao?',
      history: [
        { role: 'user', content: 'tồn kho HCM?' },
        { role: 'assistant', content: '120 sản phẩm' },
      ],
    });
    expect(llm.chat.mock.calls[0][0].map((c: any) => c.role)).toEqual(['user', 'model', 'user']);
  });

  it('fails clearly when no API key is configured', async () => {
    llm.enabled = false;
    await expect(service.ask({ question: 'x' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
