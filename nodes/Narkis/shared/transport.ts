import {
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type IN8nHttpFullResponse,
	type ILoadOptionsFunctions,
	type JsonObject,
} from 'n8n-workflow';
import { API_BASE_URL, NICHE, USER_AGENT } from './constants';
import { normalizePath } from './format';

/**
 * Throws a readable error for a failed response. Requests are sent with
 * `ignoreHttpStatusErrors` so a 404 can explain what to do next.
 */
export function assertOk(
	this: IExecuteSingleFunctions,
	response: IN8nHttpFullResponse,
	notFound: string,
): IDataObject {
	const body = (response.body ?? {}) as IDataObject;
	if (response.statusCode < 400) return body;
	throw new NodeApiError(this.getNode(), body as JsonObject, {
		httpCode: String(response.statusCode),
		message:
			response.statusCode === 404 ? notFound : `Narkis API returned status ${response.statusCode}`,
		description: typeof body.message === 'string' ? body.message : undefined,
	});
}

/** Directory path selected by the "Location" parameters, normalized. */
export function selectedPath(this: IExecuteSingleFunctions): string {
	const locateBy = this.getNodeParameter('locateBy', 'path') as string;
	const raw =
		locateBy === 'slugs'
			? ['country', 'state', 'city']
					.map((name) => String(this.getNodeParameter(name, '') ?? '').trim())
					.filter((slug) => slug !== '')
					.join('/')
			: String(this.getNodeParameter('path', ''));
	const path = normalizePath(raw);
	if (!path) {
		throw new NodeOperationError(this.getNode(), `"${raw}" is not a valid directory path`, {
			description:
				'Use lowercase slugs separated by slashes, for example us/texas/austin. The Location → Get Many operation lists every covered path.',
		});
	}
	return path;
}

/** Pre-send hook: adds the niche and the selected directory path to the query. */
export async function sendLocationPath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.qs = { ...requestOptions.qs, niche: NICHE, path: selectedPath.call(this) };
	return requestOptions;
}

/** Every published directory path, for dropdowns. */
export async function loadPaths(this: ILoadOptionsFunctions): Promise<string[]> {
	const body = (await this.helpers.httpRequest({
		method: 'GET',
		url: `${API_BASE_URL}/api/seo/photographers/slugs`,
		qs: { niche: NICHE },
		headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
		json: true,
	})) as { path_entries?: Array<{ path?: string }> };
	return (body.path_entries ?? []).map((entry) => entry.path ?? '').filter((path) => path !== '');
}
