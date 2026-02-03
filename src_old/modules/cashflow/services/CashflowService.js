import { db } from "../../../config/firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const COLLECTION = "daily_reports";

export const CashflowService = {
  // Obtener un reporte específico por fecha (ID)
  async getReportByDate(dateStr) {
    try {
      const ref = doc(db, COLLECTION, dateStr);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      console.error("Error fetching report:", error);
      throw error;
    }
  },

  // Obtener historial (Solo los últimos X días para la lista)
  async getHistory(limitCount = 30) {
    try {
      const reportsRef = collection(db, COLLECTION);
      // Primero obtenemos TODOS los reportes ordenados por fecha ASCENDENTE
      const q = query(reportsRef, orderBy("date", "asc"));
      const snapshot = await getDocs(q);
      const allReports = snapshot.docs.map((doc) => doc.data());

      // Calcular saldos acumulados correctamente (de más viejo a más nuevo)
      let runningBalance = 0;
      const reportsWithBalance = allReports.map((report) => {
        const netIncome = Number(report.net_income) || 0;
        runningBalance += netIncome;

        return {
          ...report,
          accumulated_cashflow: Math.round(runningBalance * 100) / 100,
        };
      });

      // Ahora revertimos para mostrar el más reciente primero y limitamos
      return reportsWithBalance.reverse().slice(0, limitCount);
    } catch (error) {
      console.error("Error fetching history:", error);
      throw error;
    }
  },

  // --- DEPRECADO: Ya no se usa, el saldo se calcula en getHistory() ---
  // Lo dejamos por si acaso se usa en otro lugar
  async getLastClosingBalance() {
    try {
      const reportsRef = collection(db, COLLECTION);
      const q = query(reportsRef, orderBy("date", "desc"), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        return Number(data.accumulated_cashflow) || 0;
      }
      return 0;
    } catch (error) {
      console.error("Error fetching last balance:", error);
      return 0;
    }
  },

  // Guardado optimizado (Incremental)
  async saveReport(reportData) {
    try {
      // IMPORTANTE: La fecha puede haber cambiado en el formulario
      const reportRef = doc(db, COLLECTION, reportData.date);

      // 1. CALCULAR FLUJO DEL DÍA CORRECTAMENTE
      // Ingresos totales (todos los medios de pago)
      const payments = reportData.payments || {};
      const totalIncome =
        Number(payments.cash || 0) +
        Number(payments.qr || 0) +
        Number(payments.card || 0) +
        Number(payments.transfer || 0);

      // Egresos totales
      const expensesCash = Number(reportData.expenses_cash) || 0;
      const observations = Number(reportData.observations_amount) || 0;
      const totalExpenses = expensesCash + observations;

      // Flujo neto del día = Ingresos - Egresos
      const dailyNetFlow = totalIncome - totalExpenses;

      // Separar efectivo para validaciones de caja
      const salesCash = Number(payments.cash || 0);
      const salesTotal = Number(reportData.sales_total) || totalIncome;

      // 2. PREPARAR PAYLOAD FINAL
      // IMPORTANTE: NO guardamos accumulated_cashflow aquí
      // Se calculará dinámicamente en getHistory() ordenando correctamente
      const payload = {
        ...reportData,
        date: reportData.date,
        sales_total: salesTotal,
        sales_cash: salesCash,
        expenses_cash: expensesCash,
        observations_amount: observations,
        net_income: dailyNetFlow,
        updatedAt: serverTimestamp(),
      };

      // 3. GUARDAR
      await setDoc(reportRef, payload, { merge: true });

      return payload;
    } catch (error) {
      console.error("Error saving report:", error);
      throw error;
    }
  },

  // Eliminar un reporte
  async deleteReport(dateStr) {
    try {
      const reportRef = doc(db, COLLECTION, dateStr);
      await deleteDoc(reportRef);

      // IMPORTANTE: Después de eliminar, los saldos acumulados de días posteriores
      // quedarán desactualizados. En un sistema de producción, deberías:
      // 1. Usar una Cloud Function que recalcule automáticamente
      // 2. O implementar un job manual de recálculo
      // Para este MVP, el usuario debería evitar eliminar días intermedios

      return true;
    } catch (error) {
      console.error("Error deleting report:", error);
      throw error;
    }
  },
};
