import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Bakked CRM',
  description: 'Privacy Policy for Bakked CRM WhatsApp Marketing Platform',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 5, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Bakked CRM (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates a customer relationship management 
              platform integrated with WhatsApp Business API. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Contact Information:</strong> Phone numbers, names, and other 
                contact details you provide or import into the CRM.
              </li>
              <li>
                <strong className="text-foreground">Customer Data:</strong> Tags, groups, dates of birth, 
                anniversaries, last visit dates, and other customer metadata you store.
              </li>
              <li>
                <strong className="text-foreground">Message Data:</strong> Message templates, campaign content, 
                and delivery status information.
              </li>
              <li>
                <strong className="text-foreground">Usage Information:</strong> How you interact with our platform, 
                including login times, features used, and actions taken.
              </li>
              <li>
                <strong className="text-foreground">WhatsApp Business Data:</strong> Message delivery statuses 
                (sent, delivered, read) received via WhatsApp Business API webhooks.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide and maintain our CRM service</li>
              <li>To send WhatsApp messages on your behalf through the WhatsApp Business API</li>
              <li>To track message delivery status and campaign performance</li>
              <li>To manage your customer contacts and segments</li>
              <li>To improve and optimize our platform</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">WhatsApp/Meta:</strong> Message content and recipient phone 
                numbers are shared with Meta&apos;s WhatsApp Business API to deliver messages.
              </li>
              <li>
                <strong className="text-foreground">Service Providers:</strong> We use Supabase for database 
                hosting and Render for application hosting.
              </li>
              <li>
                <strong className="text-foreground">Legal Requirements:</strong> When required by law or to 
                protect our legal rights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide you services. 
              Contact information, message logs, and campaign data are stored until you request deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your data, 
              including encryption in transit (HTTPS), secure database access controls, and regular security reviews.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Your Rights and Data Deletion</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">To request data deletion</strong>, please contact us at:{' '}
              <a href="mailto:privacy@bakked.in" className="text-primary hover:underline">
                privacy@bakked.in
              </a>
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              We will process your deletion request within 30 days and confirm once completed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service integrates with the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>
                <strong className="text-foreground">WhatsApp Business API (Meta):</strong>{' '}
                <a href="https://www.whatsapp.com/legal/privacy-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  WhatsApp Privacy Policy
                </a>
              </li>
              <li>
                <strong className="text-foreground">Supabase:</strong>{' '}
                <a href="https://supabase.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Supabase Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <ul className="list-none pl-0 space-y-1 text-muted-foreground mt-4">
              <li>Email: <a href="mailto:privacy@bakked.in" className="text-primary hover:underline">privacy@bakked.in</a></li>
              <li>Business: Bakked</li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Bakked. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
