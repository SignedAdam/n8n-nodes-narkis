import {
	NodeOperationError,
	type DeclarativeRestApiSettings,
	type IDataObject,
	type IExecutePaginationFunctions,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';
import { GUIDE_PAGE_SIZE, MAX_GUIDE_PAGES, SITE_URL } from '../../shared/constants';
import { normalizeGuideSlug } from '../../shared/format';
import { assertOk } from '../../shared/transport';
import { cleanArticle, stripPromo } from '../../shared/policy';

const showOnlyForGuideGetMany = {
	resource: ['guide'],
	operation: ['getAll'],
};

interface ApiPost {
	slug?: string;
	title?: string;
	meta_description?: string | null;
	keywords?: string[] | null;
	category?: string | null;
	status?: string;
	published_at?: string | null;
	content?: string | null;
}

function guideSummary(post: ApiPost): IDataObject {
	return {
		slug: post.slug ?? '',
		title: post.title ?? '',
		summary: stripPromo(post.meta_description),
		url: `${SITE_URL}/blog/${post.slug ?? ''}`,
		category: post.category ?? null,
		keywords: post.keywords ?? [],
		publishedAt: post.published_at ?? null,
	};
}

/** Walks the paginated blog index until the limit or the last page is reached. */
async function paginateGuides(
	this: IExecutePaginationFunctions,
	requestData: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	const limit = returnAll ? Infinity : (this.getNodeParameter('limit', 50) as number);
	const perPage = Math.min(GUIDE_PAGE_SIZE, limit);
	const guides: INodeExecutionData[] = [];
	for (let page = 1; page <= MAX_GUIDE_PAGES && guides.length < limit; page++) {
		const body = (await this.helpers.httpRequest({
			...(requestData.options as IHttpRequestOptions),
			qs: { ...requestData.options.qs, page, per_page: perPage },
			json: true,
		})) as { posts?: ApiPost[]; pages?: number };
		const posts = body.posts ?? [];
		for (const post of posts) {
			if (post.status === 'published') guides.push({ json: guideSummary(post) });
		}
		if (posts.length === 0 || page >= (body.pages ?? 0)) break;
	}
	return guides.slice(0, limit);
}

/** Sets the request URL from the Guide Slug parameter. */
async function sendGuideSlug(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const raw = String(this.getNodeParameter('slug', ''));
	const slug = normalizeGuideSlug(raw);
	if (!slug) {
		throw new NodeOperationError(this.getNode(), `"${raw}" is not a valid guide slug`, {
			description: 'Use a slug such as linkedin-headshot-tips or a narkis.ai/blog URL.',
		});
	}
	requestOptions.url = `/api/blog/posts/${slug}`;
	return requestOptions;
}

/** The full guide as one item, with sales copy removed from the text. */
async function toGuide(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const raw = String(this.getNodeParameter('slug', ''));
	const notFound = `No published Narkis guide matches "${raw}". The Guide → Get Many operation lists every guide.`;
	const post = (assertOk.call(this, response, notFound).post ?? {}) as ApiPost;
	if (post.status !== 'published') {
		throw new NodeOperationError(this.getNode(), notFound);
	}
	return [{ json: { ...guideSummary(post), text: cleanArticle(post.content ?? '', SITE_URL) } }];
}

export const guideDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['guide'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a guide',
				description: 'Get the full text of a published photo guide',
				routing: {
					request: { method: 'GET', ignoreHttpStatusErrors: true },
					send: { preSend: [sendGuideSlug] },
					output: { postReceive: [toGuide] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many guides',
				description: 'List published photo guides, newest first',
				routing: {
					request: { method: 'GET', url: '/api/blog/posts' },
					send: { paginate: true },
					operations: { pagination: paginateGuides },
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Guide Slug or URL',
		name: 'slug',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['guide'], operation: ['get'] } },
		default: '',
		placeholder: 'linkedin-headshot-tips',
		description: 'Slug of the guide, as returned by Guide → Get Many, or its narkis.ai/blog URL',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: showOnlyForGuideGetMany },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { ...showOnlyForGuideGetMany, returnAll: [false] } },
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
	},
];
