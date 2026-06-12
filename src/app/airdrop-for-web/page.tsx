import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { ContentShell } from "@/components/content/ContentShell";
import { Lead, H2, P, UL, LI, CTA } from "@/components/content/prose";

const title = "AirDrop for the web — share files & screens on Windows, Android & Mac";
const description =
  "AirDrop only works between Apple devices. Share in Air is a free, open-source AirDrop alternative that runs in any browser — send files, photos, text and live screens across Windows, Mac, Android and iPhone over WiFi.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/airdrop-for-web" },
  openGraph: { title, description, url: "/airdrop-for-web", type: "article" },
};

const rows: { feature: string; air: boolean; airdrop: string }[] = [
  { feature: "Works in any browser (no app)", air: true, airdrop: "Apple only" },
  { feature: "Windows ↔ Android ↔ Mac ↔ iPhone", air: true, airdrop: "Apple ↔ Apple only" },
  { feature: "Live screen sharing", air: true, airdrop: "No" },
  { feature: "Camera sharing", air: true, airdrop: "No" },
  { feature: "Photos & files", air: true, airdrop: "Yes (Apple)" },
  { feature: "Text & links", air: true, airdrop: "Limited" },
  { feature: "Works across different networks (code/QR)", air: true, airdrop: "No" },
  { feature: "Free & open source", air: true, airdrop: "Closed" },
  { feature: "No account needed", air: true, airdrop: "Apple ID region" },
];

export default function Page() {
  return (
    <ContentShell>
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-haze sm:text-4xl">
        AirDrop for the web — on every device
      </h1>
      <Lead>
        Apple&apos;s AirDrop is great — if everyone has an Apple device. The moment a Windows PC or
        Android phone joins the room, it stops working.{" "}
        <strong className="text-haze">Share in Air</strong> is a free, open-source{" "}
        <strong className="text-haze">AirDrop alternative</strong> that runs in any browser, so you
        can send files, photos, text and even a live screen across{" "}
        <strong className="text-haze">Windows, Mac, Android and iPhone</strong> over your WiFi.
      </Lead>

      <H2 id="comparison">Share in Air vs AirDrop</H2>
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-white/5 text-fog">
              <th className="px-4 py-3 font-medium">Feature</th>
              <th className="px-3 py-3 text-center font-medium text-haze">Share in Air</th>
              <th className="px-3 py-3 text-center font-medium">AirDrop</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.feature} className="border-t border-white/[0.06]">
                <td className="px-4 py-3 text-mist">{r.feature}</td>
                <td className="px-3 py-3 text-center">
                  {r.air ? (
                    <Check className="mx-auto size-4 text-[var(--color-ok)]" />
                  ) : (
                    <X className="mx-auto size-4 text-fog" />
                  )}
                </td>
                <td className="px-3 py-3 text-center text-xs text-fog">{r.airdrop}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H2 id="windows-android">AirDrop for Windows and Android</H2>
      <P>
        There is no official AirDrop for Windows or Android — and that&apos;s exactly the gap Share
        in Air fills. Open the same link on your PC and your phone, and they discover each other on
        the WiFi automatically. Drag a file onto a device to send it, or present your screen for the
        others to watch. It&apos;s the cross-platform AirDrop the web has been missing.
      </P>

      <H2 id="snapdrop">A Snapdrop alternative — with screen sharing</H2>
      <P>
        If you&apos;ve used <strong className="text-haze">Snapdrop</strong> or PairDrop to beam files
        between devices, Share in Air will feel familiar — same instant, same-network discovery and
        peer-to-peer transfer. The difference: Share in Air also adds{" "}
        <strong className="text-haze">live screen and camera sharing</strong>, photo previews, and
        room codes for cross-network use, all in one open-source tool.
      </P>

      <H2 id="how-it-works">How it works</H2>
      <UL>
        <LI>Open Share in Air in a browser on each device on the same WiFi.</LI>
        <LI>Devices appear automatically — tap one to send files, photos or text.</LI>
        <LI>Tap “Share my screen” to present; others tap to watch.</LI>
        <LI>Different networks? Share a room code or QR to connect.</LI>
      </UL>
      <P>
        Everything is peer-to-peer over encrypted WebRTC — your data goes straight between devices,
        with nothing uploaded to a server.
      </P>

      <CTA />
    </ContentShell>
  );
}
