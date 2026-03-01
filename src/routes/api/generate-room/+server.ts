import { json } from '@sveltejs/kit';
import Replicate from 'replicate';
import { REPLICATE_API_TOKEN } from '$env/static/private';

export async function POST({ request }) {
    try {
        const formData = await request.formData();
        const image = formData.get('image');
        const roomType = formData.get('roomType');
        const designStyle = formData.get('designStyle');
        const userPrompt = formData.get('userPrompt');

        // Convert the image to a buffer/base64
        const buffer = await image.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        
        // Initialize Replicate client
        const replicate = new Replicate({
        auth: REPLICATE_API_TOKEN,
        });
        
        // Create the prediction
        const prediction = await replicate.predictions.create({
            model: "jschoormans/interior-v2",
            version: "8372bd24c6011ea957a0861f0146671eed615e375f038c13259c1882e3c8bac7",
            input: {
                image: `data:image/${image.type.split('/')[1]};base64,${base64Image}`,
                prompt: `${roomType}, ${designStyle}${userPrompt ? ', ' + userPrompt : ''}`,
                strength: 0.999999,
                max_resolution: 1051,
                controlnet_conditioning_scale: 0.03,
                negative_prompt: "(worst quality, low quality, illustration, 3d, 2d, painting, cartoons, sketch), open mouth",
                mask_prompt_furniture: "furniture, couch, table, chair, desk, bed, sofa, cupboard, shelf, cabinet, bookcase, dresser, nightstand, armchair, decoration, plant, flower, pillow, lamp, TV",
                guidance_scale: 7
            }
        });
        
        // Wait for the prediction to complete
        let result = await replicate.predictions.get(prediction.id);
        while (result.status !== "succeeded" && result.status !== "failed") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            result = await replicate.predictions.get(prediction.id);
        }
        
        if (result.status === "succeeded") {
            const outputUrl = result.output;
            return json({ success: true, imageUrl: outputUrl, predictionId: prediction.id });
        } else {
            throw new Error(`Prediction failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Error generating room design:', error);
        return json({ success: false, error: error.message }, { status: 500 });
    }
} 