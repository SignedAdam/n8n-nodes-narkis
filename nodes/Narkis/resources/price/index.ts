import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { CURRENCY } from '../../shared/constants';
import { locationOf, type ResolvedPage } from '../../shared/directory';
import { priceRange, roundPrice } from '../../shared/format';
import { assertOk, selectedPath, sendLocationPath } from '../../shared/transport';

/** Listed price statistics of the photographers in a place, as one item. */
async function toPriceStats(
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
	const pricing = page.pricing ?? {};
	return [
		{
			json: {
				...locationOf(page, path),
				currency: CURRENCY,
				median: roundPrice(pricing.median),
				min: roundPrice(pricing.min),
				max: roundPrice(pricing.max),
				averageLow: roundPrice(pricing.avg_low),
				averageHigh: roundPrice(pricing.avg_high),
				averageRange: priceRange(pricing.avg_low, pricing.avg_high),
				photographersWithListedPrices: pricing.count ?? 0,
			},
		},
	];
}

export const priceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['price'] } },
		options: [
			{
				name: 'Get by Location',
				value: 'getByLocation',
				action: 'Get price stats by location',
				description:
					'Get median, lowest, highest and average listed headshot photographer prices for a place',
				routing: {
					request: {
						method: 'GET',
						url: '/api/seo/photographers/resolve',
						ignoreHttpStatusErrors: true,
					},
					send: { preSend: [sendLocationPath] },
					output: { postReceive: [toPriceStats] },
				},
			},
		],
		default: 'getByLocation',
	},
];
