import type { Metadata } from "next";
import { ContentPage } from "@/components/marketing/content-page";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About renton"
      title="Connecting Nigerians at home with homes owned by Nigerians abroad"
      intro="Millions of Nigerians abroad own property at home. Millions at home need a good place to live. renton connects the two, and manages everything in between so nobody deals with landlord wahala."
    >
      <section>
        <h2>The problem</h2>
        <p>
          Renting in Lagos, Abuja or Port Harcourt often means dealing with an unreachable landlord, an overbearing caretaker, surprise levies and repairs that never get done. For Nigerians abroad, owning
          property at home means relying on relatives or middlemen, chasing rent across time zones and, too often, having their properties re-listed by fraudsters.
        </p>
      </section>
      <section>
        <h2>Our approach</h2>
        <ul>
          <li>We list homes owned by Nigerians in the diaspora, each one physically inspected and its title checked before it goes live.</li>
          <li>Every owner completes identity verification, so tenants know the home is genuine.</li>
          <li>renton manages the tenancy on the ground: rent collection, repairs and requests all go through one team.</li>
          <li>Tenants apply online with one reusable profile. No caretakers, no middlemen, no inspection fees.</li>
          <li>Owners abroad get rent statements, inspection reports and maintenance updates from anywhere in the world.</li>
        </ul>
      </section>
      <section>
        <h2>Where we operate</h2>
        <p>Lagos, Abuja, Port Harcourt, Enugu, Uyo and Benin City, with more cities coming soon.</p>
      </section>
    </ContentPage>
  );
}

