/**
 * Removes Narkis's own sales copy from text passed through from Narkis's
 * public pages (meta descriptions, photographer blurbs, blog articles).
 *
 * Photographer prices are informational and stay untouched; only sentences
 * that promote Narkis's own product ("or get AI headshots from $27"), quote
 * Narkis package prices, or link to Narkis checkout/pricing/signup pages are
 * removed. Ported from the Narkis ChatGPT plugin (narkis-mcp/internal/policy).
 */

// A money amount: "$27", "€ 150", "27 USD", "99 dollars".
const PRICE_RE =
	/(?:[$€£]\s?\d[\d,.]*|\b\d+(?:[.,]\d+)?\s?(?:usd|eur|gbp|chf|dollars?|euros?)\b)/gi;

// Market-size figures ("$450 million", "$1.2B") are statistics, not prices.
const MARKET_SIZE_RE = /^\s*(?:million|billion|trillion|mn|bn|m\b|b\b)/i;

// Narkis's own one-time package prices ($27, $54, $108; same figures in
// EUR/GBP). "$270", "$27,000" and "$27.50" do not match.
const NARKIS_PRICE_RE =
	/(?:[$€£]\s?(?:27|54|108)(?:[^\d,.]|[.,](?:\D|$)|$)|\b(?:27|54|108)\s?(?:usd|eur|gbp|dollars?|euros?)\b)/i;

// Prices in a sentence about photographers or studios are informational.
const PHOTOGRAPHER_CONTEXT_RE =
	/\b(?:photographers?|studios?|sessions?|traditional|in-person|on-site|retouch(?:ing)?)\b/i;

const NARKIS_RE = /\bnarkis\b/i;

// "AI headshots", "AI alternatives", "AI photo generators", ...
const AI_PRODUCT_RE =
	/\bai[- ](?:generated\s+)?(?:headshots?|photos?|portraits?|images?|pictures?|alternatives?|options?|tools?|services?|generators?|photo\s+generators?|headshot\s+generators?)\b/i;

// Words that turn a Narkis mention into a sales pitch.
const CTA_RE =
	/\b(?:try|trial|sign[- ]?up|get started|start(?:s|ing)? (?:at|from|now|today)|buy|order|purchase|subscri(?:be|ption)|upgrade|coupon|promo(?:tion)?|discount|code|credits?|packages?|plans?|pricing|prices?|priced|checkout|costs?|cheap(?:er)?|affordable|save|saving|for just|only|one[- ]time|generates?|generating|upload(?:s|ing)?|create(?:s)? (?:your|professional|realistic|stunning)|sign in|log in|free)\b/i;

// Markdown link: [text](url).
const MD_LINK_SOURCE = String.raw`\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)`;
const mdLinkGlobal = () => new RegExp(MD_LINK_SOURCE, 'g');

// Bare URL.
const BARE_URL_SOURCE = String.raw`https?://[^\s)\]>"]+`;
const bareUrlGlobal = () => new RegExp(BARE_URL_SOURCE, 'g');

// Narkis paths that may be linked: guides, the directory, research, legal pages.
const INFORMATIONAL_PREFIXES = [
	'/blog',
	'/headshot-photographers',
	'/research',
	'/about',
	'/contact',
	'/privacy',
	'/terms',
	'/cookie-policy',
];

function parseUrl(raw: string): URL | undefined {
	try {
		return new URL(raw);
	} catch {
		return undefined;
	}
}

function isNarkisUrl(raw: string): boolean {
	const host = parseUrl(raw)?.hostname.toLowerCase();
	return host === 'narkis.ai' || (host?.endsWith('.narkis.ai') ?? false);
}

function isAllowedNarkisLink(raw: string): boolean {
	const url = parseUrl(raw);
	if (!url) return false;
	const path = url.pathname.toLowerCase().replace(/\/+$/, '');
	return INFORMATIONAL_PREFIXES.some((pre) => path === pre || path.startsWith(pre + '/'));
}

function isTransactionalNarkisLink(raw: string): boolean {
	return isNarkisUrl(raw) && !isAllowedNarkisLink(raw);
}

/** Whether text contains a money amount that is not a market-size statistic. */
function hasPrice(text: string): boolean {
	for (const match of text.matchAll(PRICE_RE)) {
		const end = (match.index ?? 0) + match[0].length;
		if (!MARKET_SIZE_RE.test(text.slice(end))) return true;
	}
	return false;
}

/** Replaces markdown links with their text and drops bare URLs. */
function plainText(text: string): string {
	return text.replace(mdLinkGlobal(), '$1').replace(bareUrlGlobal(), '');
}

/** Whether a single sentence sells or upsells Narkis's own product. */
export function isPromotional(sentence: string): boolean {
	const plain = plainText(sentence);
	if (NARKIS_PRICE_RE.test(plain)) return true;
	const price = hasPrice(plain);
	const cta = CTA_RE.test(plain);
	if (NARKIS_RE.test(plain) && (price || cta)) return true;
	if (AI_PRODUCT_RE.test(plain) && price) return true;
	if (price || cta) {
		for (const match of sentence.matchAll(mdLinkGlobal())) {
			if (isTransactionalNarkisLink(match[2])) return true;
		}
		for (const match of sentence.matchAll(bareUrlGlobal())) {
			if (isTransactionalNarkisLink(match[0])) return true;
		}
	}
	return false;
}

const TERMINATORS = '.!?';
const CLOSERS = '"\'”’)*_';
const SENTENCE_OPENERS = '"“*_[($€£';
const UPPER_RE = /\p{Lu}/u;
const DIGIT_RE = /\p{Nd}/u;
const SPACE_RE = /\s/u;

/**
 * Splits text at '.', '!' or '?' followed by whitespace and an upper-case
 * letter, digit, quote, emphasis or link opener. "Narkis.ai" and "e.g. this"
 * stay intact.
 */
export function splitSentences(input: string): string[] {
	const text = input.trim();
	if (text === '') return [];
	const chars = Array.from(text);
	const out: string[] = [];
	let start = 0;
	for (let i = 0; i < chars.length; i++) {
		if (!TERMINATORS.includes(chars[i])) continue;
		let j = i + 1;
		while (j < chars.length && CLOSERS.includes(chars[j])) j++;
		if (j >= chars.length || !SPACE_RE.test(chars[j])) continue;
		let k = j;
		while (k < chars.length && SPACE_RE.test(chars[k])) k++;
		if (k >= chars.length) break;
		const next = chars[k];
		if (UPPER_RE.test(next) || DIGIT_RE.test(next) || SENTENCE_OPENERS.includes(next)) {
			out.push(chars.slice(start, j).join('').trim());
			start = k;
			i = k - 1;
		}
	}
	const tail = chars.slice(start).join('').trim();
	if (tail !== '') out.push(tail);
	return out;
}

/**
 * Drops promotional sentences. In strict mode a paragraph that mentions
 * Narkis or AI photo products (or sits in such a section) also loses other
 * sentences quoting a price, unless the sentence is plainly about
 * photographers or studios and carries no call to action.
 */
function stripSentences(text: string, strict: boolean, productSection: boolean): string {
	const plain = plainText(text);
	const productParagraph =
		strict && (productSection || NARKIS_RE.test(plain) || AI_PRODUCT_RE.test(plain));
	const kept = splitSentences(text).filter((sentence) => {
		if (isPromotional(sentence)) return false;
		const plainSentence = plainText(sentence);
		if (
			productParagraph &&
			hasPrice(plainSentence) &&
			(!PHOTOGRAPHER_CONTEXT_RE.test(sentence) || CTA_RE.test(plainSentence))
		) {
			return false;
		}
		return true;
	});
	return kept.join(' ').trim();
}

/** Removes promotional sentences from plain text and collapses whitespace. */
export function stripPromo(text: string | null | undefined): string {
	if (!text) return '';
	return stripSentences(text, false, false);
}

/** Unlinks markdown links to transactional Narkis pages and drops such bare URLs. */
function unlinkTransactional(text: string): string {
	return text
		.replace(mdLinkGlobal(), (whole: string, label: string, url: string) =>
			isTransactionalNarkisLink(url) ? label : whole,
		)
		.replace(bareUrlGlobal(), (url: string) => (isTransactionalNarkisLink(url) ? '' : url));
}

// ":::faq", ":::cta" and the malformed ":::[faq](/blog/...)"; a bare ":::" closes.
const BLOCK_OPEN_RE = /^:::\s*\[?([A-Za-z][\w-]*)/;
const BLOCK_CLOSE_RE = /^:::\s*$/;
const CTA_FIELD_RE = /^(?:buttontext|buttonlink|button_text|button_link)\s*:/i;
const REL_LINK_RE = /\]\(\/([^)\s]*)\)/g;
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g;
const LINE_PREFIX_RE = /^(#{1,6}\s+|\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?|>\s*)/;
const KV_LINE_RE = /^[a-z_]+:\s/;
const MULTI_BLANK_RE = /\n{3,}/g;

/** Strips promotional sentences from one markdown line, keeping its prefix. */
function cleanLine(line: string, productSection: boolean): string | undefined {
	const prefix = LINE_PREFIX_RE.exec(line)?.[0] ?? '';
	let body = line.slice(prefix.length).trim();
	if (prefix.startsWith('#')) {
		return isPromotional(body) ? undefined : prefix + unlinkTransactional(body);
	}
	body = unlinkTransactional(stripSentences(body, true, productSection)).trim();
	if (body === '' || body.replace(/^[*_ ]+|[*_ ]+$/g, '') === '') return undefined;
	return prefix + body;
}

/**
 * Turns a Narkis blog post (markdown with ":::" custom blocks) into plain
 * markdown without sales copy: CTA/carousel blocks, directives and images are
 * dropped, tables pairing Narkis with a price are dropped, promotional
 * sentences are removed and links to transactional Narkis pages are unlinked.
 * Site-relative links are made absolute first.
 */
export function cleanArticle(markdown: string, site: string): string {
	const md = markdown.replace(REL_LINK_RE, `](${site.replace(/\/+$/, '')}/$1)`);
	const lines = md.replace(/\r\n/g, '\n').split('\n');
	const out: string[] = [];
	let block = '';
	let inBlock = false;
	let productSection = false;

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		const trim = line.trim();

		if (BLOCK_CLOSE_RE.test(trim)) {
			inBlock = false;
			block = '';
			continue;
		}
		const open = BLOCK_OPEN_RE.exec(trim);
		if (open) {
			inBlock = true;
			block = open[1].toLowerCase();
			continue;
		}
		if (CTA_FIELD_RE.test(trim)) continue;
		if (inBlock) {
			if (block === 'cta' || block === 'carousel') continue;
			if (block === 'image-text') {
				if (trim.startsWith('text:')) out.push(trim.slice('text:'.length).trim());
				continue;
			}
			if (
				KV_LINE_RE.test(trim) &&
				(trim.startsWith('type:') || trim.startsWith('title:') || trim.startsWith('text_position:'))
			) {
				continue;
			}
		}
		if (trim.startsWith('::')) continue; // leaf directive such as ::blog-image[...]

		// Markdown table: judge it as a whole.
		if (trim.startsWith('|')) {
			let j = i;
			while (j < lines.length && lines[j].trim().startsWith('|')) j++;
			const table = lines.slice(i, j);
			const joined = table.join('\n');
			if (!(NARKIS_RE.test(joined) && hasPrice(joined))) {
				const rows = table.filter((row) => !NARKIS_PRICE_RE.test(row));
				out.push(unlinkTransactional(rows.join('\n')));
			}
			i = j - 1;
			continue;
		}

		line = line.replace(IMAGE_RE, '');
		if (line.trim() === '') {
			out.push('');
			continue;
		}
		if (/^#{1,6}\s/.test(line)) {
			const heading = plainText(line.trim().replace(/^[# ]+/, ''));
			productSection = NARKIS_RE.test(heading) || AI_PRODUCT_RE.test(heading);
		}
		const cleaned = cleanLine(line, productSection);
		if (cleaned !== undefined) out.push(cleaned);
		if (NARKIS_RE.test(plainText(line))) productSection = true;
	}
	return out.join('\n').trim().replace(MULTI_BLANK_RE, '\n\n');
}
