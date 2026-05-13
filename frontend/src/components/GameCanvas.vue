<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import type { Player, Board } from "@/types";

const props = defineProps<{
  players: Map<string, Player>;
  board: Board;
  myPlayerId: string | null;
  isConnected: boolean;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const logoImage = ref<HTMLImageElement | null>(null);
const logoLoaded = ref(false);
const coloredLogos = ref<Map<string, HTMLCanvasElement>>(new Map());

const fontFamily =
  getComputedStyle(document.documentElement).getPropertyValue("--font-family").trim() ||
  "sans-serif";

let lastUpdateTime = 0;
let cursorTimeout: number | null = null;
let lastPlayerCount = -1;

watch(
  () => props.players.size,
  (newSize, oldSize) => {
    if (oldSize === 0 && newSize > 0) {
      lastUpdateTime = 0;
      requestAnimationFrame(render);
    }
  },
);

watch(
  () => props.isConnected,
  (newVal, oldVal) => {
    if (newVal && !oldVal) {
      lastPlayerCount = -1;
      lastUpdateTime = 0;
      requestAnimationFrame(render);
    }
  },
);

function resizeCanvas() {
  const c = canvas.value;
  if (!c) return;
  const dpr = window.devicePixelRatio;
  c.width = c.offsetWidth * dpr;
  c.height = c.offsetHeight * dpr;

  if (props.players.size === 0) {
    lastPlayerCount = -1;
    requestAnimationFrame(render);
  }
}

function showCursor() {
  document.body.classList.remove("hide-cursor");
}

function hideCursor() {
  if (document.fullscreenElement) {
    document.body.classList.add("hide-cursor");
  }
}

function resetCursorTimer() {
  showCursor();
  if (cursorTimeout) clearTimeout(cursorTimeout);
  if (document.fullscreenElement) {
    cursorTimeout = window.setTimeout(hideCursor, 2000);
  }
}

function toggleFullscreen() {
  const gameArea = canvas.value;
  if (!gameArea) return;

  if (!document.fullscreenElement) {
    gameArea.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function getColoredLogo(color: string): HTMLCanvasElement {
  if (coloredLogos.value.has(color)) {
    return coloredLogos.value.get(color)!;
  }

  if (!logoImage.value) {
    const fallback = document.createElement("canvas");
    fallback.width = 20;
    fallback.height = 20;
    return fallback;
  }

  const w = logoImage.value.width;
  const h = logoImage.value.height;
  const offScr = document.createElement("canvas");
  offScr.width = w;
  offScr.height = h;
  const ctx = offScr.getContext("2d")!;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(logoImage.value, 0, 0, w, h);

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(logoImage.value, 0, 0, w, h);

  coloredLogos.value.set(color, offScr);
  return offScr;
}

function predictMovement(dt: number) {
  if (!props.board.width || !props.board.height) return;

  for (const player of props.players.values()) {
    player.pos.x += player.velocity.x * dt;
    player.pos.y += player.velocity.y * dt;
  }
}

function render(timestamp: number) {
  const ctx = canvas.value?.getContext("2d");
  if (!ctx || !canvas.value) return;

  if (lastUpdateTime === 0) lastUpdateTime = timestamp;
  const dt = (timestamp - lastUpdateTime) / 1000;
  lastUpdateTime = timestamp;

  predictMovement(dt);

  const { width, height } = canvas.value;
  ctx.clearRect(0, 0, width, height);

  const playersArr = Array.from(props.players.values());

  if (playersArr.length === 0) {
    if (lastPlayerCount !== 0) {
      lastPlayerCount = 0;
      requestAnimationFrame(render);
    }

    if (props.isConnected) {
      ctx.font = `${16 * window.devicePixelRatio}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillText("No one is here :(", width / 2, height / 2);
    }
    return;
  }

  lastPlayerCount = playersArr.length;

  const scaleX = width / props.board.width;
  const scaleY = height / props.board.height;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (width - props.board.width * scale) / 2;
  const offsetY = (height - props.board.height * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, props.board.width, props.board.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-1, -1, props.board.width + 2, props.board.height + 2);

  for (const player of playersArr) {
    if (!player.pos || !player.size || !player.color) continue;

    if (player.id === props.myPlayerId) {
      ctx.shadowColor = player.color;
      ctx.shadowBlur = 30 * scale;
    }

    const playerWidth = player.size.x || 20;
    const playerHeight = player.size.y || 20;

    if (logoLoaded.value) {
      ctx.drawImage(
        getColoredLogo(player.color),
        player.pos.x - playerWidth / 2,
        player.pos.y - playerHeight / 2,
        playerWidth,
        playerHeight,
      );
    } else {
      ctx.fillStyle = player.color;
      ctx.fillRect(
        player.pos.x - playerWidth / 2,
        player.pos.y - playerHeight / 2,
        playerWidth,
        playerHeight,
      );
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = `${player.id === props.myPlayerId ? "900 " : ""}${playerHeight / 4}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.shadowBlur = 0;
    ctx.fillText(player.nickname, player.pos.x, player.pos.y - playerHeight / 2 - 20);
  }

  ctx.restore();

  requestAnimationFrame(render);
}

onMounted(() => {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("mousemove", resetCursorTimer);
  document.addEventListener("fullscreenchange", resetCursorTimer);

  logoImage.value = new Image();
  logoImage.value.onload = () => {
    logoLoaded.value = true;
  };
  logoImage.value.src = "/dvd/static/img/DVD_logo.svg";

  requestAnimationFrame(render);
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeCanvas);
  document.removeEventListener("mousemove", resetCursorTimer);
  document.removeEventListener("fullscreenchange", resetCursorTimer);
});
</script>

<template>
  <div class="section game-area">
    <canvas ref="canvas" class="game-canvas" />
    <div class="game-overlay">
      <div class="overlay-element fullscreen-btn" @click="toggleFullscreen">⛶</div>
    </div>
  </div>
</template>

<style scoped>
.game-area {
  position: relative;
  min-height: 150px;
  padding: 0;
  width: 100%;
  height: 100%;
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.game-overlay {
  position: absolute;
  display: flex;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 20px;
}

.overlay-element {
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 12px;
  cursor: default;
  user-select: none;
  backdrop-filter: blur(8px);
}

.fullscreen-btn {
  margin-left: auto;
  cursor: pointer;
}

@media (max-width: 768px) {
  .game-area {
    aspect-ratio: 16 / 9;
  }
}
</style>
