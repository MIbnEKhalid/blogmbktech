import path from 'path';
import { commonHandlebarsHelpers } from 'mbkutils';
import { CACHE_VERSION } from '../config/constants.js';

// Precompiled regular expressions for high-performance markdown stripping and reading time
const RE_CODE_BLOCKS = /```[\s\S]*?```/g;
const RE_INLINE_CODE = /`([^`]*)`/g;
const RE_IMAGES = /!\[([^\]]*)\]\([^\)]*\)/g;
const RE_LINKS = /\[([^\]]+)\]\([^\)]+\)/g;
const RE_HEADINGS = /^#{1,6}\s*/gm;
const RE_BOLD_ITALIC = /(\*\*|\*|__|_)(.*?)\1/g;
const RE_BLOCKQUOTES = /^>\s?/gm;
const RE_LIST_MARKERS = /^[\s*-]+/gm;
const RE_HTML_TAGS = /<[^>]*>/g;
const RE_MULTIPLE_NEWLINES = /\n{2,}/g;
const RE_MULTIPLE_SPACES = /[ \t]{2,}/g;
const RE_CLEAN_TEXT = /[#*`[\]()]/g;
const RE_WHITESPACE = /\s+/;

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);

/**
 * Optimized custom Handlebars helpers for blogmbktech.
 */
export const handlebarsHelpers = {
  ...commonHandlebarsHelpers,

  split: (value, separator = ',') => {
    if (!value && value !== 0) return [];
    if (Array.isArray(value)) return value.map(v => (typeof v === 'string' ? v.trim() : v)).filter(Boolean);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(v => (typeof v === 'string' ? v.trim() : v)).filter(Boolean);
      } catch {}
      return value.split(separator).map(s => s.trim()).filter(Boolean);
    }
    return [String(value)];
  },

  stripMarkdown: (md) => {
    if (!md) return '';
    return String(md)
      .replace(RE_CODE_BLOCKS, '')
      .replace(RE_INLINE_CODE, '$1')
      .replace(RE_IMAGES, '$1')
      .replace(RE_LINKS, '$1')
      .replace(RE_HEADINGS, '')
      .replace(RE_BOLD_ITALIC, '$2')
      .replace(RE_BLOCKQUOTES, '')
      .replace(RE_LIST_MARKERS, '')
      .replace(RE_HTML_TAGS, '')
      .replace(RE_MULTIPLE_NEWLINES, '\n')
      .replace(RE_MULTIPLE_SPACES, ' ')
      .trim();
  },

  calculateReadingTime: (markdown) => {
    if (!markdown) return 0;
    const words = String(markdown).replace(RE_CLEAN_TEXT, '').split(RE_WHITESPACE).filter(Boolean).length;
    return Math.ceil(words / 200) || 1;
  },

  formatReadingTime: (markdown) => {
    if (!markdown) return 'Less than 1 min read';
    const words = String(markdown).replace(RE_CLEAN_TEXT, '').split(RE_WHITESPACE).filter(Boolean).length;
    const mins = Math.ceil(words / 200) || 1;
    return mins === 1 ? 'Less than 1 min read' : `${mins} min read`;
  },

  getCategory: (categories, categoryId) => {
    if (!Array.isArray(categories)) return '';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : '';
  },

  isImage: (filename) => {
    if (!filename || typeof filename !== 'string') return false;
    return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
  },
};
