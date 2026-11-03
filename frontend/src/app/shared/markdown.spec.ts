import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('escapes HTML from the model', () => {
    expect(renderMarkdown('<img src=x onerror=alert(1)>')).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });

  it('renders bold text and bullet lists', () => {
    expect(renderMarkdown('**Kết quả**\n- A\n- B')).toBe('<p><b>Kết quả</b></p><ul><li>A</li><li>B</li></ul>');
  });

  it('renders pipe tables and skips the separator row', () => {
    const html = renderMarkdown('| SKU | Tồn |\n|---|---|\n| A1 | 5 |');
    expect(html).toBe('<table><thead><tr><th>SKU</th><th>Tồn</th></tr></thead><tbody><tr><td>A1</td><td>5</td></tr></tbody></table>');
  });
});
