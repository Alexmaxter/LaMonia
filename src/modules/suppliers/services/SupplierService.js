// src/modules/suppliers/services/SupplierService.js
import { db } from "../../../config/firebase.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  increment,
  getDocs,
  getDoc,
  limit,
} from "firebase/firestore";

export class SupplierService {
  constructor() {
    this.collectionName = "suppliers";
    this.transactionCollection = "supplier_transactions";
  }

  // --- ESCUCHA EN TIEMPO REAL (LISTA DE PROVEEDORES) ---
  // CORRECCIÓN: Renombrado de initRealtimeListener a subscribeToSuppliers
  subscribeToSuppliers(callback) {
    const q = query(
      collection(db, this.collectionName),
      orderBy("name", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const suppliers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(suppliers);
    });
  }

  // --- CRUD PROVEEDORES ---

  async createSupplier(supplierData) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...supplierData,
        balance: 0, // Saldo financiero inicial
        stockDebt: {}, // Deuda de stock (si aplica)
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating supplier:", error);
      throw error;
    }
  }
  async getSupplierById(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting supplier:", error);
      throw error;
    }
  }

  async updateSupplier(id, data) {
    try {
      const supplierRef = doc(db, this.collectionName, id);
      await updateDoc(supplierRef, {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating supplier:", error);
      throw error;
    }
  }

  // --- GESTIÓN DE MOVIMIENTOS (CORE HÍBRIDO) ---

  /**
   * Registra un movimiento y actualiza el saldo global.
   * Soporta el modelo híbrido guardando invoiceNumber si existe.
   */
  async registerMovement(data) {
    try {
      const finalDate = this._processDate(data.date);

      // 1. Preparar el objeto de transacción
      const transactionPayload = {
        supplierId: data.supplierId,
        type: data.type, // 'invoice', 'payment', 'credit_note'
        transactionMode: data.transactionMode || "money", // 'money' o 'stock'
        description: data.description || "",
        date: finalDate,
        createdAt: new Date(),
        // NUEVO: Guardamos el número de boleta si viene, o null.
        // Esto habilita la Capa 2 (Detalle) sin obligar a usarla.
        invoiceNumber: data.invoiceNumber || null,
      };

      // Definir monto o items según el modo
      if (data.transactionMode === "stock") {
        transactionPayload.items = data.items || [];
        transactionPayload.amount = 0; // En stock mode el monto financiero es 0 o irrelevante aquí
      } else {
        transactionPayload.amount = parseFloat(data.amount || 0);
      }

      // 2. Guardar en la colección de historial (supplier_transactions)
      const transactionRef = await addDoc(
        collection(db, this.transactionCollection),
        transactionPayload
      );

      // 3. Actualizar el Saldo Global del Proveedor (Capa 1 - Verdad Contable)
      const supplierRef = doc(db, this.collectionName, data.supplierId);

      if (data.transactionMode === "stock") {
        // Lógica para proveedores de stock (cajones, envases)
        const updates = {};
        data.items.forEach((item) => {
          // Si es invoice (entrada) suma deuda, si es payment (salida) resta deuda
          const multiplier = data.type === "invoice" ? 1 : -1;
          const qty = parseFloat(item.quantity) * multiplier;
          // Usamos notación de punto para actualizar campos anidados en Firestore map
          updates[`stockDebt.${item.name}`] = increment(qty);
        });
        updates.updatedAt = new Date();
        await updateDoc(supplierRef, updates);
      } else {
        // Lógica financiera estándar ($)
        const amount = parseFloat(data.amount);
        // Invoice aumenta el saldo (Deuda), Payment/CreditNote lo disminuye
        const multiplier = data.type === "invoice" ? 1 : -1;
        const balanceChange = amount * multiplier;

        await updateDoc(supplierRef, {
          balance: increment(balanceChange),
          updatedAt: new Date(),
        });
      }

      return transactionRef.id;
    } catch (error) {
      console.error("Error registering movement:", error);
      throw error;
    }
  }

  /**
   * Obtiene todas las transacciones de un proveedor para mostrarlas en la tabla.
   */
  async getTransactions(supplierId) {
    try {
      const q = query(
        collection(db, this.transactionCollection),
        where("supplierId", "==", supplierId),
        orderBy("date", "desc") // Más recientes primero para la vista
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Convertir Timestamp de Firestore a Date JS si es necesario
        date: doc.data().date?.toDate
          ? doc.data().date.toDate()
          : new Date(doc.data().date),
      }));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  }

  /**
   * ELIMINAR TRANSACCIÓN
   * Revierte el efecto en el saldo global para mantener la integridad.
   */
  async deleteTransaction(transactionId) {
    try {
      // 1. Obtener la transacción original para saber qué revertir
      const txRef = doc(db, this.transactionCollection, transactionId);
      const txSnap = await getDoc(txRef);

      if (!txSnap.exists()) {
        throw new Error("Transaction not found");
      }

      const txData = txSnap.data();
      const supplierRef = doc(db, this.collectionName, txData.supplierId);

      // 2. Revertir el saldo en el Proveedor
      if (txData.transactionMode === "stock") {
        const updates = {};
        if (txData.items && Array.isArray(txData.items)) {
          txData.items.forEach((item) => {
            // Invertimos la lógica original:
            // Si era invoice (suma), ahora restamos. Si era payment (resta), ahora sumamos.
            const originalMultiplier = txData.type === "invoice" ? 1 : -1;
            const reverseMultiplier = originalMultiplier * -1;
            const qty = parseFloat(item.quantity) * reverseMultiplier;
            updates[`stockDebt.${item.name}`] = increment(qty);
          });
        }
        await updateDoc(supplierRef, updates);
      } else {
        const amount = parseFloat(txData.amount);
        // Invertir lógica: Si sumó (invoice), ahora restamos.
        const originalMultiplier = txData.type === "invoice" ? 1 : -1;
        const reverseChange = amount * originalMultiplier * -1;

        await updateDoc(supplierRef, { balance: increment(reverseChange) });
      }

      // 3. Eliminar el documento del historial
      await deleteDoc(txRef);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      throw error;
    }
  }
  // --- MÉTODO CORE DEL MODELO HÍBRIDO ---

  /**
   * getPendingInvoices
   * Reconstruye la historia para determinar qué boletas siguen impagas.
   * Lógica: "El saldo $0 es el sincronizador universal".
   * * @param {string} supplierId
   * @returns {Array} Lista de objetos transacción (tipo invoice) pendientes.
   */
  async getPendingInvoices(supplierId) {
    try {
      // 1. Traemos la historia ordenada cronológicamente (ASC) para simular la evolución del saldo.
      // Optimización: Podríamos limitar esto a los últimos X meses si la data es muy grande,
      // pero para garantizar precisión necesitamos encontrar el último punto cero.
      const q = query(
        collection(db, this.transactionCollection),
        where("supplierId", "==", supplierId),
        orderBy("date", "asc")
      );

      const querySnapshot = await getDocs(q);
      const transactions = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateObj: doc.data().date?.toDate
          ? doc.data().date.toDate()
          : new Date(doc.data().date),
      }));

      if (transactions.length === 0) return [];

      // 2. Algoritmo de "Punto Cero"
      let runningBalance = 0;
      let lastZeroDate = null; // Fecha del último momento donde no debíamos nada

      transactions.forEach((t) => {
        // Ignoramos movimientos de stock puro para el cálculo financiero
        if (t.transactionMode === "stock") return;

        const amount = parseFloat(t.amount || 0);

        if (t.type === "invoice") {
          runningBalance += amount;
        } else {
          // Pagos y notas de crédito bajan la deuda
          runningBalance -= amount;
        }

        // Detectar saldo cero (con tolerancia a errores de punto flotante de JS)
        // Si el saldo es menor a 1 peso (o 0.1), consideramos que se saldó la cuenta.
        // Esto maneja casos donde quedan $0.05 colgados por redondeo.
        if (runningBalance <= 0.5) {
          runningBalance = 0; // Reset lógico
          lastZeroDate = t.dateObj;
        }
      });

      // 3. Filtrar boletas posteriores al último punto cero
      const pendingInvoices = transactions.filter((t) => {
        // Solo nos interesan las facturas de dinero
        if (t.type !== "invoice" || t.transactionMode === "stock") return false;

        // Si hubo un "Punto Cero", solo devolvemos las boletas creadas DESPUÉS de ese momento.
        // Si lastZeroDate es null (nunca se pagó todo), devuelve todas las históricas.
        if (lastZeroDate) {
          return t.dateObj > lastZeroDate;
        }
        return true;
      });

      // Devolvemos las boletas más nuevas primero para visualización, o mantenemos orden ASC según necesidad.
      // Aquí las invertimos para que la más reciente aparezca arriba en una lista de pendientes.
      return pendingInvoices.reverse();
    } catch (error) {
      console.error("Error calculando boletas pendientes:", error);
      return [];
    }
  }

  // --- UTILS ---

  _processDate(dateInput) {
    if (!dateInput) return new Date();
    // Si ya es un objeto Date
    if (dateInput instanceof Date) return dateInput;
    // Si es un string YYYY-MM-DD (común en inputs date)
    if (typeof dateInput === "string" && dateInput.includes("-")) {
      // Crear fecha al mediodía para evitar problemas de timezone
      const [year, month, day] = dateInput.split("-").map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    return new Date(dateInput);
  }
}

export const supplierService = new SupplierService();
