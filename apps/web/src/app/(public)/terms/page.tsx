import type { Metadata } from "next";
import { ContentPage } from "@/components/marketing/content-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <ContentPage eyebrow="Legal" title="Terms of Service" updated="1 October 2026" intro="This is placeholder copy for the prototype and should be replaced with terms reviewed by counsel before launch.">
      <section>
        <h2>Using renton</h2>
        <p>You must be at least 18 and provide accurate information. Landlords must have the legal right to let the properties they list.</p>
      </section>
      <section>
        <h2>Verification</h2>
        <p>A Verified badge means a listing passed our checks at the time of verification. It is not a guarantee of future condition, and tenants should still inspect before signing.</p>
      </section>
      <section>
        <h2>Payments</h2>
        <ul>
          <li>Never pay inspection fees or rent outside the platform.</li>
          <li>Service fees are shown before you commit to a lease.</li>
        </ul>
      </section>
      <section>
        <h2>Prohibited conduct</h2>
        <p>Fake listings, impersonation, harassment and off-platform payment requests lead to immediate suspension.</p>
      </section>
    </ContentPage>
  );
}

