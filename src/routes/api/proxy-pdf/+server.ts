import type { RequestHandler } from '@sveltejs/kit';

const ALLOWED_ORIGINS = [
	'viewroom.b-cdn.net'
];

function isAllowedUrl(urlStr: string): boolean {
	try {
		const u = new URL(urlStr);
		return u.protocol === 'https:' && ALLOWED_ORIGINS.includes(u.hostname);
	} catch {
		return false;
	}
}

export const GET: RequestHandler = async ({ url: requestUrl }) => {
	const target = requestUrl.searchParams.get('url');
	if (!target || !isAllowedUrl(target)) {
		return new Response('Bad Request', { status: 400 });
	}

	const res = await fetch(target);

	if (!res.ok) {
		return new Response(res.statusText, { status: res.status });
	}

	const contentType = res.headers.get('content-type') || 'application/octet-stream';
	return new Response(res.body, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=300'
		}
	});
};
