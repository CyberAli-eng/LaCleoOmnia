import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-8">
          Terms of Service
        </h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-slate-500 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-slate-600 leading-7 mb-4">
              By accessing or using LaCleoOmnia ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
            </p>
            <p className="text-slate-600 leading-7">
              These Terms apply to all users of the Service, including merchants, administrators, and any other users who access or use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
            <p className="text-slate-600 leading-7 mb-4">
              LaCleoOmnia is an Order Management System (OMS) that provides:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Unified order management across multiple marketplaces</li>
              <li>Inventory synchronization and tracking</li>
              <li>Shipping label generation and tracking</li>
              <li>Integration with e-commerce platforms (Shopify, etc.)</li>
              <li>Webhook processing and data normalization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Account Registration</h2>
            <p className="text-slate-600 leading-7 mb-4">
              To use our Service, you must:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>Create an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old or have parental consent</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
            <p className="text-slate-600 leading-7">
              You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Acceptable Use</h2>
            <p className="text-slate-600 leading-7 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Transmit any viruses, malware, or harmful code</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Impersonate any person or entity</li>
              <li>Collect or harvest information about other users</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Third-Party Integrations</h2>
            <p className="text-slate-600 leading-7 mb-4">
              Our Service integrates with third-party platforms (e.g., Shopify). When you connect these services:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>You grant us permission to access and use your data from these platforms</li>
              <li>You are responsible for maintaining valid credentials and permissions</li>
              <li>You must comply with the terms of service of third-party platforms</li>
              <li>We are not responsible for the availability or functionality of third-party services</li>
            </ul>
            <p className="text-slate-600 leading-7">
              You may disconnect integrations at any time through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Data and Content</h2>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">6.1 Your Data</h3>
            <p className="text-slate-600 leading-7 mb-4">
              You retain all rights to your data. By using the Service, you grant us a license to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>Store, process, and transmit your data to provide the Service</li>
              <li>Sync data with your connected marketplaces</li>
              <li>Generate reports and analytics</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-800 mb-3">6.2 Our Content</h3>
            <p className="text-slate-600 leading-7">
              All content, features, and functionality of the Service are owned by LaCleoOmnia and are protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Payment and Billing</h2>
            <p className="text-slate-600 leading-7 mb-4">
              If you subscribe to a paid plan:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Fees are billed in advance on a recurring basis</li>
              <li>All fees are non-refundable unless required by law</li>
              <li>You are responsible for any taxes applicable to your use of the Service</li>
              <li>We reserve the right to change pricing with 30 days' notice</li>
              <li>Failure to pay may result in suspension or termination of your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Service Availability</h2>
            <p className="text-slate-600 leading-7 mb-4">
              We strive to provide reliable service but do not guarantee:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Uninterrupted or error-free operation</li>
              <li>That the Service will meet your specific requirements</li>
              <li>That defects will be corrected</li>
            </ul>
            <p className="text-slate-600 leading-7 mt-4">
              We may perform scheduled maintenance and will provide notice when possible. We are not liable for any downtime or service interruptions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Limitation of Liability</h2>
            <p className="text-slate-600 leading-7 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND</li>
              <li>WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE</li>
              <li>WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES</li>
              <li>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRIOR TO THE CLAIM</li>
            </ul>
            <p className="text-slate-600 leading-7">
              Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability, so some of the above may not apply to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Indemnification</h2>
            <p className="text-slate-600 leading-7">
              You agree to indemnify and hold harmless LaCleoOmnia, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Service, violation of these Terms, or infringement of any rights of another.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Termination</h2>
            <p className="text-slate-600 leading-7 mb-4">
              Either party may terminate this agreement at any time:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>You may cancel your account at any time through your account settings</li>
              <li>We may suspend or terminate your account for violation of these Terms</li>
              <li>Upon termination, your right to use the Service immediately ceases</li>
              <li>We may delete your data after a reasonable retention period</li>
            </ul>
            <p className="text-slate-600 leading-7">
              Sections that by their nature should survive termination will remain in effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">12. Changes to Terms</h2>
            <p className="text-slate-600 leading-7">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mt-4">
              <li>Posting the updated Terms on this page</li>
              <li>Sending an email to your registered address</li>
              <li>Displaying a notice in the Service</li>
            </ul>
            <p className="text-slate-600 leading-7 mt-4">
              Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">13. Governing Law</h2>
            <p className="text-slate-600 leading-7">
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be resolved in the courts of [Your Jurisdiction].
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">14. Severability</h2>
            <p className="text-slate-600 leading-7">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">15. Entire Agreement</h2>
            <p className="text-slate-600 leading-7">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and LaCleoOmnia regarding the Service and supersede all prior agreements and understandings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">16. Contact Information</h2>
            <p className="text-slate-600 leading-7 mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700 font-medium">LaCleoOmnia</p>
              <p className="text-slate-600">Email: legal@lacleoomnia.com</p>
              <p className="text-slate-600">Support: support@lacleoomnia.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
