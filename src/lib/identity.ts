import type { DeviceKind, PeerIdentity } from "./types";

/* Friendly handle generation + device detection. The cosmetic half (name, colour,
   glyph) is sticky per-browser so a device keeps the same identity across reloads;
   the routing `id` is fresh per tab so two tabs on one machine never collide. */

const ADJECTIVES = [
  "Amber", "Cobalt", "Crimson", "Golden", "Velvet", "Solar", "Lunar", "Coral",
  "Ivory", "Onyx", "Jade", "Saffron", "Indigo", "Copper", "Frost", "Ember",
  "Misty", "Silver", "Scarlet", "Azure", "Hazel", "Cosmic", "Plum", "Teal",
  "Marble", "Glacier", "Sunlit", "Dusky", "Nimbus", "Quartz",
];

const CREATURES = [
  "Falcon", "Otter", "Lynx", "Heron", "Fox", "Marten", "Ibis", "Panther",
  "Dolphin", "Raven", "Gazelle", "Comet", "Albatross", "Wolf", "Manta", "Owl",
  "Stingray", "Cobra", "Puffin", "Mantis", "Tiger", "Sparrow", "Bison", "Koi",
  "Lemur", "Macaw", "Narwhal", "Orca", "Phoenix", "Viper",
];

const COLORS = [
  "#FF7A1A", "#FF5E3A", "#FFB661", "#4A6CF7", "#38E0C8", "#3DDC97",
  "#FFC24B", "#F45D9C", "#A77BFF", "#56C2FF", "#FF8A5B", "#7BE0A3",
];

const EMOJI = ["🦊", "🦦", "🐱", "🐦", "🦅", "🐺", "🐬", "🦉", "🐯", "🦜", "🐙", "🦚", "🦋", "🐢", "🦌", "🦩"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function detectDevice(): DeviceKind {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  // Prefer the structured hint when available.
  const data = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  const isTablet = /iPad/i.test(ua) || (/(Android)/i.test(ua) && !/Mobile/i.test(ua));
  const isMobile = /iPhone|Android.*Mobile|Windows Phone|webOS|BlackBerry/i.test(ua) || data?.mobile;
  if (isTablet) return "tablet";
  if (isMobile) return "mobile";
  // Touch laptops vs desktops: a coarse pointer + no touch usually means desktop.
  if (typeof matchMedia !== "undefined" && matchMedia("(pointer: fine)").matches) {
    return /Macintosh|Mac OS X/i.test(ua) ? "laptop" : "desktop";
  }
  return "desktop";
}

interface Cosmetic {
  name: string;
  color: string;
  emoji: string;
}

const COSMETIC_KEY = "air:cosmetic";
const ID_KEY = "air:id";

function loadCosmetic(): Cosmetic {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(COSMETIC_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Cosmetic;
        if (parsed?.name && parsed?.color && parsed?.emoji) return parsed;
      }
    } catch {
      /* ignore */
    }
  }
  const cosmetic: Cosmetic = {
    name: `${pick(ADJECTIVES)} ${pick(CREATURES)}`,
    color: pick(COLORS),
    emoji: pick(EMOJI),
  };
  try {
    localStorage?.setItem(COSMETIC_KEY, JSON.stringify(cosmetic));
  } catch {
    /* ignore */
  }
  return cosmetic;
}

function loadId(): string {
  if (typeof sessionStorage !== "undefined") {
    try {
      const existing = sessionStorage.getItem(ID_KEY);
      if (existing) return existing;
      const fresh = makeId();
      sessionStorage.setItem(ID_KEY, fresh);
      return fresh;
    } catch {
      /* ignore */
    }
  }
  return makeId();
}

/** Build (or restore) this session's identity. Client-side only. */
export function createIdentity(): PeerIdentity {
  const cosmetic = loadCosmetic();
  return {
    id: loadId(),
    name: cosmetic.name,
    device: detectDevice(),
    color: cosmetic.color,
    emoji: cosmetic.emoji,
  };
}

/** Re-roll the cosmetic identity (new name/colour/glyph), keeping the routing id. */
export function rerollCosmetic(): Cosmetic {
  const cosmetic: Cosmetic = {
    name: `${pick(ADJECTIVES)} ${pick(CREATURES)}`,
    color: pick(COLORS),
    emoji: pick(EMOJI),
  };
  try {
    localStorage?.setItem(COSMETIC_KEY, JSON.stringify(cosmetic));
  } catch {
    /* ignore */
  }
  return cosmetic;
}
