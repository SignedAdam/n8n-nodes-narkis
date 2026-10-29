import { NICHE, SITE_URL } from './constants';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,199}$/;

/** Rounds a listed price to whole dollars; null when unknown. */
export function roundPrice(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

/** Formats whole dollars the way narkis.ai does: "$1,500". */
function money(value: number): string {
	return `$${value.toLocaleString('en-US')}`;
}

/** Mirrors the narkis.ai listing format: "$150–$400", "from $150", "up to $400". */
export function priceRange(low: unknown, high: unknown): string | null {
	const lo = roundPrice(low);
	const hi = roundPrice(high);
	if (lo !== null && hi !== null) return lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`;
	if (lo !== null) return `from ${money(lo)}`;
	if (hi !== null) return `up to ${money(hi)}`;
	return null;
}

/** Public city guide URL for a directory path. */
export function guideUrl(path: string): string {
	return `${SITE_URL}/${NICHE}/${path}`;
}

/**
 * Normalizes a directory path ("US/Texas/Austin/", a full city guide URL, or
 * "us/texas/austin") to "us/texas/austin". Returns undefined when a segment is
 * not a valid slug or there are more than four segments.
 */
export function normalizePath(input: string): string | undefined {
	let path = input.trim().toLowerCase();
	const marker = `/${NICHE}/`;
	const at = path.indexOf(marker);
	if (at >= 0) path = path.slice(at + marker.length);
	path = path.split(/[?#]/)[0];
	const segments = path.split('/').filter((s) => s !== '');
	if (segments.length === 0 || segments.length > 4 || !segments.every((s) => SLUG_RE.test(s))) {
		return undefined;
	}
	return segments.join('/');
}

/** Normalizes a guide slug or narkis.ai/blog URL to a bare slug. */
export function normalizeGuideSlug(input: string): string | undefined {
	const path = input.trim().toLowerCase().split(/[?#]/)[0].replace(/\/+$/, '');
	const slug = path.slice(path.lastIndexOf('/') + 1);
	return SLUG_RE.test(slug) ? slug : undefined;
}

const MINOR_WORDS = ['of', 'and', 'the', 'de', 'la', 'del'];

/** "new-york" → "New York", "district-of-columbia" → "District of Columbia". */
export function slugToName(slug: string): string {
	return slug
		.split('-')
		.map((word, i) =>
			i > 0 && MINOR_WORDS.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
		)
		.join(' ');
}

/** Country name from its ISO 3166-1 alpha-2 slug ("us" → "United States"). */
export function countryName(slug: string): string {
	try {
		return new Intl.DisplayNames(['en'], { type: 'region' }).of(slug.toUpperCase()) ?? slug;
	} catch {
		return slug.toUpperCase();
	}
}

/** Directory level of a path by segment count. */
export const LEVELS = ['country', 'state', 'city', 'sub_region'] as const;
