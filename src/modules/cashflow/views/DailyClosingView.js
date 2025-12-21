import { DailyReport } from "../models/DailyReport.js";
import { SalesForm } from "../components/SalesForm.js";
import { ExpenseForm } from "../components/ExpenseForm.js"; // <--- IMPORTAMOS
import { Card } from "../../../shared/ui/Card.js";

export function DailyClosingView() {
  const container = document.createElement("div");

  const title = document.createElement("h1");
  title.textContent = "Cierre de Caja";
  container.appendChild(title);

  // 1. Componente de Ventas
  const salesForm = SalesForm();
  container.appendChild(
    Card({ title: "💰 Ingresos (Ventas)", content: salesForm })
  );

  // 2. Componente de Gastos (NUEVO)
  const expenseForm = ExpenseForm();
  container.appendChild(
    Card({ title: "💸 Gastos y Salidas", content: expenseForm })
  );

  // 3. Botón Calcular
  const btnCalc = document.createElement("button");
  btnCalc.textContent = "Calcular Arqueo Final";
  btnCalc.style =
    "background: #646cff; color: white; padding: 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 1.1rem; width: 100%; margin-top: 10px; font-weight: bold;";

  // 4. Resultado Visual
  const resultDiv = document.createElement("div");
  resultDiv.style =
    "margin-top: 20px; padding: 20px; background: #252525; border-radius: 8px; border: 1px solid #444;";
  resultDiv.innerHTML = `<p style="color: #888; text-align: center;">Presiona calcular para ver el arqueo</p>`;

  // --- LOGICA FINAL ---
  btnCalc.onclick = () => {
    // A. Obtenemos datos de los componentes hijos
    const salesData = salesForm.getValues();
    const expensesList = expenseForm.getExpenses();

    // B. Creamos el reporte con la lógica de negocio
    const report = new DailyReport({
      sales: salesData,
      expenses: expensesList,
    });

    // C. Pedimos los resultados calculados
    const totalSales = report.getTotalSales();
    const cashInDrawer = report.getExpectedCashInDrawer();

    // D. Mostramos resultados
    resultDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span>Venta Bruta Total:</span>
        <span style="font-weight: bold;">$ ${totalSales}</span>
      </div>
      <hr style="border-color: #444;">
      <div style="text-align: center; margin-top: 15px;">
        <span style="display: block; font-size: 0.9rem; color: #aaa;">EFECTIVO ESPERADO EN CAJA</span>
        <span style="font-size: 2.5rem; color: #4ade80; font-weight: bold;">$ ${cashInDrawer}</span>
        <p style="font-size: 0.8rem; color: #666; margin-top: 5px;">
          (Venta Efectivo - Gastos de Caja)
        </p>
      </div>
    `;
  };

  container.appendChild(btnCalc);
  container.appendChild(resultDiv);

  return container;
}
