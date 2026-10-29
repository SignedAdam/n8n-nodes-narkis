import type { IDataObject } from 'n8n-workflow';
import { guideUrl } from './format';

/** Subset of GET /api/seo/photographers/resolve used by the node. */
export interface ResolvedPage {
	type?: 'country' | 'state' | 'city' | 'sub_region';
	country?: { name?: string } | null;
	state?: { name?: string } | null;
	city?: { name?: string } | null;
	sub_region?: { name?: string } | null;
	photographers?: ApiPhotographer[] | null;
	featured_photographers?: ApiPhotographer[] | null;
	pricing?: {
		avg_low?: number | null;
		avg_high?: number | null;
		min?: number | null;
		max?: number | null;
		median?: number | null;
		count?: number | null;
	} | null;
}

export interface ApiPhotographer {
	name?: string;
	website?: string | null;
	description?: string | null;
	specialties?: string[] | null;
	price_range_low?: number | null;
	price_range_high?: number | null;
	rating?: number | null;
	review_count?: number | null;
	city_name?: string | null;
}

/** Location fields added to every directory output item. */
export function locationOf(page: ResolvedPage, path: string): IDataObject {
	const name = [page.sub_region, page.city, page.state, page.country]
		.map((place) => place?.name)
		.filter((placeName): placeName is string => !!placeName)
		.join(', ');
	return {
		locationPath: path,
		locationName: name,
		locationType: page.type ?? null,
		guideUrl: guideUrl(path),
	};
}
