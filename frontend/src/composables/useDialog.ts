import { h, render } from "vue";
import BaseModal from "@/components/BaseModal.vue";

export function showDialog(message: string): void {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const close = () => {
    render(null, container);
    container.remove();
  };

  render(h(BaseModal, { message, onClose: close }), container);
}
