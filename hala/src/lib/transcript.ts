import { listify, localizeTag, systemText, type Dict, type Lang } from './i18n.ts';
import type { ChatLine } from './session.ts';

/** Download the current conversation as a plain-text file. Nothing leaves the browser. */
export function downloadTranscript(lines: ChatLine[], common: string[], t: Dict, lang: Lang) {
  const started = lines[0]?.ts ?? Date.now();
  const time = (ts: number) => new Date(ts).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' });
  const header = [
    t.transcriptHeader(new Date(started).toLocaleString(t.locale)),
    common.length ? t.transcriptShared(listify(common.map((c) => localizeTag(c, lang)), lang)) : t.transcriptRandom,
    '',
  ];
  const body = lines.map((l) => {
    if (l.sys) return `— ${systemText(l.sys, t, lang)}`;
    const who = l.from === 'me' ? t.you : t.them;
    const failed = l.status === 'failed' ? ` ${t.notSent}` : '';
    return `[${time(l.ts)}] ${who}${failed}: ${l.text}`;
  });
  // A byte-order mark so Notepad and friends open Arabic text as UTF-8.
  const blob = new Blob(['﻿' + [...header, ...body, ''].join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date(started).toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const a = Object.assign(document.createElement('a'), { href: url, download: `hala-chat-${stamp}.txt` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
