<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  isConnected: boolean;
  isPlayer: boolean;
  ping: number;
  nickname: string;
  color: string;
  playtimeDisplay: string;
}>();

const emit = defineEmits<{
  "update:nickname": [value: string];
  "update:color": [value: string];
  join: [];
  leave: [];
  "change-color": [];
}>();

const nickname = computed({
  get: () => props.nickname,
  set: (value) => emit("update:nickname", value),
});

const color = computed({
  get: () => props.color,
  set: (value) => emit("update:color", value),
});

const connectionText = computed(() => {
  return props.isConnected ? "Connected" : "Disconnected";
});

const connectionClass = computed(() => {
  return props.isConnected ? "connected" : "disconnected";
});

const joinButtonText = computed(() => {
  return props.isPlayer ? "Leave" : "Join";
});

const joinButtonClass = computed(() => {
  return props.isPlayer ? "leave" : "";
});

function handleJoinClick() {
  if (props.isPlayer) emit("leave");
  else emit("join");
}

function handleColorInput() {
  if (props.isPlayer) emit("change-color");
}
</script>

<template>
  <div class="section controls">
    <div class="controls-header">
      <h2 class="controls-title">Bouncing DVD Multiplayer</h2>
      <div class="connection-status" :class="connectionClass">{{ connectionText }}</div>
      <div class="ping">Ping: {{ props.ping }}ms</div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="nickname">Nickname</label>
        <input
          type="text"
          id="nickname"
          :value="nickname"
          :disabled="isPlayer"
          @input="(e) => emit('update:nickname', (e.target as HTMLInputElement).value)"
        />
      </div>
      <div class="form-group color-group">
        <label for="color">Color</label>
        <div class="color-swatch" :style="{ backgroundColor: color }">
          <input
            type="color"
            id="color"
            :value="color"
            @input="
              (e) => {
                emit('update:color', (e.target as HTMLInputElement).value);
                handleColorInput();
              }
            "
          />
        </div>
      </div>
    </div>

    <div class="button-row">
      <button
        class="join-btn"
        :class="joinButtonClass"
        :disabled="!isConnected"
        @click="handleJoinClick"
      >
        {{ joinButtonText }}
      </button>
      <div v-if="!isConnected" class="playtime">Connecting to server...</div>
      <div v-else-if="!isPlayer" class="playtime">Spectating</div>
      <div v-else class="playtime">{{ props.playtimeDisplay }}</div>
    </div>
  </div>
</template>

<style scoped>
.controls {
  flex-shrink: 0;
}

.controls-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.controls-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.ping {
  margin-left: auto;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.color-group {
  flex: 0 0 45px;
}

.color-swatch {
  position: relative;
  flex: 1;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

label {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
}

input[type="text"],
input[type="color"] {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  transition: all 0.3s ease;
}

input[type="color"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

input[type="text"]:focus,
input[type="color"]:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.2);
}

input[type="text"]:disabled,
input[type="color"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input[type="text"]:hover:not(:disabled),
input[type="color"]:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.4);
}

.button-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.join-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 8px;
  padding: 12px 18px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 6em;
}

.join-btn.leave {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.join-btn:disabled {
  background: #777;
  color: #ccc;
  cursor: not-allowed;
}

.connection-status {
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.connection-status.connected {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid #10b981;
  color: #10b981;
}

.connection-status.disconnected {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #ef4444;
}

.playtime {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}
</style>
