<script lang="ts">
  import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
  <title>Privacy Policy - ViewRoom by ClearSky Software</title>
  <meta name="description" content="ViewRoom Privacy Policy. Learn how ClearSky Software collects, uses, and protects your information." />
</svelte:head>

<div class="min-h-screen bg-slate-50 flex flex-col items-center py-16 px-4 md:px-8">
  <div class="max-w-4xl w-full">
    <!-- Header Card -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 mb-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div class="relative z-10">
        <div class="mb-10 flex justify-center">
          <img src="/logo/main-logo.svg" alt="ViewRoom Logo" class="h-12" />
        </div>

        <h1 class="text-4xl md:text-5xl font-extrabold mb-4 text-slate-900 tracking-tight text-center">Privacy Policy</h1>
        <div class="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6 text-slate-500 font-medium text-sm">
          <span><strong>App:</strong> ViewRoom by ClearSky Software</span>
          <span class="hidden md:inline text-slate-300">•</span>
          <span><strong>Last Updated:</strong> March 20, 2026</span>
          <span class="hidden md:inline text-slate-300">•</span>
          <span><strong>Effective Date:</strong> March 20, 2026</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
      <div class="prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-900 prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        
        <p class="text-lg leading-relaxed mb-10 pb-8 border-b border-slate-100">
          ClearSky Software ("we," "our," or "us") operates the ViewRoom mobile application and web platform (collectively, the "Service"). This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our Service. ViewRoom is a business communication platform that enables real estate representatives to conduct live virtual property viewings with clients through video streaming and real-time collaboration. By using ViewRoom, you agree to the collection and use of information in accordance with this Privacy Policy.
        </p>

        <section class="mb-12">
          <h2 id="1-introduction" class="text-2xl mt-0">1. Introduction</h2>
          <p>
            This Privacy Policy governs your access to and use of ViewRoom. We are committed to protecting your privacy and ensuring that your personal information is handled safely and responsibly.
          </p>
        </section>

        <section class="mb-12">
          <h2 id="2-information-we-collect">2. Information We Collect</h2>
          
          <h3 class="text-xl">2.1 Information You Provide</h3>
          <ul class="space-y-2">
            <li><strong>Account Information:</strong> Name, email address, phone number, and company/organization name provided during account registration via the web portal.</li>
            <li><strong>Authentication Data:</strong> Login credentials and one-time passcodes (OTP) used for account verification.</li>
            <li><strong>Chat Messages:</strong> Text messages sent through the in-app chat feature during live viewing sessions.</li>
            <li><strong>Appointment Data:</strong> Scheduling information including dates, times, and room selections for property viewing appointments.</li>
          </ul>

          <h3 class="text-xl mt-8">2.2 Information Collected Automatically</h3>
          <ul class="space-y-2">
            <li><strong>Device Information:</strong> Device model, operating system version, unique device identifiers, and app version.</li>
            <li><strong>Camera and Microphone Data:</strong> Video and audio streams captured during live viewing sessions. This data is transmitted in real-time and is not stored on our servers after the session ends.</li>
            <li><strong>Usage Data:</strong> App interaction data including features used, session duration, and navigation patterns.</li>
            <li><strong>Push Notification Tokens:</strong> Firebase Cloud Messaging (FCM) tokens used to deliver push notifications to your device.</li>
            <li><strong>Cookies and Session Data:</strong> Authentication cookies used to maintain your logged-in session across app usage.</li>
          </ul>

          <h3 class="text-xl mt-8">2.3 Information We Do Not Collect</h3>
          <ul class="space-y-2">
            <li>We do not collect precise GPS location data.</li>
            <li>We do not collect financial or payment information.</li>
            <li>We do not access contacts, calendars, or other personal data on your device beyond camera and microphone permissions.</li>
          </ul>
        </section>

        <section class="mb-12">
          <h2 id="3-how-we-use-your-information">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul class="space-y-2">
            <li><strong>Provide the Service:</strong> Enable live video streaming, real-time chat, appointment scheduling, and property content viewing.</li>
            <li><strong>Authenticate Users:</strong> Verify your identity through phone-based OTP authentication.</li>
            <li><strong>Send Notifications:</strong> Deliver appointment reminders, session invitations, and service updates via push notifications.</li>
            <li><strong>Improve the Service:</strong> Analyze usage patterns to enhance app performance, fix bugs, and develop new features.</li>
            <li><strong>Ensure Security:</strong> Monitor for unauthorized access, fraud, and other security threats.</li>
          </ul>
        </section>

        <section class="mb-12">
          <h2 id="4-how-we-share-your-information">4. How We Share Your Information</h2>
          <p>We do not sell, rent, or trade your personal information. We may share your information with the following parties:</p>

          <h3 class="text-xl">4.1 Service Providers</h3>
          <p>
            <strong>Firebase (Google LLC):</strong> We use Firebase for push notifications (Firebase Cloud Messaging), crash reporting, and credential storage (Cloud Firestore). Google's privacy policy applies to data processed by Firebase services. See: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>
          </p>
          <p>
            <strong>Ant Media Server:</strong> We use Ant Media Server for WebRTC-based real-time video streaming. Video and audio streams are transmitted through Ant Media's infrastructure during live sessions. Stream data is not permanently stored.
          </p>

          <h3 class="text-xl mt-8">4.2 Business Partners</h3>
          <p>
            Your employer or organization that has engaged ClearSky Software's services may have access to usage data and session information related to your professional activities on the platform.
          </p>

          <h3 class="text-xl mt-8">4.3 Legal Requirements</h3>
          <p>
            We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court order or government agency).
          </p>
        </section>

        <section class="mb-12">
          <h2 id="5-data-storage-and-security">5. Data Storage and Security</h2>
          <ul class="space-y-2">
            <li><strong>Storage Location:</strong> Your data is stored on secure servers located in Canada and/or the United States.</li>
            <li><strong>Security Measures:</strong> We implement industry-standard security measures including encrypted data transmission (TLS/SSL), secure authentication mechanisms, and access controls to protect your personal information.</li>
            <li><strong>Session Data:</strong> Authentication session data is stored locally on your device using encrypted storage and is cleared upon logout.</li>
            <li><strong>Video Streams:</strong> Live video and audio streams are transmitted in real-time via encrypted WebRTC connections and are not recorded or stored on our servers unless explicitly enabled by the session host.</li>
          </ul>
        </section>

        <section class="mb-12">
          <h2 id="6-data-retention">6. Data Retention</h2>
          <ul class="space-y-2">
            <li><strong>Account Data:</strong> We retain your account information for as long as your account is active or as needed to provide the Service.</li>
            <li><strong>Chat Messages:</strong> Session chat messages are retained for the duration of the live session and may be stored for up to 30 days for quality assurance purposes.</li>
            <li><strong>Usage Logs:</strong> Anonymized usage data may be retained for up to 12 months for analytics and service improvement.</li>
            <li><strong>Deleted Accounts:</strong> Upon account deletion, we will delete or anonymize your personal information within 30 days, except where retention is required by law.</li>
          </ul>
        </section>

        <section class="mb-12">
          <h2 id="7-your-rights-and-choices">7. Your Rights and Choices</h2>
          
          <h3 class="text-xl">7.1 Account Deletion</h3>
          <p>You may delete your account at any time through:</p>
          <ul class="space-y-2">
            <li><strong>In-App:</strong> Navigate to the app menu and select "Delete Account." A verification code will be sent to your registered phone number to confirm the deletion.</li>
            <li><strong>Web Portal:</strong> Visit <a href="https://viewroom.ca/delete-representative">https://viewroom.ca/delete-representative</a> to request account deletion.</li>
          </ul>
          <p>Upon deletion, all your personal data will be permanently removed from our systems within 30 days.</p>

          <h3 class="text-xl mt-8">7.2 Access and Correction</h3>
          <p>You have the right to:</p>
          <ul class="space-y-2">
            <li>Access the personal information we hold about you.</li>
            <li>Request correction of inaccurate or incomplete information.</li>
            <li>Request a copy of your data in a portable format.</li>
          </ul>
          <p>To exercise these rights, contact us at the email address listed in Section 12.</p>

          <h3 class="text-xl mt-8">7.3 Push Notifications</h3>
          <p>You can opt out of push notifications at any time through your device's notification settings.</p>

          <h3 class="text-xl mt-8">7.4 Camera and Microphone</h3>
          <p>Camera and microphone access is required only during live viewing sessions. You can revoke these permissions at any time through your device settings, though this will prevent you from participating in live sessions.</p>
        </section>

        <section class="mb-12">
          <h2 id="8-children-privacy">8. Children's Privacy</h2>
          <p>
            ViewRoom is intended for use by individuals aged 18 and older. We do not knowingly collect personal information from anyone under the age of 18. If we become aware that we have collected personal information from a minor, we will take steps to delete that information promptly.
          </p>
        </section>

        <section class="mb-12">
          <h2 id="9-canadian-privacy-law-pipeda">9. Canadian Privacy Law (PIPEDA)</h2>
          <p>
            ClearSky Software is a Canadian company and complies with the Personal Information Protection and Electronic Documents Act (PIPEDA). In accordance with PIPEDA:
          </p>
          <ul class="space-y-2">
            <li>We obtain meaningful consent before collecting, using, or disclosing your personal information.</li>
            <li>We collect only the personal information necessary for the purposes identified.</li>
            <li>We use and disclose personal information only for the purposes for which it was collected, unless we obtain further consent.</li>
            <li>We retain personal information only as long as necessary to fulfill the identified purposes.</li>
            <li>We keep personal information accurate, complete, and up to date.</li>
            <li>We protect personal information with appropriate security safeguards.</li>
            <li>You have the right to access your personal information held by us and to challenge its accuracy.</li>
          </ul>
          <p>To file a privacy complaint or inquiry under PIPEDA, you may also contact the Office of the Privacy Commissioner of Canada at <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">www.priv.gc.ca</a>.</p>
        </section>

        <section class="mb-12">
          <h2 id="10-international-data-transfers">10. International Data Transfers</h2>
          <p>
            If you are accessing our Service from outside Canada, please be aware that your information may be transferred to, stored, and processed in Canada and other jurisdictions where our service providers operate. By using the Service, you consent to the transfer of your information to these jurisdictions.
          </p>
        </section>

        <section class="mb-12">
          <h2 id="11-changes-to-this-privacy-policy">11. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by:</p>
          <ul class="space-y-2">
            <li>Posting the updated Privacy Policy on our website.</li>
            <li>Updating the "Last Updated" date at the top of this policy.</li>
            <li>Sending a push notification or in-app notice for significant changes.</li>
          </ul>
          <p>We encourage you to review this Privacy Policy periodically for any changes.</p>
        </section>

        <section class="mb-12">
          <h2 id="12-contact-us">12. Contact Us</h2>
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:</p>
          <div class="not-prose bg-slate-50 border border-slate-200 rounded-xl p-6 mt-4">
            <h4 class="font-bold text-slate-900 mb-1">ClearSky Software</h4>
            <p class="text-slate-600">Email: <a href="mailto:privacy@viewroom.ca" class="text-primary hover:underline">privacy@viewroom.ca</a></p>
          </div>
        </section>

        <hr class="my-12 border-slate-100" />

        <p class="text-sm italic text-slate-400 text-center">
          This Privacy Policy is provided in compliance with the Apple App Store Review Guidelines (Section 5.1.1), Google Play Developer Policy, and the Personal Information Protection and Electronic Documents Act (PIPEDA) of Canada.
        </p>
      </div>
    </div>

    <div class="mt-12 mb-16 flex justify-center">
      <Button href="/" variant="outline" class="rounded-full px-8">Return to Home</Button>
    </div>
  </div>
</div>

