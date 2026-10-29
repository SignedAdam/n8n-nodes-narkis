import {
	NodeConnectionTypes,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { API_BASE_URL, USER_AGENT } from './shared/constants';
import { countryName, slugToName } from './shared/format';
import { locationFields } from './shared/locationFields';
import { loadPaths } from './shared/transport';
import { guideDescription } from './resources/guide';
import { locationDescription } from './resources/location';
import { photographerDescription, photographerLimitFields } from './resources/photographer';
import { priceDescription } from './resources/price';

/** Dropdown options for the direct children of a directory path ('' = countries). */
async function childOptions(
	this: ILoadOptionsFunctions,
	parent: string,
	emptyLabel?: string,
): Promise<INodePropertyOptions[]> {
	const depth = parent === '' ? 1 : parent.split('/').length + 1;
	const slugs = (await loadPaths.call(this))
		.filter(
			(path) =>
				path.split('/').length === depth && (parent === '' || path.startsWith(parent + '/')),
		)
		.map((path) => path.split('/')[depth - 1]);
	const options = slugs
		.map((slug) => ({ name: depth === 1 ? countryName(slug) : slugToName(slug), value: slug }))
		.sort((a, b) => a.name.localeCompare(b.name));
	return emptyLabel ? [{ name: emptyLabel, value: '' }, ...options] : options;
}

function slugParameter(this: ILoadOptionsFunctions, name: string): string {
	return String(this.getCurrentNodeParameter(name) ?? '')
		.trim()
		.toLowerCase();
}

export class Narkis implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Narkis',
		name: 'narkis',
		icon: { light: 'file:narkis.svg', dark: 'file:narkis.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Look up headshot photographers, listed photographer prices and photo guides from the public Narkis directory',
		defaults: {
			name: 'Narkis',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [],
		requestDefaults: {
			baseURL: API_BASE_URL,
			headers: {
				Accept: 'application/json',
				'User-Agent': USER_AGENT,
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Guide', value: 'guide' },
					{ name: 'Location', value: 'location' },
					{ name: 'Photographer', value: 'photographer' },
					{ name: 'Price', value: 'price' },
				],
				default: 'photographer',
			},
			...photographerDescription,
			...priceDescription,
			...locationDescription,
			...guideDescription,
			...locationFields,
			...photographerLimitFields,
		],
	};

	methods = {
		loadOptions: {
			async getCountries(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await childOptions.call(this, '');
			},
			async getStates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const country = slugParameter.call(this, 'country');
				if (!country) return [];
				return await childOptions.call(this, country, '(Whole Country)');
			},
			async getCities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const country = slugParameter.call(this, 'country');
				const state = slugParameter.call(this, 'state');
				if (!country || !state) return [];
				return await childOptions.call(this, `${country}/${state}`, '(Whole State)');
			},
			async getFilterStates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const country = slugParameter.call(this, 'filters.country');
				if (!country) return [];
				return await childOptions.call(this, country, '(All States)');
			},
		},
	};
}
