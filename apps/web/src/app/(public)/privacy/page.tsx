import type { Metadata } from "next";
import { ContentPage } from "@/components/marketing/content-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <ContentPage eyebrow="Legal" title="Privacy Policy" updated="1 October 2026" intro="This is placeholder copy for the prototype and should be replaced with a policy reviewed by counsel before launch.">
      <section>
        <h2>Information we collect</h2>
        <ul>
          <li>Account details: name, email, phone number and role.</li>
          <li>Verification data: government ID, NIN and property documents you upload.</li>
          <li>Rental profile: employment and income details you choose to share with landlords.</li>
          <li>Usage data: searches, saved properties and device information.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>To verify identities and properties, match tenants with homes, process applications, prevent fraud and improve the service. We never sell your personal data.</p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>Under the Nigeria Data Protection Act 2023 you may access, correct or delete your personal data. Contact privacy@renton.ng.</p>
      </section>
    </ContentPage>
  );
}

