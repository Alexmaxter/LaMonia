export function Card({ title, content }) {
  const card = document.createElement("div");
  card.style =
    "background: #1e1e1e; padding: 1.5rem; border-radius: 8px; border: 1px solid #333; margin-bottom: 1rem;";

  if (title) {
    const h3 = document.createElement("h3");
    h3.textContent = title;
    h3.style.marginTop = 0;
    card.appendChild(h3);
  }

  if (content instanceof HTMLElement) card.appendChild(content);
  else if (typeof content === "string") card.innerHTML += content;

  return card;
}
