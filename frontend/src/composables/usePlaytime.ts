import { ref, onUnmounted } from "vue";
import { formatTime } from "@/utils";

export function usePlaytime() {
  const playtimeStart = ref<number | null>(null);
  const playtimeDisplay = ref(formatTime(0));
  const playtimeInterval = ref<number | null>(null);

  function start() {
    playtimeStart.value = performance.now();
    playtimeDisplay.value = formatTime(0);

    const tick = () => {
      if (!playtimeStart.value) return;
      playtimeDisplay.value = formatTime(performance.now() - playtimeStart.value);

      const elapsed = performance.now() - playtimeStart.value;
      const nextTick = 1000 - (elapsed % 1000);
      playtimeInterval.value = window.setTimeout(tick, nextTick);
    };

    playtimeInterval.value = window.setInterval(tick, 1000);
  }

  function stop() {
    if (playtimeInterval.value) {
      clearInterval(playtimeInterval.value);
      playtimeInterval.value = null;
    }
    playtimeStart.value = null;
    playtimeDisplay.value = formatTime(0);
  }

  onUnmounted(stop);

  return { playtimeStart, playtimeDisplay, start, stop };
}
