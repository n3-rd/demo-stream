import { OPENAI_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { RequestHandler } from './$types';

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

const systemMessage = {
	role: 'system',
	content: 'You are a helpful assistant.'
};

export const POST: RequestHandler = async ({ request }) => {
	const { messages } = await request.json();

	const response = await openai.chat.completions.create({
		model: 'gpt-3.5-turbo',
		messages: [systemMessage, ...messages]
	});

	return json(response.choices[0].message);
};
