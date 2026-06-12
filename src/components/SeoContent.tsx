import { GlassPanel } from "./GlassPanel";

/* Below-the-fold, crawlable content. Gives search engines real keyword context
   (screen sharing over WiFi, AirDrop for web, file transfer, etc.) and helps new
   users understand the app. Rendered in the SSR HTML. */

const STEPS = [
  {
    n: "1",
    title: "Open it on each device",
    body: "Open Share in Air in any browser on your phone, tablet, laptop or desktop — all on the same WiFi. No app to install and no sign-up.",
  },
  {
    n: "2",
    title: "Devices find each other",
    body: "Each device appears automatically as a tappable avatar. On a different network, share a room code or scan the QR to connect.",
  },
  {
    n: "3",
    title: "Share anything, instantly",
    body: "Present your screen or camera live, or send photos, files and text — peer-to-peer, with nothing uploaded to a server.",
  },
];

const FAQS = [
  {
    q: "Is Share in Air free?",
    a: "Yes — it is completely free and open source. There are no accounts, no ads and no limits.",
  },
  {
    q: "Do I need to install an app to share my screen?",
    a: "No. Share in Air runs entirely in your browser on desktop and mobile. You can optionally add it to your home screen as a PWA for one-tap access.",
  },
  {
    q: "Does it work on iPhone, Android, Windows and Mac?",
    a: "Yes. Any modern browser with WebRTC works — Chrome, Edge, Safari and Firefox — across phones, tablets, laptops and desktops.",
  },
  {
    q: "Is it like AirDrop or Snapdrop?",
    a: "It is an AirDrop-style tool for the web that also adds live screen and camera sharing. Devices on the same WiFi discover each other automatically, so you can send files or present in seconds.",
  },
  {
    q: "Are my screen and files uploaded to a server?",
    a: "No. Your screen, photos, files and text travel directly between devices over an encrypted peer-to-peer connection. Only a tiny connection handshake passes through a relay.",
  },
  {
    q: "Can I share my screen across different WiFi networks?",
    a: "Yes — create a room and share the code or QR. Anyone who opens the link can watch your screen, even from a different network.",
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

export function SeoContent() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="mx-auto mt-20 w-full max-w-4xl px-1 sm:mt-28"
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <h2
        id="how-it-works-heading"
        className="font-display text-center text-2xl font-semibold tracking-tight text-haze sm:text-3xl"
      >
        How to share your screen &amp; files over WiFi
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-mist sm:text-base">
        Share in Air is a free, open-source AirDrop and screen-mirror for the web — send a live
        screen, camera, photos, files or text to any device on your network, with no app and no
        account.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <GlassPanel key={s.n} className="rounded-2xl p-5">
            <span className="bg-ember-gradient flex size-9 items-center justify-center rounded-full font-display text-sm font-bold text-black">
              {s.n}
            </span>
            <h3 className="mt-3 text-base font-semibold text-haze">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-fog">{s.body}</p>
          </GlassPanel>
        ))}
      </div>

      <h2 className="font-display mt-16 text-center text-2xl font-semibold tracking-tight text-haze sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mx-auto mt-8 grid max-w-2xl gap-3">
        {FAQS.map((f) => (
          <GlassPanel key={f.q} as="details" className="group rounded-2xl px-5 py-4" sheen={false}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-haze marker:hidden">
              {f.q}
              <span className="text-fog transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2.5 text-sm leading-relaxed text-mist">{f.a}</p>
          </GlassPanel>
        ))}
      </div>
    </section>
  );
}
