import { json } from '@sveltejs/kit';
import { telnyxSMS } from '$lib/services/telnyx';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  if (!dev) {
    return json({ error: 'Mock SMS is only available in development mode' }, { status: 403 });
  }

  try {
    const mockCodes = telnyxSMS.getMockSMSCodes();
    return json({
      success: true,
      codes: mockCodes,
      count: mockCodes.length
    });
  } catch (error) {
    console.error('❌ Error getting mock SMS codes:', error);
    return json({ error: 'Failed to get mock SMS codes' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async () => {
  if (!dev) {
    return json({ error: 'Mock SMS is only available in development mode' }, { status: 403 });
  }

  try {
    telnyxSMS.clearMockSMSCodes();
    return json({
      success: true,
      message: 'Mock SMS codes cleared'
    });
  } catch (error) {
    console.error('❌ Error clearing mock SMS codes:', error);
    return json({ error: 'Failed to clear mock SMS codes' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  if (!dev) {
    return json({ error: 'Mock SMS is only available in development mode' }, { status: 403 });
  }

  try {
    const { phone } = await request.json();
    
    if (!phone) {
      return json({ error: 'Phone number is required' }, { status: 400 });
    }

    const code = telnyxSMS.getLatestCodeForPhone(phone);
    
    return json({
      success: true,
      phone,
      code,
      found: !!code
    });
  } catch (error) {
    console.error('❌ Error getting code for phone:', error);
    return json({ error: 'Failed to get code for phone' }, { status: 500 });
  }
}; 