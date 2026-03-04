import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const SITE_NAME = "Throb.TV";
const CONTACT_EMAIL = "legal@throb.tv";
const EFFECTIVE_DATE = "March 4, 2026";

function PrivacyPolicy() {
  return (
    <>
      <h1 data-testid="text-page-title" className="text-3xl font-black mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Effective: {EFFECTIVE_DATE}</p>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">1. Introduction</h2>
        <p>{SITE_NAME} ("we," "us," or "our") operates an adult entertainment website. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website. By using the site, you consent to the practices described herein.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">2. Information We Collect</h2>
        <h3 className="text-lg font-semibold">2.1 Account Information</h3>
        <p>When you register, we collect your email address and a hashed version of your password. We do not store plain-text passwords.</p>
        <h3 className="text-lg font-semibold">2.2 Usage Data</h3>
        <p>We automatically collect information about your interaction with the site, including pages visited, videos viewed, search queries, watch history, playlist activity, and queue usage.</p>
        <h3 className="text-lg font-semibold">2.3 Device &amp; Connection Data</h3>
        <p>We may collect your IP address, browser type, operating system, device identifiers, and referring URLs for security and analytics purposes.</p>
        <h3 className="text-lg font-semibold">2.4 Cookies &amp; Session Data</h3>
        <p>We use session cookies to maintain your authenticated state. These cookies are essential for the site to function and cannot be disabled while using the service.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">3. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>To create and manage your account</li>
          <li>To provide, operate, and maintain the website</li>
          <li>To personalize your experience (e.g., watch history, playlists)</li>
          <li>To communicate with you regarding your account or changes to our policies</li>
          <li>To detect and prevent fraud, abuse, or security incidents</li>
          <li>To comply with legal obligations</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">4. Information Sharing</h2>
        <p>We do not sell, rent, or trade your personal information. We may share information with:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our website (hosting, analytics), bound by confidentiality obligations</li>
          <li><strong>Legal Requirements:</strong> When required by law, regulation, legal process, or governmental request</li>
          <li><strong>Safety:</strong> To protect the rights, property, or safety of {SITE_NAME}, our users, or others</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">5. Data Security</h2>
        <p>We implement industry-standard security measures including encrypted passwords (bcrypt hashing), secure session management, and HTTPS encryption. However, no method of electronic transmission or storage is 100% secure.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">6. Data Retention</h2>
        <p>We retain your account information for as long as your account is active. Watch history and usage data may be retained for up to 24 months. You may request deletion of your account and associated data at any time by contacting us.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">7. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to or restrict processing of your data</li>
          <li>Data portability</li>
        </ul>
        <p>To exercise these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">8. Children's Privacy</h2>
        <p>This website is intended exclusively for adults aged 18 years or older (or the age of majority in your jurisdiction). We do not knowingly collect information from anyone under 18. If we become aware that we have collected data from a minor, we will delete it immediately.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. Your continued use of the site after changes constitutes acceptance of the revised policy.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">10. Contact Us</h2>
        <p>If you have questions about this Privacy Policy, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.</p>
      </section>
    </>
  );
}

function TermsOfService() {
  return (
    <>
      <h1 data-testid="text-page-title" className="text-3xl font-black mb-2">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Effective: {EFFECTIVE_DATE}</p>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
        <p>By accessing or using {SITE_NAME} ("the Site"), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Site.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">2. Eligibility</h2>
        <p>You must be at least 18 years of age (or the age of majority in your jurisdiction, whichever is greater) to access or use this Site. By using the Site, you represent and warrant that you meet this age requirement. It is your responsibility to ensure that accessing adult content is legal in your jurisdiction.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">3. Account Registration</h2>
        <p>To access certain features, you must create an account. You agree to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide accurate and complete registration information</li>
          <li>Maintain the security and confidentiality of your login credentials</li>
          <li>Accept responsibility for all activity under your account</li>
          <li>Notify us immediately of any unauthorized use of your account</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">4. Content</h2>
        <h3 className="text-lg font-semibold">4.1 Third-Party Content</h3>
        <p>The Site aggregates and embeds video content from third-party sources. We do not host, produce, or upload video content. All embedded videos are the property of their respective owners and platforms.</p>
        <h3 className="text-lg font-semibold">4.2 No Endorsement</h3>
        <p>The inclusion of any content on the Site does not imply endorsement, sponsorship, or affiliation with the content creators or hosting platforms.</p>
        <h3 className="text-lg font-semibold">4.3 Content Accuracy</h3>
        <p>We make no representations or warranties about the accuracy, completeness, or reliability of any content available through the Site.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">5. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Use the Site for any unlawful purpose</li>
          <li>Access the Site if you are under the legal age in your jurisdiction</li>
          <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
          <li>Interfere with or disrupt the Site's functionality</li>
          <li>Use automated tools (bots, scrapers) to access the Site without permission</li>
          <li>Upload, share, or distribute any illegal content, including content depicting minors</li>
          <li>Harass, threaten, or abuse other users</li>
          <li>Circumvent any access controls or security measures</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">6. Intellectual Property</h2>
        <p>The Site's design, layout, code, and branding (excluding third-party embedded content) are owned by {SITE_NAME} and protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">7. Disclaimer of Warranties</h2>
        <p>THE SITE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED, SECURE, OR ERROR-FREE OPERATION.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">8. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, {SITE_NAME} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SITE, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, REVENUE, OR PROFITS.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">9. Indemnification</h2>
        <p>You agree to indemnify and hold harmless {SITE_NAME}, its operators, and affiliates from any claims, damages, losses, or expenses arising from your use of the Site or violation of these Terms.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">10. Termination</h2>
        <p>We reserve the right to suspend or terminate your account at any time, with or without cause or notice. Upon termination, your right to use the Site ceases immediately.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">11. Modifications</h2>
        <p>We may modify these Terms at any time. Changes take effect when posted. Continued use of the Site constitutes acceptance of the modified Terms.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">12. Governing Law</h2>
        <p>These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">13. Contact</h2>
        <p>For questions about these Terms, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.</p>
      </section>
    </>
  );
}

function DMCAPolicy() {
  return (
    <>
      <h1 data-testid="text-page-title" className="text-3xl font-black mb-2">DMCA / Copyright Policy</h1>
      <p className="text-muted-foreground mb-8">Effective: {EFFECTIVE_DATE}</p>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">1. Overview</h2>
        <p>{SITE_NAME} respects the intellectual property rights of others and expects users to do the same. We comply with the Digital Millennium Copyright Act (DMCA) and respond promptly to notices of alleged infringement.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">2. Third-Party Content</h2>
        <p>{SITE_NAME} does not host video content. All videos displayed on the Site are embedded from third-party platforms. If you believe that content accessible through our Site infringes your copyright, we will work to remove the relevant links and embeds from our platform promptly.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">3. Filing a DMCA Takedown Notice</h2>
        <p>To file a DMCA notice, please send a written communication to our designated agent that includes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>A physical or electronic signature of the copyright owner or authorized representative</li>
          <li>Identification of the copyrighted work(s) claimed to have been infringed</li>
          <li>Identification of the material on our Site that is alleged to be infringing, with sufficient detail for us to locate it (e.g., URLs)</li>
          <li>Your contact information (name, address, telephone number, and email)</li>
          <li>A statement that you have a good faith belief that the use of the material is not authorized by the copyright owner, its agent, or the law</li>
          <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">4. Designated Agent</h2>
        <p>Send DMCA notices to:</p>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p>DMCA Agent</p>
          <p>{SITE_NAME}</p>
          <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a></p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">5. Counter-Notification</h2>
        <p>If you believe your content was removed in error, you may submit a counter-notification containing:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your physical or electronic signature</li>
          <li>Identification of the material that was removed and its location before removal</li>
          <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake or misidentification</li>
          <li>Your name, address, telephone number, and a statement consenting to jurisdiction</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">6. Repeat Infringers</h2>
        <p>We will terminate access for users who are determined to be repeat infringers in appropriate circumstances.</p>
      </section>
    </>
  );
}

function ComplianceStatement() {
  return (
    <>
      <h1 data-testid="text-page-title" className="text-3xl font-black mb-2">18 U.S.C. § 2257 Compliance</h1>
      <p className="text-muted-foreground mb-8">Effective: {EFFECTIVE_DATE}</p>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">1. Exemption Statement</h2>
        <p>{SITE_NAME} is not a producer (primary or secondary) of any visual content displayed on this website. All video content accessible through the Site is embedded from and hosted by third-party websites and platforms.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">2. Third-Party Content</h2>
        <p>The operators of {SITE_NAME} are not the producers of any depictions of actual or simulated sexually explicit conduct that may appear on the Site. All such content is provided by and the responsibility of the third-party platforms that host it.</p>
        <p>The original producers of the content are responsible for maintaining records as required by 18 U.S.C. § 2257 and 28 C.F.R. Part 75. Compliance inquiries regarding the content should be directed to the respective hosting platforms and original content producers.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">3. Age Verification</h2>
        <p>{SITE_NAME} relies on the third-party content platforms to verify that all performers depicted in content are at least 18 years of age at the time of production. Each platform is responsible for maintaining appropriate records of age verification.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">4. Content Removal</h2>
        <p>If any content accessible through {SITE_NAME} is believed to violate 18 U.S.C. § 2257 or depict any individual under the age of 18, please contact us immediately at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>. We will remove access to such content from our platform immediately upon notification.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">5. User Responsibility</h2>
        <p>Users of {SITE_NAME} must be at least 18 years of age (or the age of majority in their jurisdiction). By using the Site, users confirm they are legally permitted to view adult content in their jurisdiction.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">6. Contact</h2>
        <p>For compliance inquiries, contact: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a></p>
      </section>
    </>
  );
}

const pages: Record<string, () => JSX.Element> = {
  privacy: PrivacyPolicy,
  terms: TermsOfService,
  dmca: DMCAPolicy,
  "2257": ComplianceStatement,
};

export default function Legal() {
  const params = useParams<{ page: string }>();
  const page = params.page || "terms";
  const PageComponent = pages[page];

  if (!PageComponent) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
          <Link href="/">
            <Button variant="outline" className="rounded-full">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4" />
              Back to Throb<span style={{ color: '#9ca3af' }}>.</span><span style={{ color: '#ef4444' }}>TV</span>
            </Button>
          </Link>
        </div>

        <article className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground">
          <PageComponent />
        </article>

        <footer className="mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link href="/legal/terms" className={`hover:text-foreground transition-colors ${page === 'terms' ? 'text-foreground' : ''}`} data-testid="link-terms">Terms of Service</Link>
            <Link href="/legal/privacy" className={`hover:text-foreground transition-colors ${page === 'privacy' ? 'text-foreground' : ''}`} data-testid="link-privacy">Privacy Policy</Link>
            <Link href="/legal/dmca" className={`hover:text-foreground transition-colors ${page === 'dmca' ? 'text-foreground' : ''}`} data-testid="link-dmca">DMCA Policy</Link>
            <Link href="/legal/2257" className={`hover:text-foreground transition-colors ${page === '2257' ? 'text-foreground' : ''}`} data-testid="link-2257">2257 Compliance</Link>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-4">&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
