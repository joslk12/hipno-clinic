import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'strong',
    'em',
    'del',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'img',
    'code',
    'pre',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel'],
    img: ['src', 'alt', 'title', 'loading', 'decoding'],
    code: ['class'],
    th: ['align'],
    td: ['align']
  },
  allowedClasses: {
    code: [/^language-/]
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https']
  },
  allowProtocolRelative: false,
  transformTags: {
    a(tagName, attribs) {
      if (/^https?:\/\//i.test(attribs.href ?? '')) {
        return { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }
      }
      return { tagName, attribs }
    },
    img(tagName, attribs) {
      return {
        tagName,
        attribs: {
          ...attribs,
          loading: attribs.loading || 'lazy',
          decoding: attribs.decoding || 'async'
        }
      }
    }
  }
}

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS)
}

export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, {
    async: false,
    breaks: true,
    gfm: true
  }) as string

  return sanitizeBlogHtml(html)
}
