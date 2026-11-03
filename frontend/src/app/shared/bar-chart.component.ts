import { Component, computed, input } from '@angular/core';
import { TrendPoint } from '../core/models';

/** Dependency-free grouped bar chart (received vs issued per day). */
@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="legend">
      <span><i class="sw in"></i>Nhập</span>
      <span><i class="sw out"></i>Xuất</span>
    </div>
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" aria-label="Biểu đồ nhập xuất theo ngày">
      @for (t of ticks(); track t.v) {
        <line [attr.x1]="pad" [attr.x2]="width" [attr.y1]="t.y" [attr.y2]="t.y" class="grid" />
        <text [attr.x]="pad - 6" [attr.y]="t.y + 4" class="axis" text-anchor="end">{{ t.v }}</text>
      }
      @for (b of bars(); track b.date) {
        <g>
          <title>{{ b.date }}: nhập {{ b.in }}, xuất {{ b.out }}</title>
          <rect [attr.x]="b.x" [attr.y]="b.yIn" [attr.width]="b.w" [attr.height]="b.hIn" class="in" rx="2" />
          <rect [attr.x]="b.x + b.w + 2" [attr.y]="b.yOut" [attr.width]="b.w" [attr.height]="b.hOut" class="out" rx="2" />
          @if (b.label) {
            <text [attr.x]="b.x + b.w" [attr.y]="height - 4" class="axis" text-anchor="middle">{{ b.label }}</text>
          }
        </g>
      }
    </svg>
  `,
  styles: `
    svg { width: 100%; height: auto; display: block; }
    .grid { stroke: #f0f0f0; }
    .axis { font-size: 11px; fill: rgba(0,0,0,.45); }
    .in { fill: #52c41a; } .out { fill: #fa8c16; }
    .legend { display: flex; gap: 16px; font-size: 12px; margin-bottom: 4px; }
    .sw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; }
    .sw.in { background: #52c41a; } .sw.out { background: #fa8c16; }
  `,
})
export class BarChartComponent {
  readonly data = input<TrendPoint[]>([]);
  protected readonly width = 640;
  protected readonly height = 220;
  protected readonly pad = 36;
  private readonly plotH = this.height - 24;

  private readonly max = computed(() => {
    const m = Math.max(1, ...this.data().flatMap((d) => [d.in, d.out]));
    const step = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / step) * step;
  });

  protected readonly ticks = computed(() =>
    [0, 0.5, 1].map((f) => ({ v: Math.round(this.max() * f), y: this.plotH - f * (this.plotH - 8) })),
  );

  protected readonly bars = computed(() => {
    const d = this.data();
    const slot = (this.width - this.pad) / Math.max(1, d.length);
    const w = Math.max(2, (slot - 6) / 2);
    const scale = (v: number) => (v / this.max()) * (this.plotH - 8);
    return d.map((p, i) => ({
      ...p,
      x: this.pad + i * slot + 2,
      w,
      hIn: scale(p.in),
      yIn: this.plotH - scale(p.in),
      hOut: scale(p.out),
      yOut: this.plotH - scale(p.out),
      label: i % Math.ceil(d.length / 7) === 0 ? p.date.slice(8) + '/' + p.date.slice(5, 7) : '',
    }));
  });
}
