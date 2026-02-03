import { el } from "../../../core/dom.js";
import "./style.css";

/**
 * Crea un esqueleto de carga
 * @param {Object} props
 * @param {string} [props.width="100%"]
 * @param {string} [props.height="20px"]
 * @param {string} [props.className=""]
 */
export const Skeleton = ({
  width = "100%",
  height = "20px",
  className = "",
} = {}) => {
  return el("div", {
    className: `skeleton ${className}`,
    style: { width, height },
  });
};

/**
 * Crea una lista de esqueletos para simular una tabla/lista
 */
export const SkeletonList = (count = 5) => {
  const container = el("div", {
    style: { display: "flex", flexDirection: "column", gap: "1rem" },
  });
  for (let i = 0; i < count; i++) {
    container.appendChild(
      Skeleton({ height: "60px", className: "skeleton-card" })
    );
  }
  return container;
};
