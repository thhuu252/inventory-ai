import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../core/api.service';
import { ChatMessage } from '../core/models';
import { renderMarkdown } from '../shared/markdown';

const TOOL_LABEL: Record<string, string> = {
  get_inventory_summary: 'Tổng quan',
  search_products: 'Tìm sản phẩm',
  get_low_stock_products: 'Hàng sắp hết',
  get_top_products: 'Top sản phẩm',
  get_movement_totals: 'Tổng nhập xuất',
  get_daily_movement_trend: 'Xu hướng theo ngày',
  get_stock_by_warehouse: 'Tồn theo kho',
};

@Component({
  selector: 'app-assistant',
  imports: [FormsModule, NzCardModule, NzInputModule, NzButtonModule, NzIconModule, NzTagModule, NzAlertModule, NzTooltipModule],
  template: `
    <div class="page-title"><h2><span nz-icon nzType="robot"></span> Trợ lý AI</h2></div>
    @if (enabled() === false) {
      <nz-alert nzType="warning" nzShowIcon nzMessage="Trợ lý AI chưa được cấu hình" nzDescription="Thêm GEMINI_API_KEY vào file .env của backend rồi khởi động lại." class="mb"></nz-alert>
    }
    <nz-card class="chat-card">
      <div class="messages" #scroller>
        @if (!messages().length) {
          <div class="empty">
            <p>Hỏi bất cứ điều gì về dữ liệu kho bằng tiếng Việt, ví dụ:</p>
            <div class="suggest">
              @for (s of suggestions; track s) { <button nz-button nzShape="round" (click)="send(s)">{{ s }}</button> }
            </div>
          </div>
        }
        @for (m of messages(); track $index) {
          <div class="msg" [class.me]="m.role === 'user'">
            @if (m.role === 'user') {
              <div class="bubble">{{ m.content }}</div>
            } @else {
              <div class="bubble bot">
                <div [innerHTML]="html(m.content)"></div>
                @if (m.toolCalls?.length) {
                  <div class="tools">
                    @for (t of m.toolCalls; track $index) {
                      <nz-tag nz-tooltip [nzTooltipTitle]="json(t.args)"><span nz-icon nzType="api"></span> {{ toolLabel(t.name) }}</nz-tag>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
        @if (loading()) { <div class="msg"><div class="bubble bot typing">Đang tra cứu dữ liệu<span>.</span><span>.</span><span>.</span></div></div> }
      </div>
      <form class="composer" (ngSubmit)="send()">
        <input nz-input name="q" [(ngModel)]="question" placeholder="VD: Tháng này xuất bao nhiêu laptop?" [disabled]="loading()" autocomplete="off" />
        <button nz-button nzType="primary" [disabled]="!question.trim() || loading()"><span nz-icon nzType="send"></span></button>
      </form>
    </nz-card>
  `,
  styles: `
    .mb { margin-bottom: 12px; }
    .chat-card ::ng-deep .ant-card-body { display: flex; flex-direction: column; height: calc(100vh - 190px); min-height: 420px; padding: 0; }
    .messages { flex: 1; overflow-y: auto; padding: 16px; }
    .empty { text-align: center; color: rgba(0,0,0,.55); margin-top: 40px; }
    .suggest { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .suggest button { white-space: normal; height: auto; }
    .msg { display: flex; margin-bottom: 12px; }
    .msg.me { justify-content: flex-end; }
    .bubble { max-width: min(720px, 85%); padding: 10px 14px; border-radius: 12px; background: #1677ff; color: #fff; white-space: pre-wrap; overflow-x: auto; }
    .bubble.bot { background: #f5f5f5; color: rgba(0,0,0,.88); white-space: normal; }
    .bubble.bot ::ng-deep p { margin: 0 0 6px; }
    .bubble.bot ::ng-deep ul, .bubble.bot ::ng-deep ol { margin: 0 0 6px; padding-left: 20px; }
    .bubble.bot ::ng-deep table { border-collapse: collapse; margin: 6px 0; font-size: 13px; }
    .bubble.bot ::ng-deep th, .bubble.bot ::ng-deep td { border: 1px solid #e5e5e5; padding: 4px 8px; text-align: left; }
    .tools { margin-top: 6px; }
    .composer { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #f0f0f0; }
    .typing span { animation: blink 1.2s infinite; } .typing span:nth-child(2) { animation-delay: .2s; } .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink { 0%, 100% { opacity: .2; } 50% { opacity: 1; } }
  `,
})
export class AssistantPage {
  private readonly api = inject(ApiService);
  private readonly scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly loading = signal(false);
  protected readonly enabled = signal<boolean | null>(null);
  protected question = '';
  protected readonly suggestions = [
    'Sản phẩm nào sắp hết hàng?',
    'Tổng giá trị tồn kho hiện tại là bao nhiêu?',
    'Top 5 sản phẩm xuất nhiều nhất 30 ngày qua',
    'Kho nào đang giữ nhiều hàng nhất?',
    'Tuần này nhập bao nhiêu chuột Logitech?',
  ];

  constructor() {
    this.api.aiStatus().subscribe((s) => this.enabled.set(s.enabled));
  }

  send(text = this.question) {
    const q = text.trim();
    if (!q || this.loading()) return;
    const history = this.messages().slice(-10);
    this.messages.update((m) => [...m, { role: 'user', content: q }]);
    this.question = '';
    this.loading.set(true);
    this.scroll();
    this.api.ask(q, history).subscribe({
      next: (r) => {
        this.messages.update((m) => [...m, { role: 'assistant', content: r.answer, toolCalls: r.toolCalls }]);
        this.loading.set(false);
        this.scroll();
      },
      error: () => {
        this.messages.update((m) => [...m, { role: 'assistant', content: 'Xin lỗi, đã có lỗi khi gọi trợ lý AI.' }]);
        this.loading.set(false);
      },
    });
  }

  html = (md: string) => renderMarkdown(md);
  json = (v: unknown) => JSON.stringify(v);
  toolLabel = (n: string) => TOOL_LABEL[n] ?? n;

  private scroll() {
    setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
