import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    try {
        const aiId = params.aiId;
        
        // In a real implementation, you would fetch the AI assistant data from your database
        // For now, we'll just create a sample AI assistant object
        
        const aiAssistant = {
            id: aiId,
            name: `AI Assistant Name ${aiId}`,
            created: '2024-02-23',
            knowledgeBase: [
                {
                    id: '1',
                    createDate: '2024-02-23',
                    fileName: '',
                    title: 'Add Name of Article'
                }
            ],
            engagement: [
                {
                    id: '1',
                    date: '2024-02-23',
                    interaction: '',
                    aiResponse: '',
                    training: ''
                }
            ]
        };
        
        return {
            aiAssistant
        };
    } catch (err) {
        console.error('Error loading AI assistant:', err);
        throw error(404, 'AI assistant not found');
    }
}; 