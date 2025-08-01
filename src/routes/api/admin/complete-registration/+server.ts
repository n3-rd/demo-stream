import { json } from '@sveltejs/kit';
import { generateUserName } from '$lib/helpers/generateUserName';
import { telnyxSMS } from '$lib/services/telnyx';
import { pb } from '$lib/pocketbase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.email || !data.phone || !data.company_name) {
      return json({
        success: false,
        message: 'Missing required registration data'
      }, { status: 400 });
    }

    // Retrieve the original registration data from verification record
    try {
      // Find the used verification record to get all registration data
      const verificationRecord = await pb.collection('admin_phone_verification')
        .getFirstListItem(
          `email = "${data.email}" && phone = "${data.phone}" && used = true`,
          { sort: '-created' }
        );

      if (!verificationRecord) {
        return json({
          success: false,
          message: 'Verification not found. Please start registration again.'
        }, { status: 400 });
      }

      // Check if user already exists
      try {
        const existingUser = await pb.collection('users').getFirstListItem(`email = "${data.email}"`);
        if (existingUser) {
          return json({
            success: false,
            message: 'An account with this email already exists'
          }, { status: 400 });
        }
      } catch (err) {
        // User doesn't exist, which is what we want
      }

      // Generate username
      const username = generateUserName(verificationRecord.company_name.split(' ').join('')).toLowerCase();
      const formattedPhone = telnyxSMS.formatPhoneNumber(verificationRecord.phone);

      // Create the company account using stored registration data
      const company = await pb.collection('users').create({
        username,
        company_name: verificationRecord.company_name,
        email: verificationRecord.email,
        password: verificationRecord.password,
        passwordConfirm: verificationRecord.password,
        phone: formattedPhone,
        phone_verified: true,
        company_website: verificationRecord.website || '',
      });

      console.log(`🎉 Admin account created successfully: ${verificationRecord.email} -> ${formattedPhone}`);

      // Auto-login the user
      await pb.collection('users').authWithPassword(verificationRecord.email, verificationRecord.password);

      // Set authentication cookies
      const authModel = pb.authStore.model;
      if (authModel) {
        // This mirrors what PocketBase does internally for auth
        locals.pb.authStore.save(pb.authStore.token, authModel);
      }

      return json({
        success: true,
        message: 'Account created successfully! Welcome to your dashboard.',
        user: {
          id: company.id,
          email: company.email,
          company_name: company.company_name,
          phone_verified: true
        }
      });

    } catch (error) {
      console.error('❌ Error completing registration:', error);
      
      // Check for specific PocketBase errors
      if (error.data?.data) {
        const errorData = error.data.data;
        if (errorData.email) {
          return json({
            success: false,
            message: 'An account with this email already exists'
          }, { status: 400 });
        }
        if (errorData.username) {
          return json({
            success: false,
            message: 'Username already taken. Please try again.'
          }, { status: 400 });
        }
      }

      return json({
        success: false,
        message: 'Failed to create account. Please try again.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in complete registration endpoint:', error);
    return json({
      success: false,
      message: 'Internal server error. Please try again.'
    }, { status: 500 });
  }
}; 