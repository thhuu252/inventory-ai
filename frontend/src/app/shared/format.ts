const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('vi-VN');
const compact = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });

export const formatVnd = (v: number) => vnd.format(v ?? 0);
export const formatNum = (v: number) => num.format(v ?? 0);
export const formatCompact = (v: number) => compact.format(v ?? 0);
