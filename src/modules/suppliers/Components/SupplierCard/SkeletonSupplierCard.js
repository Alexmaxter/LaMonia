import { el } from "../../../../core/dom.js";
import { Skeleton } from "../../../../shared/ui/Skeleton/index.js";

export function SkeletonSupplierCard() {
  return el(
    "div",
    { className: "supplier-card", style: "pointer-events: none;" },
    [
      // HEADER de la tarjeta
      el(
        "div",
        {
          className: "card-header",
          style: "display: flex; gap: 12px; align-items: center;",
        },
        [
          Skeleton({ type: "circle", width: "40px", height: "40px" }), // Icono
          el("div", { style: "flex: 1;" }, [
            Skeleton({
              type: "text",
              width: "60%",
              height: "20px",
              style: "margin-bottom: 8px;",
            }), // Título
            Skeleton({
              type: "rect",
              width: "80px",
              height: "20px",
              style: "border-radius: 12px;",
            }), // Badge
          ]),
        ],
      ),

      // BODY de la tarjeta
      el(
        "div",
        {
          className: "card-body",
          style:
            "margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px;",
        },
        [
          el(
            "div",
            {
              style:
                "display: flex; justify-content: space-between; align-items: flex-end;",
            },
            [
              el("div", {}, [
                Skeleton({
                  type: "text",
                  width: "100px",
                  height: "12px",
                  style: "margin-bottom: 6px;",
                }), // Label
                Skeleton({ type: "rect", width: "120px", height: "24px" }), // Monto
              ]),
              Skeleton({ type: "circle", width: "32px", height: "32px" }), // Botón +
            ],
          ),
        ],
      ),
    ],
  );
}
