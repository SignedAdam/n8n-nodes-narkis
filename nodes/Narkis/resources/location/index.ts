import type {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NICHE } from '../../shared/constants';
import { guideUrl, LEVELS } from '../../shared/format';
import { assertOk } from '../../shared/transport';

const showOnlyForLocationGetMany = {
	resource: ['location'],
	operation: ['getAll'],
};

interface PathEntry {
	path?: string;
	updated_at?: string;
}

/** One item per covered directory path, optionally filtered by country and state. */
async function toLocations(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = assertOk.call(this, response, 'The Narkis directory path list is unavailable');
	const filters = this.getNodeParameter('filters', {}) as IDataObject;
	const prefix = [filters.country, filters.country ? filters.state : undefined]
		.map((slug) =>
			String(slug ?? '')
				.trim()
				.toLowerCase(),
		)
		.filter((slug) => slug !== '')
		.join('/');
	const entries = (body.path_entries ?? []) as PathEntry[];
	return entries
		.filter((entry) => {
			const path = entry.path ?? '';
			return path !== '' && (prefix === '' || path === prefix || path.startsWith(prefix + '/'));
		})
		.map((entry) => {
			const path = entry.path as string;
			const [country, state, city, subRegion] = path.split('/');
			return {
				json: {
					path,
					level: LEVELS[path.split('/').length - 1] ?? null,
					country,
					state: state ?? null,
					city: city ?? null,
					subRegion: subRegion ?? null,
					guideUrl: guideUrl(path),
					updatedAt: entry.updated_at ?? null,
				},
			};
		});
}

export const locationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['location'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many locations',
				description: 'List the directory paths that have photographer listings',
				routing: {
					request: {
						method: 'GET',
						url: '/api/seo/photographers/slugs',
						qs: { niche: NICHE },
						ignoreHttpStatusErrors: true,
					},
					output: { postReceive: [toLocations] },
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: showOnlyForLocationGetMany },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { ...showOnlyForLocationGetMany, returnAll: [false] } },
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		routing: { output: { maxResults: '={{$value}}' } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: { show: showOnlyForLocationGetMany },
		default: {},
		options: [
			{
				displayName: 'Country Name or ID',
				name: 'country',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getCountries' },
				default: '',
				description:
					'Only paths in this country. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'State Name or ID',
				name: 'state',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getFilterStates',
					loadOptionsDependsOn: ['filters.country'],
				},
				default: '',
				description:
					'Only paths in this state or region; requires a country. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];
