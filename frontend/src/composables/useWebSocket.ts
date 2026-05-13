import { ref, onUnmounted } from "vue";
import type { ServerMessage, ClientMessage } from "@/types";

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const onMessage = ref<(data: ServerMessage) => void>(() => {});

  function connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/dvd/ws/game`;

    ws.value = new WebSocket(wsUrl);

    ws.value.onopen = () => {
      isConnected.value = true;
    };

    ws.value.onmessage = (event) => {
      const data = JSON.parse(event.data) as ServerMessage;
      onMessage.value(data);
    };

    ws.value.onclose = () => {
      isConnected.value = false;
      setTimeout(connect, 3000);
    };

    ws.value.onerror = () => {
      isConnected.value = false;
    };
  }

  function send(message: ClientMessage) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
    }
  }

  function disconnect() {
    if (ws.value) {
      ws.value.onclose = null;
      ws.value.close();
      ws.value = null;
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return { ws, isConnected, connect, send, disconnect, onMessage };
}
