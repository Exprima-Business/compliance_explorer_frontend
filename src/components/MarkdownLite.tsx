import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Tiny, dependency-free Markdown renderer for assistant chat output.
 *
 * Handles the subset LLM answers actually use — headers (#..######), bold,
 * italic, inline code, and bullet / numbered lists — and renders to MUI
 * elements sized to fit a chat bubble. It builds a React tree (no
 * dangerouslySetInnerHTML), so it's XSS-safe by construction. If we ever need
 * tables/links/blockquotes, swap this for react-markdown.
 */

const INLINE_RE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;

/** Render inline emphasis within a single line to React nodes. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const parts = text.split(INLINE_RE);
  parts.forEach((part, i) => {
    if (!part) return;
    const key = `${keyPrefix}-${i}`;
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      out.push(<Box component="strong" key={key} sx={{ fontWeight: 700 }}>{part.slice(2, -2)}</Box>);
    } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      out.push(<Box component="em" key={key} sx={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Box>);
    } else if (part.startsWith('`') && part.endsWith('`')) {
      out.push(
        <Box component="code" key={key}
          sx={{ fontFamily: 'monospace', fontSize: '0.85em', bgcolor: 'rgba(0,0,0,0.06)', px: 0.5, borderRadius: 0.5 }}>
          {part.slice(1, -1)}
        </Box>,
      );
    } else {
      out.push(<React.Fragment key={key}>{part}</React.Fragment>);
    }
  });
  return out;
}

const HEADER_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^\s*[-*]\s+(.*)$/;
const ORDERED_RE = /^\s*\d+\.\s+(.*)$/;

export default function MarkdownLite({ text }: { text: string }) {
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];

  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length === 0) return;
    const joined = para.join(' ');
    blocks.push(
      <Typography key={`p-${blocks.length}`} variant="body2" sx={{ mb: 0.75, lineHeight: 1.5 }}>
        {renderInline(joined, `p${blocks.length}`)}
      </Typography>,
    );
    para = [];
  };

  const flushList = () => {
    if (!list || list.items.length === 0) { list = null; return; }
    const Tag = list.ordered ? 'ol' : 'ul';
    const items = list.items;
    blocks.push(
      <Box component={Tag} key={`l-${blocks.length}`} sx={{ my: 0.5, pl: 2.5 }}>
        {items.map((it, i) => (
          <Box component="li" key={i} sx={{ mb: 0.25 }}>
            <Typography variant="body2" component="span" sx={{ lineHeight: 1.5 }}>
              {renderInline(it, `li${blocks.length}-${i}`)}
            </Typography>
          </Box>
        ))}
      </Box>,
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw;
    if (line.trim() === '') { flushPara(); flushList(); continue; }

    const h = line.match(HEADER_RE);
    if (h) {
      flushPara(); flushList();
      const level = h[1].length;
      blocks.push(
        <Typography key={`h-${blocks.length}`}
          variant={level <= 2 ? 'subtitle1' : 'subtitle2'}
          sx={{ fontWeight: 700, mt: blocks.length ? 1 : 0, mb: 0.5, lineHeight: 1.3 }}>
          {renderInline(h[2], `h${blocks.length}`)}
        </Typography>,
      );
      continue;
    }

    const b = line.match(BULLET_RE);
    const o = line.match(ORDERED_RE);
    if (b || o) {
      flushPara();
      const ordered = !!o;
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((b ? b[1] : o![1]));
      continue;
    }

    // plain text line — accumulate into a paragraph
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();

  return <Box sx={{ '& > *:last-child': { mb: 0 } }}>{blocks}</Box>;
}
