import type { INodeProperties } from 'n8n-workflow';

const showForLocationOperations = {
	resource: ['photographer', 'price'],
	operation: ['getManyByLocation', 'getByLocation'],
};

/** Location inputs shared by Photographer → Get Many by Location and Price → Get by Location. */
export const locationFields: INodeProperties[] = [
	{
		displayName: 'Locate By',
		name: 'locateBy',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showForLocationOperations },
		options: [
			{
				name: 'Directory Path',
				value: 'path',
				description: 'A path such as us/texas/austin',
			},
			{
				name: 'Country, State and City',
				value: 'slugs',
				description: 'Pick the place from lists of covered locations',
			},
		],
		default: 'path',
	},
	{
		displayName: 'Directory Path',
		name: 'path',
		type: 'string',
		required: true,
		displayOptions: { show: { ...showForLocationOperations, locateBy: ['path'] } },
		default: '',
		placeholder: 'us/texas/austin',
		description:
			'Lowercase slugs separated by slashes: country, country/state, country/state/city or country/state/city/neighborhood. A narkis.ai city guide URL also works. The Location → Get Many operation lists every covered path.',
	},
	{
		displayName: 'Country Name or ID',
		name: 'country',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getCountries' },
		displayOptions: { show: { ...showForLocationOperations, locateBy: ['slugs'] } },
		default: '',
		description:
			'Country slug (ISO code such as us). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'State Name or ID',
		name: 'state',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStates', loadOptionsDependsOn: ['country'] },
		displayOptions: { show: { ...showForLocationOperations, locateBy: ['slugs'] } },
		default: '',
		description:
			'State or region slug such as texas. Leave empty for the whole country. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'City Name or ID',
		name: 'city',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCities', loadOptionsDependsOn: ['country', 'state'] },
		displayOptions: { show: { ...showForLocationOperations, locateBy: ['slugs'] } },
		default: '',
		description:
			'City slug such as austin. Leave empty for the whole state. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];
