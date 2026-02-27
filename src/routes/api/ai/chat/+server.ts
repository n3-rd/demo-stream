import { OPENAI_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/drizzle';
import { aiAssistants, contentLibrary } from '$lib/db/schema';
import { arrayContains, inArray } from 'drizzle-orm';
import mammoth from 'mammoth';

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY
});

async function getFileContent(
	fileRecord: typeof contentLibrary.$inferSelect,
	baseUrl: string,
	customFetch: typeof fetch
): Promise<string> {
	if (!fileRecord.file) return '';

	let fileUrl: string;
	if (fileRecord.file.startsWith('http')) {
		fileUrl = fileRecord.file;
	} else {
		fileUrl = `${baseUrl}/api/files/content_library/${fileRecord.id}/${fileRecord.file}`;
	}

	console.log(`Fetching file content from: ${fileUrl}`);

	try {
		const response = await customFetch(fileUrl);
		if (!response.ok) {
			console.error(`Failed to fetch file: ${fileUrl}`, await response.text());
			return '';
		}

		const buffer = await response.arrayBuffer();

		if (fileRecord.type === 'application/pdf') {
			const pdfjsLib = await import('pdfjs-dist');
			const doc = await pdfjsLib.default.getDocument(buffer).promise;
			let text = '';
			for (let i = 1; i <= doc.numPages; i++) {
				const page = await doc.getPage(i);
				const content = await page.getTextContent();
				text += content.items.map((item: any) => item.str).join(' ') + '\n';
			}
			return text;
		} else if (fileRecord.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
			const { value } = await mammoth.extractRawText({ buffer });
			return value;
		} else {
			// Plain text
			return new TextDecoder().decode(buffer);
		}
	} catch (error) {
		console.error(`Error processing file ${fileRecord.id}:`, error);
		return '';
	}
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	console.log('AI chat request received');
	const { messages, roomId, roomName } = await request.json();
	console.log(`Room ID: ${roomId}`, `Room Name: ${roomName}`);

	const baseUrl = new URL(request.url).origin;

	let systemPrompt = 'You are a helpful assistant. Answer the user\'s questions based on the context provided. If the context does not contain the answer, say that you don\'t know.';
	let contextContent = '';

	if (roomName) {
		const assistant = await db.query.aiAssistants.findFirst({
			where: arrayContains(aiAssistants.viewroomConnections, [roomName])
		});

		if (assistant) {
			console.log(`Found assistant: ${assistant.name}`);
			systemPrompt = assistant.systemPrompt || `You are ${assistant.name}, a helpful assistant. Answer the user\'s questions based on the context provided. If the context does not contain the answer, say that you don\'t know.`;

			if (assistant.trainingFiles && assistant.trainingFiles.length > 0) {
				console.log(`Found ${assistant.trainingFiles.length} training files.`);
				const fileRecords = await db.select().from(contentLibrary).where(inArray(contentLibrary.id, assistant.trainingFiles));

				for (const fileRecord of fileRecords) {
					console.log(`Processing file: ${fileRecord.title}`);
					const fileContent = await getFileContent(fileRecord, baseUrl, fetch);
					if (fileContent) {
						console.log(`Extracted content from ${fileRecord.title}:\n---\n${fileContent.substring(0, 500)}...\n---\n`);
						contextContent += fileContent + '\n\n';
					}
				}
			}
		} else {
			console.log('No assistant found for this room.');
		}
	}

	const systemMessage = {
		role: 'system' as const,
		content: `${systemPrompt}\n\nHere is the context:\n${contextContent}`
	};

	console.log(`Final system prompt: ${systemMessage.content}`);

	const response = await openai.chat.completions.create({
		model: 'gpt-3.5-turbo',
		messages: [systemMessage, ...messages]
	});

	console.log('OpenAI response received.');
	return json(response.choices[0].message);
};
