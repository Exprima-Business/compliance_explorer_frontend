import React from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const LINK_COLOR = '#534AB7';

/** Map a semantic href to an in-app route, an external URL, or null (unknown). */
function resolveHref(href: string): { to: string | null; external: string | null } {
  const h = href.trim();
  if (/^https?:\/\//i.test(h)) return { to: null, external: h };
  if (h.startsWith('clause:')) return { to: `/clauses/${encodeURIComponent(h.slice(7).trim())}`, external: null };
  if (h.startsWith('page:')) {
    const map: Record<string, string> = {
      poam: '/poam', controls: '/controls', frameworks: '/controls',
      obligations: '/obligations', regulations: '/regulations', matrix: '/matrix',
      dashboard: '/dashboard', evaluations: '/evaluations',
      'document-scanner': '/document-scanner', scan: '/document-scanner',
    };
    return { to: map[h.slice(5).trim().toLowerCase()] ?? null, external: null };
  }
  if (h.startsWith('/')) return { to: h, external: null };
  return { to: null, external: null };
}

const linkSx = { color: LINK_COLOR, textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 };

/** A markdown link → in-app navigation (internal) or new-tab (external). */
function MdLink({ text, href }: { text: string; href: string }) {
  const navigate = useNavigate();
  const { to, external } = resolveHref(href);
  if (external) {
    return <Box component="a" href={external} target="_blank" rel="noopener noreferrer" sx={linkSx}>{text}</Box>;
  }
  if (to) {
    return (
      <Box component="a" href={to} sx={linkSx}
        onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate(to); }}>
        {text}
      </Box>
    );
  }
  return <>{text}</>; // unknown scheme — show the label, no dead link
}

/**
 * Tiny, dependency-free Markdown renderer for assistant chat output.
 *
 * Handles the subset LLM answers actually use — headers (#..######), bold,
 * italic, inline code, and bullet / numbered lists — and renders to MUI
 * elements sized to fit a chat bubble. It builds a React tree (no
 * dangerouslySetInnerHTML), so it's XSS-safe by construction. If we ever need
 * tables/links/blockquotes, swap this for react-markdown.
 */

const INLINE_RE = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
const LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)$/;

/** Render inline emphasis + links within a single line to React nodes. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const parts = text.split(INLINE_RE);
  parts.forEach((part, i) => {
    if (!part) return;
    const key = `${keyPrefix}-${i}`;
    const link = part.match(LINK_RE);
    if (link) {
      out.push(<MdLink key={key} text={link[1]} href={link[2]} />);
      return;
    }
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
