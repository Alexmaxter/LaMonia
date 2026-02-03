import { el } from "../../../../core/dom.js";
import { dateUtils } from "../../../../core/utils/dateUtils.js";
import { Toast } from "../../../../shared/ui/Toast/index.js";
import { PageHeader } from "../../../../shared/ui/PageHeader/index.js";
import { Button } from "../../../../shared/ui/Button/index.js";
import { SkeletonList } from "../../../../shared/ui/Skeleton/index.js";

import { DailyHistoryList } from "../../components/DailyHistoryList/index.js";
import { ClosingForm } from "../../components/ClosingForm/index.js";
import { CashflowService } from "../../services/CashflowService.js";
import { DailyReportModel } from "../../models/DailyReport.js";

import "./style.css";

class DailyClosingController {
  constructor() {
    this.container = el("div", {
      className: "daily-closing-view page-container",
    });
    this.contentWrapper = el("div", { className: "content-wrapper" });
  }

  async render() {
    this.container.innerHTML = "";
    this.container.appendChild(this.contentWrapper);
    await this.showHistory();
    return this.container;
  }

  // --- VISTA: HISTORIAL ---
  async showHistory() {
    this.contentWrapper.innerHTML = "";

    // 1. Header Estándar: Único punto de acceso para nuevos cierres
    this.contentWrapper.appendChild(
      PageHeader({
        title: "Cierre de Caja",
        subtitle: "Gestión de movimientos diarios",
        action: Button({
          text: "Nuevo Cierre",
          icon: "plus",
          onClick: () => this.showForm(dateUtils.todayInput()),
        }),
      })
    );

    // 2. Estado de Carga (SKELETON)
    const loadingContainer = el("div", {}, SkeletonList(4));
    this.contentWrapper.appendChild(loadingContainer);

    try {
      // 3. Obtener Datos
      const history = await CashflowService.getHistory(30);

      // 4. Reemplazar Skeleton con Contenido Real
      loadingContainer.remove();

      const listComponent = DailyHistoryList({
        reports: history,
        onSelectDay: (dateStr) => this.showForm(dateStr),
      });

      this.contentWrapper.appendChild(listComponent);
    } catch (error) {
      console.error(error);
      loadingContainer.innerHTML =
        '<div class="error-msg">Error al cargar historial</div>';
    }
  }

  // --- VISTA: FORMULARIO ---
  async showForm(dateStr) {
    this.contentWrapper.innerHTML = "";

    // 1. Header con botón volver
    this.contentWrapper.appendChild(
      PageHeader({
        title: `Cierre: ${dateStr}`,
        onBack: () => this.showHistory(),
      })
    );

    // 2. Skeleton de Formulario
    const loadingForm = el(
      "div",
      { style: { padding: "2rem" } },
      SkeletonList(3)
    );
    this.contentWrapper.appendChild(loadingForm);

    try {
      const existingReport = await CashflowService.getReportByDate(dateStr);
      const reportData = existingReport || DailyReportModel.create(dateStr);

      loadingForm.remove();

      const formComponent = ClosingForm({
        initialData: reportData,
        onSave: async (updatedData) => {
          try {
            // La fecha puede haber sido modificada en el formulario
            await CashflowService.saveReport(updatedData);
            Toast.show("Guardado correctamente", "success");
            this.showHistory();
          } catch (error) {
            console.error(error);
            Toast.show("Error al guardar", "error");
          }
        },
        onCancel: () => this.showHistory(),
        onDelete: async (dateStr) => {
          try {
            await CashflowService.deleteReport(dateStr);
            Toast.show("Cierre eliminado correctamente", "success");
            this.showHistory();
          } catch (error) {
            console.error(error);
            Toast.show("Error al eliminar", "error");
          }
        },
      });

      this.contentWrapper.appendChild(formComponent);
    } catch (error) {
      console.error(error);
      Toast.show("Error cargando formulario", "error");
      this.showHistory();
    }
  }
}

export async function DailyClosingView(props) {
  const controller = new DailyClosingController(props);
  return controller.render();
}
