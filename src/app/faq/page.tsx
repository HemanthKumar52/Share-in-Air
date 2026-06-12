import type { Metadata } from "next";
import { ContentShell } from "@/components/content/ContentShell";
import { Lead, CTA } from "@/components/content/prose";
import { GlassPanel } from "@/components/GlassPanel";

const title = "Share in Air FAQ — sharing screens & files over WiFi";
const description =
  "Answers about Share in Air: how to share your screen over WiFi, sending files with no app, AirDrop alternatives, privacy, supported devices and browsers, and more.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  openGraph: { title, description, url: "/faq", type: "article" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Share in Air?",
    a: "Share in Air is a free, open-source web app for sharing a live screen, camera, photos, files and text between devices on the same WiFi. It runs in any browser — no app and no account.",
  },
  {
    q: "How do I share my screen over WiFi?",
    a: "Open Share in Air on two devices on the same WiFi, tap “Share my screen”, choose a screen or window, and the other device taps Watch to view it live. The whole thing takes a few seconds.",
  },
  {
    q: "Do I need to install an app?",
    a: "No. Share in Air works entirely in your browser on phones, tablets, laptops and desktops. You can optionally add it to your home screen as a PWA for one-tap access.",
  },
  {
    q: "Which devices and browsers are supported?",
    a: "Any modern browser with WebRTC: Chrome, Edge, Safari and Firefox, on Windows, macOS, Linux, Android and iPhone/iPad.",
  },
  {
    q: "Is it like AirDrop or Snapdrop?",
    a: "Yes — it’s an AirDrop/Snapdrop-style tool for the web, but cross-platform and with live screen and camera sharing added. Devices on the same WiFi discover each other automatically.",
  },
  {
    q: "Can I use it as AirDrop for Windows or Android?",
    a: "Yes. There’s no official AirDrop for Windows or Android, so Share in Air fills that gap — send files and photos, or present your screen, between any mix of Windows, Mac, Android and iPhone.",
  },
  {
    q: "Are my screen and files uploaded to a server?",
    a: "No. Your screen, camera, photos, files and text travel directly between devices over an encrypted peer-to-peer connection. Only a tiny connection handshake passes through a relay; nothing is stored.",
  },
  {
    q: "Can I share across different WiFi networks?",
    a: "Yes. Create a room and share the short code or QR. Anyone who opens the link can connect and watch or receive, even from a different network.",
  },
  {
    q: "How large a file can I send?",
    a: "Files transfer directly between devices, so there’s no upload limit imposed by a server — you’re limited mainly by your devices and connection. A live progress bar shows the transfer.",
  },
  {
    q: "Is Share in Air free?",
    a: "Completely free and open source, with no ads, no accounts and no limits. The source is on GitHub.",
  },
  {
    q: "Does it work offline / on a local network only?",
    a: "Media and files always flow peer-to-peer and stay on your LAN. A small online relay is used only to introduce two devices to each other; you can self-host that part if you prefer total privacy.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Page() {
  return (
    <ContentShell>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-haze sm:text-4xl">
        Frequently asked questions
      </h1>
      <Lead>
        Everything about sharing your screen, photos, files and text over WiFi with Share in Air —
        the free, open-source, no-app way to send between devices.
      </Lead>

      <div className="mt-8 grid gap-3">
        {FAQS.map((f) => (
          <GlassPanel key={f.q} as="details" className="group rounded-2xl px-5 py-4" sheen={false}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-haze marker:hidden">
              {f.q}
              <span className="text-fog transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2.5 leading-relaxed text-mist">{f.a}</p>
          </GlassPanel>
        ))}
      </div>

      <CTA />
    </ContentShell>
  );
}
