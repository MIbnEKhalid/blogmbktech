import path from 'path';
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
const BYTE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

/**
 * Optimized custom Handlebars helpers.
 */
export const handlebarsHelpers = {
  formatDate: (date) => date ? new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  }) : '',

  formatDateShort: (date) => date ? new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }) : '',

  formatTimestamp: (timestamp) => timestamp ? new Date(timestamp).toLocaleString() : '',

  in: (value, list) => Array.isArray(list) && (list.includes(Number(value)) || list.includes(value)),

  trim: (str) => typeof str === 'string' ? str.trim() : '',

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

  eq: (a, b) => a === b,
  encodeURIComponent: (str) => encodeURIComponent(str || ''),
  jsonStringify: (context) => JSON.stringify(context),

  truncate: (str, len) => {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
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

  section: function (name, options) {
    if (!this._sections) this._sections = {};
    this._sections[name] = options.fn(this);
    return null;
  },

  getCanonicalUrl: (req, path) => {
    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'blog.mbktech.org';
    return `${protocol}://${host}${path}`;
  },

  index: (array, idx) => array ? array[idx] : null,

  getCategory: (categories, categoryId) => {
    if (!Array.isArray(categories)) return '';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : '';
  },

  cacheBuster: () => CACHE_VERSION,

  add: (a, b) => Number(a) + Number(b),
  subtract: (a, b) => Number(a) - Number(b),
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  and: (...args) => args.slice(0, -1).every(Boolean),
  or: (...args) => args.slice(0, -1).some(Boolean),

  range: (start, end) => {
    const result = [];
    for (let i = start; i < end; i++) result.push(i);
    return result;
  },

  isImage: (filename) => {
    if (!filename || typeof filename !== 'string') return false;
    return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
  },

  formatBytes: (bytes) => {
    if (!bytes) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + BYTE_UNITS[i];
  },

  getFileExtension: (filename) => {
    if (!filename) return 'unknown';
    const ext = path.extname(filename);
    return ext ? ext.substring(1).toUpperCase() : 'UNKNOWN';
  },

  timeAgo: (date) => {
    if (!date) return '';
    const elapsed = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (elapsed < 30) return 'just now';
    if (elapsed < 60) return `${elapsed}s ago`;
    const mins = Math.floor(elapsed / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  },

  formatNumber: (num) => (num == null ? '0' : Number(num).toLocaleString()),
  capitalize: (str) => str ? String(str).charAt(0).toUpperCase() + String(str).slice(1) : '',
  firstLetter: (str) => str ? String(str).trim().charAt(0).toUpperCase() : 'U',

  coalesce: (...args) => {
    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] !== null && args[i] !== undefined && args[i] !== '') return args[i];
    }
    return '';
  }
};
