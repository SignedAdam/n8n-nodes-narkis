import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { CURRENCY } from '../../shared/constants';
import { locationOf, type ResolvedPage } from '../../shared/directory';
import { priceRange, roundPrice } from '../../shared/format';
import { stripPromo } from '../../shared/policy';
import { assertOk, selectedPath, sendLocationPath } from '../../shared/transport';

const showOnlyForGetManyByLocation = {
	resource: ['photographer'],
	operation: ['getManyByLocation'],
};

/** One output item per listed photographer, with the place's city guide URL. */
async function toPhotographers(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const path = selectedPath.call(this);
	const page = assertOk.call(
		this,
		response,
		`Narkis has no photographer directory page for "${path}". The Location → Get Many operation lists every covered path.`,
	) as ResolvedPage;
	const location = locationOf(page, path);
	// City and neighborhood pages list every photographer; country and state
	// pages list featured photographers from their cities.
	const cityPage = page.type === 'city' || page.type === 'sub_region';
	const listings = (cityPage ? page.photographers : page.featured_photographers) ?? [];
	return listings.map((p) => ({
		json: {
			name: p.name ?? '',
			website: p.website || null,
			specialties: p.specialties ?? [],
			priceRange: priceRange(p.price_range_low, p.price_range_high),
			priceLow: roundPrice(p.price_range_low),
			priceHigh: roundPrice(p.price_range_high),
			currency: CURRENCY,
			rating: p.rating ?? null,
			reviewCount: p.review_count ?? null,
			description: stripPromo(p.description),
			city: p.city_name || (cityPage ? (page.city?.name ?? null) : null),
			...location,
		},
	}));
}

export const photographerDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['photographer'] } },
		options: [
			{
				name: 'Get Many by Location',
				value: 'getManyByLocation',
				action: 'Get photographers by location',
				description: 'Get headshot photographers listed for a country, state, city or neighborhood',
				routing: {
					request: {
						method: 'GET',
						url: '/api/seo/photographers/resolve',
						ignoreHttpStatusErrors: true,
					},
					send: { preSend: [sendLocationPath] },
					output: { postReceive: [toPhotographers] },
				},
			},
		],
		default: 'getManyByLocation',
	},
];

export const photographerLimitFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: showOnlyForGetManyByLocation },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { ...showOnlyForGetManyByLocation, returnAll: [false] } },
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		routing: { output: { maxResults: '={{$value}}' } },
	},
];
