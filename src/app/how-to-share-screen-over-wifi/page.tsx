import type { Metadata } from "next";
import { ContentShell } from "@/components/content/ContentShell";
import { Lead, H2, H3, P, UL, LI, CTA } from "@/components/content/prose";

const title = "How to share your screen over WiFi (no app) — step by step";
const description =
  "Share or mirror your screen over WiFi between phone, tablet, laptop and desktop — no app and no account. A free, peer-to-peer way to present your screen in any browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/how-to-share-screen-over-wifi" },
  openGraph: { title, description, url: "/how-to-share-screen-over-wifi", type: "article" },
};

const steps = [
  {
    name: "Open Share in Air on both devices",
    text: "On each device (phone, tablet or laptop) on the same WiFi, open share-in-air.vercel.app in any modern browser. No download or sign-up is needed.",
  },
  {
    name: "Let the devices find each other",
    text: "Each device appears automatically as a tappable circle. If they are on different networks, create a room and share the code or QR.",
  },
  {
    name: "Tap “Share my screen”",
    text: "Press Share my screen and choose the screen, window or tab you want to mirror. Your browser asks for permission first.",
  },
  {
    name: "The other device taps to watch",
    text: "Anyone nearby sees that you are presenting and taps Watch to view your live screen. Everything streams peer-to-peer over your WiFi.",
  },
];

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to share your screen over WiFi",
  description,
  totalTime: "PT1M",
  estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
  step: steps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
  })),
};

export default function Page() {
  return (
    <ContentShell>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />

      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-haze sm:text-4xl">
        How to share your screen over WiFi
      </h1>
      <Lead>
        You don&apos;t need AirPlay, a cable, an app or an account to put one screen on another
        device. With <strong className="text-haze">Share in Air</strong> — a free, open-source tool
        that runs in your browser — any two devices on the same WiFi can mirror a screen in seconds,
        peer-to-peer.
      </Lead>

      <H2 id="what-you-need">What you need</H2>
      <UL>
        <LI>Two devices (any mix of phone, tablet, laptop or desktop) on the same WiFi network.</LI>
        <LI>A modern browser on each — Chrome, Edge, Safari or Firefox all work.</LI>
        <LI>Nothing else. No install, no login, no cables.</LI>
      </UL>

      <H2 id="steps">Share your screen in 4 steps</H2>
      <ol className="mt-4 space-y-5">
        {steps.map((s, i) => (
          <li key={s.name} className="glass sheen flex gap-4 rounded-2xl p-5">
            <span className="bg-ember-gradient grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold text-black">
              {i + 1}
            </span>
            <div>
              <h3 className="text-base font-semibold text-haze">{s.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mist">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <H2 id="phone-to-laptop">Mirror your phone screen to a laptop (or the other way)</H2>
      <P>
        Because Share in Air works in the browser, screen sharing goes both ways across platforms.
        Present your <strong className="text-haze">Android or iPhone</strong> screen onto a Windows
        PC or Mac, or push your laptop screen onto a tablet — the steps are identical. The device
        that taps <em>Share my screen</em> is the presenter; everyone else taps <em>Watch</em>.
      </P>

      <H2 id="different-networks">Sharing across different WiFi networks</H2>
      <P>
        Same-WiFi devices find each other automatically. To share with someone on a different
        network, tap <strong className="text-haze">Invite</strong> while presenting (or open the Room
        panel), then send them the short room code or QR code. They open the link, tap your device
        and watch — no matter where they are.
      </P>

      <H2 id="more-than-screens">Send photos, files and text too</H2>
      <P>
        Screen sharing is only half of it. Tap a connected device to also send{" "}
        <strong className="text-haze">photos, any file, or text and links</strong>. Files transfer
        directly between devices with a live progress bar, and photos open instantly in a viewer on
        the other side.
      </P>

      <H2 id="is-it-private">Is screen sharing over WiFi private?</H2>
      <P>
        Yes. Share in Air is peer-to-peer: your screen, camera, photos, files and text travel{" "}
        <strong className="text-haze">directly between the two devices</strong> over an encrypted
        WebRTC connection. On the same WiFi they never leave your local network — only a tiny
        connection handshake passes through a relay. There are no uploads, no accounts and no ads.
      </P>

      <H3>Troubleshooting</H3>
      <UL>
        <LI>
          No device appears? Make sure both are on the <strong className="text-haze">same WiFi</strong>{" "}
          and the page is loaded on each. Give it a few seconds, or use a room code.
        </LI>
        <LI>
          The screen-permission prompt only appears after you tap <em>Share my screen</em> — that is
          the browser asking your consent to capture.
        </LI>
        <LI>
          Screen capture needs a secure page; the public site is served over HTTPS, so you&apos;re
          covered.
        </LI>
      </UL>

      <CTA />
    </ContentShell>
  );
}
