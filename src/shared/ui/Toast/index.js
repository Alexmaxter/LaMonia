import "./style.css";

// Singleton: Creamos el contenedor una sola vez al cargar la app
let container = document.querySelector(".toast-container");
if (!container) {
  container = document.createElement("div");
  container.className = "toast-container";
  document.body.appendChild(container);
}

export const Toast = {
  show(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // Iconos simples usando emojis o podrías usar tu componente Icon
    const icons = {
      success: "✅",
      error: "❌",
      info: "ℹ️",
    };

    toast.innerHTML = `<span>${
      icons[type] || ""
    }</span> <span>${message}</span>`;

    container.appendChild(toast);

    // Auto eliminar
    setTimeout(() => {
      toast.style.animation = "fadeOut 0.3s forwards";
      toast.addEventListener("animationend", () => {
        toast.remove();
      });
    }, duration);
  },

  success(msg) {
    this.show(msg, "success");
  },
  error(msg) {
    this.show(msg, "error");
  },
  info(msg) {
    this.show(msg, "info");
  },
};
