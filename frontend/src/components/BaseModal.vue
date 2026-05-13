<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";
defineProps<{
  message: string;
}>();
const emit = defineEmits<{
  close: [];
}>();
const visible = ref(false);
onMounted(() => {
  nextTick(() => {
    visible.value = true;
  });
});
function handleClose() {
  visible.value = false;
}
</script>

<template>
  <Transition name="modal" @after-leave="emit('close')">
    <div v-if="visible" class="modal-backdrop" @click.self="handleClose">
      <div class="modal section">
        <p class="modal-message">{{ message }}</p>
        <button class="modal-btn" @click="handleClose">OK</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
}
.modal {
  padding: 20px 28px;
  max-width: 400px;
  text-align: center;
  backdrop-filter: blur(12px);
  font-size: 16px;
}
.modal-message {
  color: #fff;
  margin: 0 0 20px;
  line-height: 1.5;
}
.modal-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 8px;
  padding: 10px 28px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 1px 0 3px 0;
}
.modal-btn:hover {
  opacity: 0.9;
}

.modal-enter-active,
.modal-leave-active {
  transition: background 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  background: rgba(0, 0, 0, 0) !important;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}
.modal-enter-from .modal,
.modal-leave-to .modal {
  opacity: 0;
  transform: scale(0.9);
}
</style>
