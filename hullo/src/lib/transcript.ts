import type { ChatLine } from './session.ts';

const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Download the current conversation as a plain-text file. Nothing leaves the browser. */
export function downloadTranscript(lines: ChatLine[], common: string[]) {
  const started = lines[0]?.ts ?? Date.now();
  const header = [
    `hullo chat — ${new Date(started).toLocaleString()}`,
    common.length ? `You both like: ${common.join(', ')}` : 'Random match',
    '',
  ];
  const body = lines.map((l) => {
    if (l.from === 'system') return `— ${l.text}`;
    const who = l.from === 'me' ? 'You' : 'Stranger';
    const failed = l.status === 'failed' ? ' (not sent)' : '';
    return `[${time(l.ts)}] ${who}${failed}: ${l.text}`;
  });
  const blob = new Blob([[...header, ...body, ''].join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date(started).toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const a = Object.assign(document.createElement('a'), { href: url, download: `hullo-chat-${stamp}.txt` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
