"use client";
import React from "react";

/**
 * Tiny, safe renderer for Sakhi's replies: **bold**, *italic*, "- " bullets,
 * "1. " lists and tappable helpline numbers. Builds React nodes, never HTML.
 */
const PHONE = /\b(112|108|102|14416|1800[- ]?\d{3}[- ]?\d{4})\b/g;

function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  const pushText = (s: string) => {
    let p = 0;
    let n: RegExpExecArray | null;
    PHONE.lastIndex = 0;
    while ((n = PHONE.exec(s))) {
      if (n.index > p) out.push(s.slice(p, n.index));
      out.push(<a key={`${key}-t${i++}`} href={`tel:${n[1].replace(/\D/g, "")}`} className="font-semibold underline decoration-pink-300 underline-offset-2">{n[1]}</a>);
      p = n.index + n[1].length;
    }
    if (p < s.length) out.push(s.slice(p));
  };
  while ((m = re.exec(text))) {
    if (m.index > last) pushText(text.slice(last, m.index));
    out.push(m[1] !== undefined
      ? <strong key={`${key}-b${i++}`} className="font-semibold">{m[1]}</strong>
      : <em key={`${key}-i${i++}`}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) pushText(text.slice(last));
  return out;
}

export default function ChatMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`l${blocks.length}`} className={`${list.ordered ? "list-decimal" : "list-disc"} pl-5 space-y-1 marker:text-pink-400`}>
        {list.items.map((it, j) => <li key={j}>{inline(it, `l${blocks.length}-${j}`)}</li>)}
      </Tag>
    );
    list = null;
  };
  lines.forEach((line, idx) => {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const num = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || num) {
      const ordered = Boolean(num);
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push((bullet || num)![1]);
      return;
    }
    flush();
    if (line.trim()) blocks.push(<p key={`p${idx}`}>{inline(line, `p${idx}`)}</p>);
  });
  flush();
  return <div className="space-y-2 leading-relaxed">{blocks}</div>;
}
