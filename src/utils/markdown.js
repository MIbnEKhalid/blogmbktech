import { marked } from 'marked';
import Prism from 'prismjs';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

marked.setOptions({
    highlight: (code, lang) => (Prism.languages[lang] ? Prism.highlight(code, Prism.languages[lang], lang) : code),
    breaks: true,
    gfm: true
});

const window = new JSDOM('').window;
export const purify = DOMPurify(window);

export function renderMarkdown(markdown) {
    if (!markdown) return '';
    return purify.sanitize(marked(markdown));
}

export { marked };
