import "./style.css"; // Importamos el CSS (asegúrate que tu index.html o loader lo soporte, o agrégalo al main css)

export function Card({ title, content, className = "" }) {
  const card = document.createElement("div");
  // Usamos clases en lugar de style=""
  card.className = `ui-card ${className}`;

  if (title) {
    const h3 = document.createElement("h3");
    h3.textContent = title;
    card.appendChild(h3);
  }

  if (content instanceof HTMLElement) {
    card.appendChild(content);
  } else if (typeof content === "string") {
    // Usamos un contenedor para el HTML string para evitar problemas de inyección directa mixta
    const div = document.createElement("div");
    div.innerHTML = content;
    card.appendChild(div);
  }

  return card;
}
