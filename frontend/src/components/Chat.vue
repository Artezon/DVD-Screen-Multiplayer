<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type { ChatMessage, Player } from "@/types";

const props = defineProps<{
  messages: ChatMessage[];
  isPlayer: boolean;
  players: Player[];
}>();

const emit = defineEmits<{
  send: [message: string];
}>();

const chatInput = ref("");
const chatList = ref<HTMLElement | null>(null);
const playerColors = ref<Record<string, string>>({});

watch(
  () => props.players,
  (players) => {
    for (const p of players) {
      playerColors.value[p.nickname] = p.color;
    }
  },
  { deep: true, immediate: true },
);

const parsedMessages = computed(() => {
  return props.messages.map((msg) => {
    const text = msg.text;
    const colonIdx = text.indexOf(": ");
    if (colonIdx > 0) {
      return {
        timestamp: msg.timestamp,
        name: text.substring(0, colonIdx),
        rest: text.substring(colonIdx),
      };
    }
    const hitIdx = text.indexOf(" hit the ");
    if (hitIdx > 0) {
      return {
        timestamp: msg.timestamp,
        name: text.substring(0, hitIdx),
        rest: text.substring(hitIdx),
      };
    }
    const joinedIdx = text.indexOf(" joined");
    if (joinedIdx > 0) {
      return {
        timestamp: msg.timestamp,
        name: text.substring(0, joinedIdx),
        rest: " joined",
      };
    }
    const leftIdx = text.indexOf(" left");
    if (leftIdx > 0) {
      return {
        timestamp: msg.timestamp,
        name: text.substring(0, leftIdx),
        rest: " left",
      };
    }
    return { timestamp: msg.timestamp, name: "", rest: text };
  });
});

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (text && props.isPlayer) {
    emit("send", text);
    chatInput.value = "";
  }
}

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (chatList.value) {
      const el = chatList.value;
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
      if (isAtBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  },
);
</script>

<template>
  <div class="section chat">
    <div class="chat-header">
      <h3 class="chat-title">Chat</h3>
    </div>
    <div ref="chatList" class="chat-messages">
      <div v-for="(msg, index) in parsedMessages" :key="index" class="chat-message">
        <span class="chat-time">{{ formatTime(msg.timestamp) }}</span>
        <span class="chat-text">
          <span
            v-if="msg.name"
            class="chat-name"
            :style="{ color: playerColors[msg.name] || '#fff' }"
            >{{ msg.name }}</span
          >{{ msg.rest }}
        </span>
      </div>
    </div>
    <div class="chat-input-row">
      <input
        v-model="chatInput"
        type="text"
        :placeholder="isPlayer ? 'Type a message...' : 'Join the DVD screen to chat!'"
        maxlength="1000"
        :disabled="!isPlayer"
        @keyup.enter="sendMessage"
      />
      <button :disabled="!isPlayer || !chatInput.trim()" @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-message:first-child {
  margin-top: auto;
}

.chat-message {
  display: flex;
  gap: 8px;
  font-size: 13px;
  line-height: 1.4;
}

.chat-time {
  flex-shrink: 0;
  opacity: 0.4;
  font-size: 11px;
  padding-top: 2px;
}

.chat-name {
  font-weight: 600;
}

.chat-input-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.chat-input-row input {
  flex: 1;
  min-width: 100px;
}

.chat-input-row button {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chat-input-row *:disabled {
  cursor: not-allowed;
}

.chat-input-row button:disabled {
  background: #777;
  color: #ccc;
}

@media (max-width: 860px) {
  .chat {
    min-height: 300px;
    max-height: 300px;
  }
}
</style>
