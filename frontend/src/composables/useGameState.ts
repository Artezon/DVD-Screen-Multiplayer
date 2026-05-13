import { ref, computed } from "vue";
import type { Player, Board } from "@/types";

export function useGameState() {
  const players = ref<Map<string, Player>>(new Map());
  const board = ref<Board>({ width: 0, height: 0 });
  const myPlayerId = ref<string | null>(null);
  const isPlayer = ref(false);
  const hapticEnabled = ref(false);
  const prevVelX = ref<number | null>(null);
  const prevVelY = ref<number | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  hapticEnabled.value = urlParams.get("vibration") === "true";
  if (hapticEnabled.value && !("vibrate" in navigator)) {
    hapticEnabled.value = false;
  }

  const sortedPlayersArray = computed(() => {
    const arr = Array.from(players.value.values());
    return arr.sort((a, b) => (b.cornerHits || 0) - (a.cornerHits || 0));
  });

  function handleSpectatorInit(data: { players: Player[]; board: Board }) {
    isPlayer.value = false;
    myPlayerId.value = null;
    board.value = data.board;
    players.value.clear();
    for (const player of data.players) {
      players.value.set(player.id, player);
    }
  }

  function handlePlayerInit(data: { player: Player }) {
    isPlayer.value = true;
    myPlayerId.value = data.player.id;
    players.value.set(data.player.id, data.player);
  }

  function handleSpectatorMode() {
    if (myPlayerId.value) {
      players.value.delete(myPlayerId.value);
    }
    isPlayer.value = false;
    myPlayerId.value = null;
  }

  function handleNewPlayer(data: { player: Player }) {
    players.value.set(data.player.id, data.player);
  }

  function handlePlayerLeft(data: { playerId: string }) {
    players.value.delete(data.playerId);
  }

  function hapticFeedback(player: Player) {
    if (
      hapticEnabled.value &&
      prevVelX.value !== null &&
      prevVelY.value !== null &&
      (Math.sign(prevVelX.value) !== Math.sign(player.velocity.x) ||
        Math.sign(prevVelY.value) !== Math.sign(player.velocity.y))
    ) {
      navigator.vibrate(5);
    }
    prevVelX.value = player.velocity.x;
    prevVelY.value = player.velocity.y;
  }

  function handleStateUpdate(playersArray: Player[]) {
    const currentIds = new Set<string>();

    for (const playerUpdate of playersArray) {
      currentIds.add(playerUpdate.id);
      const existing = players.value.get(playerUpdate.id);
      if (existing) {
        if (myPlayerId.value === playerUpdate.id) {
          hapticFeedback(playerUpdate);
        }
        Object.assign(existing, playerUpdate);
      } else {
        players.value.set(playerUpdate.id, playerUpdate);
      }
    }

    for (const [playerId] of players.value) {
      if (!currentIds.has(playerId)) players.value.delete(playerId);
    }
  }

  function handleDisconnect() {
    players.value.clear();
    isPlayer.value = false;
    myPlayerId.value = null;
  }

  return {
    players,
    board,
    myPlayerId,
    isPlayer,
    sortedPlayersArray,
    hapticEnabled,
    handleSpectatorInit,
    handlePlayerInit,
    handleSpectatorMode,
    handleNewPlayer,
    handlePlayerLeft,
    handleStateUpdate,
    handleDisconnect,
  };
}
