<script setup lang="ts">
import type { Player } from "@/types";

defineProps<{
  players: Player[];
  myPlayerId: string | null;
}>();
</script>

<template>
  <div class="section player-list">
    <div class="player-list-header">
      <h3 class="player-list-title">Online</h3>
      <div class="player-count">
        {{ players.length }} player{{ players.length !== 1 ? "s" : "" }}
      </div>
    </div>
    <div class="player-list-content">
      <div v-if="players.length === 0" class="no-players-msg">No players online</div>
      <div
        v-for="player in players"
        :key="player.id"
        class="player-item"
        :class="{ 'own-player': player.id === myPlayerId }"
      >
        <div class="player-header">
          <div class="player-color" :style="{ backgroundColor: player.color }" />
          <div class="player-name">{{ player.nickname }}</div>
        </div>
        <div class="player-hit-count">
          Corner hit count: <strong>{{ player.cornerHits || 0 }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-list {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.player-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.player-list-title {
  font-size: 16px;
  font-weight: 600;
}

.player-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.player-list-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}

.no-players-msg {
  opacity: 0.5;
  padding: 40px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .no-players-msg {
    padding: 25px 0;
  }
}

.player-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.player-item.own-player {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.player-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.player-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.player-name {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.player-hit-count {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 8px;
}
</style>
