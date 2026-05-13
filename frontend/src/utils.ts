export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const adjectives = [
  "Swift",
  "Bouncy",
  "Lightning",
  "Neon",
  "Cosmic",
  "Stellar",
  "Rapid",
  "Dynamic",
];
const nouns = ["Ball", "Sphere", "Orb", "Comet", "Star", "Bolt", "Flash", "Rocket"];
const colors = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#feca57",
  "#ff9ff3",
  "#54a0ff",
  "#5f27cd",
];

export const generateRandomUser = () => ({
  nickname:
    adjectives[Math.floor(Math.random() * adjectives.length)]! +
    nouns[Math.floor(Math.random() * nouns.length)]! +
    Math.floor(Math.random() * 999),
  color: colors[Math.floor(Math.random() * colors.length)]!,
});
