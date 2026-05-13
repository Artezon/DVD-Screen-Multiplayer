<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import Controls from "./components/Controls.vue";
import GameCanvas from "./components/GameCanvas.vue";
import Chat from "./components/Chat.vue";
import PlayerList from "./components/PlayerList.vue";
import { useWebSocket } from "./composables/useWebSocket";
import { useGameState } from "./composables/useGameState";
import { usePlaytime } from "./composables/usePlaytime";
import { showDialog } from "./composables/useDialog";
import { generateRandomUser } from "./utils";
import type { ServerMessage, ChatMessage } from "./types";

const { isConnected, connect, send, onMessage } = useWebSocket();
const {
  players,
  board,
  myPlayerId,
  isPlayer,
  sortedPlayersArray,
  handleSpectatorInit,
  handlePlayerInit,
  handleSpectatorMode,
  handleNewPlayer,
  handlePlayerLeft,
  handleStateUpdate,
  handleDisconnect,
} = useGameState();
const { playtimeDisplay, start: startPlaytime, stop: stopPlaytime } = usePlaytime();

const ping = ref(0);
const chatMessages = ref<ChatMessage[]>([]);

const nickname = ref("");
const color = ref("#fff");

function joinGame() {
  send({ type: "join", nickname: nickname.value.trim(), color: color.value });
}

function leaveGame() {
  send({ type: "leave" });
}

function changeColor() {
  send({ type: "new_color", color: color.value });
}

function sendChat(text: string) {
  send({ type: "chat", message: text });
}

function handleMessage(data: ServerMessage) {
  switch (data.type) {
    case "spectator_init":
      handleSpectatorInit({ players: data.players, board: data.board });
      break;
    case "player_init":
      handlePlayerInit({ player: data.player });
      startPlaytime();
      break;
    case "spectator_mode":
      handleSpectatorMode();
      stopPlaytime();
      break;
    case "new_player":
      handleNewPlayer({ player: data.player });
      break;
    case "player_left":
      handlePlayerLeft({ playerId: data.playerId });
      break;
    case "state":
      handleStateUpdate(data.players);
      if (data.messages) {
        for (const msg of data.messages) {
          chatMessages.value.push(msg);
        }
        if (chatMessages.value.length > 500) {
          chatMessages.value.splice(0, chatMessages.value.length - 500);
        }
      }
      break;
    case "pong":
      ping.value = Date.now() - data.ts;
      break;
    case "error":
      showDialog(data.msg);
      break;
  }
}

let pingInterval: number | null = null;

onMounted(() => {
  const user = generateRandomUser();
  nickname.value = user.nickname;
  color.value = user.color;

  onMessage.value = handleMessage;
  connect();

  pingInterval = window.setInterval(() => {
    send({ type: "ping", ts: Date.now() });
  }, 1000);
});

onUnmounted(() => {
  if (pingInterval) clearInterval(pingInterval);
});

watch(isConnected, (connected) => {
  if (!connected) {
    stopPlaytime();
    handleDisconnect();
  }
});
</script>

<template>
  <div class="container">
    <div class="left-panel">
      <Controls
        :is-connected="isConnected"
        :is-player="isPlayer"
        :ping="ping"
        :playtime-display="playtimeDisplay"
        :nickname="nickname"
        :color="color"
        @update:nickname="nickname = $event"
        @update:color="color = $event"
        @join="joinGame"
        @leave="leaveGame"
        @change-color="changeColor"
      />
      <GameCanvas
        :players="players"
        :board="board"
        :my-player-id="myPlayerId"
        :is-connected="isConnected"
      />
    </div>
    <div class="right-panel">
      <Chat
        :messages="chatMessages"
        :is-player="isPlayer"
        :players="sortedPlayersArray"
        @send="sendChat"
      />
      <PlayerList :players="sortedPlayersArray" :my-player-id="myPlayerId" />
    </div>
  </div>
</template>
