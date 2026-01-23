import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Home
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-slate-500 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
            <p className="text-slate-600 leading-7 mb-4">
              LaCleoOmnia ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Order Management System (OMS) platform, including our Shopify app integration.
            </p>
            <p className="text-slate-600 leading-7">
              By using our services, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-slate-800 mb-3">2.1 Account Information</h3>
            <p className="text-slate-600 leading-7 mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>Name and email address</li>
              <li>Password (encrypted and hashed)</li>
              <li>Company or store name</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-800 mb-3">2.2 Integration Data</h3>
            <p className="text-slate-600 leading-7 mb-4">
              When you connect your Shopify store or other marketplaces:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>Store domain and access tokens (encrypted)</li>
              <li>Order data (customer names, addresses, order details)</li>
              <li>Product and inventory information</li>
              <li>Webhook event data</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-800 mb-3">2.3 Usage Data</h3>
            <p className="text-slate-600 leading-7 mb-4">
              We automatically collect information about how you use our platform:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>IP address and browser type</li>
              <li>Pages visited and actions taken</li>
              <li>Timestamps and session data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-600 leading-7 mb-4">
              We use the collected information for:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Providing and maintaining our OMS services</li>
              <li>Processing and managing your orders</li>
              <li>Syncing inventory across connected marketplaces</li>
              <li>Generating shipping labels and tracking shipments</li>
              <li>Improving our platform and user experience</li>
              <li>Communicating with you about your account and services</li>
              <li>Detecting and preventing fraud or security issues</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Data Storage and Security</h2>
            <p className="text-slate-600 leading-7 mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
              <li>All access tokens and sensitive credentials are encrypted at rest</li>
              <li>Data transmission uses HTTPS/TLS encryption</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication requirements</li>
            </ul>
            <p className="text-slate-600 leading-7">
              Your data is stored on secure servers and databases. We retain your data only as long as necessary to provide our services or as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-slate-600 leading-7 mb-4">
              We do not sell your personal information. We may share your data only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Service Providers:</strong> With third-party services necessary to operate our platform (e.g., cloud hosting, payment processors)</li>
              <li><strong>Marketplace Integrations:</strong> Data is synced with your connected stores (Shopify, etc.) as part of our core functionality</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Your Rights and Choices</h2>
            <p className="text-slate-600 leading-7 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Access and review your personal data</li>
              <li>Update or correct inaccurate information</li>
              <li>Request deletion of your account and data</li>
              <li>Disconnect integrations at any time</li>
              <li>Opt-out of non-essential communications</li>
            </ul>
            <p className="text-slate-600 leading-7 mt-4">
              To exercise these rights, contact us at privacy@lacleoomnia.com or through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Cookies and Tracking</h2>
            <p className="text-slate-600 leading-7 mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Maintain your login session</li>
              <li>Remember your preferences</li>
              <li>Analyze platform usage</li>
            </ul>
            <p className="text-slate-600 leading-7 mt-4">
              You can control cookies through your browser settings, though this may affect platform functionality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Third-Party Services</h2>
            <p className="text-slate-600 leading-7 mb-4">
              Our platform integrates with third-party services:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Shopify:</strong> When you connect your Shopify store, their privacy policy also applies</li>
              <li><strong>Shipping Providers:</strong> Data is shared with courier services to generate labels and track shipments</li>
              <li><strong>Cloud Providers:</strong> We use secure cloud infrastructure for hosting</li>
            </ul>
            <p className="text-slate-600 leading-7 mt-4">
              We are not responsible for the privacy practices of third-party services. Please review their privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Children's Privacy</h2>
            <p className="text-slate-600 leading-7">
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. International Data Transfers</h2>
            <p className="text-slate-600 leading-7">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-slate-600 leading-7">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. You are advised to review this policy periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">12. Contact Us</h2>
            <p className="text-slate-600 leading-7 mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700 font-medium">LaCleoOmnia</p>
              <p className="text-slate-600">Email: privacy@lacleoomnia.com</p>
              <p className="text-slate-600">Support: support@lacleoomnia.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
