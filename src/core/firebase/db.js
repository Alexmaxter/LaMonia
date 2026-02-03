import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { firebaseConfig } from "./config.js";

// Inicialización de la App
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * FirebaseDB: Capa de abstracción para Firestore.
 */
export const FirebaseDB = {
  /**
   * Obtiene todos los documentos de una colección.
   */
  async getAll(col, orderField = null) {
    try {
      const colRef = collection(db, col);
      const q = orderField ? query(colRef, orderBy(orderField)) : colRef;
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`[DB Error] getAll en ${col}:`, error);
      throw error;
    }
  },

  /**
   * Obtiene un documento específico por ID
   */
  async getById(col, id) {
    try {
      const docRef = doc(db, col, id);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    } catch (error) {
      console.error(`[DB Error] getById:`, error);
      throw error;
    }
  },

  /**
   * Obtiene documentos filtrados u ordenados.
   * Modificado para permitir ordenar sin filtrar si 'field' es null.
   */
  async getByFilter(col, field, value, orderField = null, orderDir = "asc") {
    try {
      const colRef = collection(db, col);

      // Construimos las restricciones (constraints) dinámicamente
      const constraints = [];

      // 1. Solo agregamos el WHERE si hay un campo definido
      if (field) {
        constraints.push(where(field, "==", value));
      }

      // 2. Agregamos el ORDER BY si se solicita
      if (orderField) {
        constraints.push(orderBy(orderField, orderDir));
      }

      // 3. Creamos la query con las restricciones acumuladas
      // Si no hay restricciones, usamos la referencia a la colección directa
      const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`[DB Error] getByFilter:`, error);
      throw error;
    }
  },

  async add(col, data) {
    try {
      const colRef = collection(db, col);
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`[DB Error] add:`, error);
      throw error;
    }
  },

  async update(col, id, data) {
    try {
      const docRef = doc(db, col, id);
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
      return true;
    } catch (error) {
      console.error(`[DB Error] update:`, error);
      throw error;
    }
  },

  async delete(col, id) {
    try {
      const docRef = doc(db, col, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[DB Error] delete:`, error);
      throw error;
    }
  },

  /**
   * EJECUCIÓN EN LOTE (BATCH)
   */
  async executeBatch(operations) {
    try {
      const batch = writeBatch(db);

      operations.forEach((op) => {
        const { type, collection: colName, id, data } = op;

        if (!colName)
          throw new Error("Nombre de colección no proporcionado en el lote");

        if (type === "add") {
          const colRef = collection(db, colName);
          const newDocRef = doc(colRef);
          batch.set(newDocRef, { ...data, createdAt: serverTimestamp() });
        } else if (type === "update") {
          const docRef = doc(db, colName, id);
          batch.update(docRef, { ...data, updatedAt: serverTimestamp() });
        } else if (type === "delete") {
          const docRef = doc(db, colName, id);
          batch.delete(docRef);
        }
      });

      await batch.commit();
      console.info(
        `[DB] Batch ejecutado con éxito (${operations.length} operaciones)`,
      );
      return true;
    } catch (error) {
      console.error(`[DB Error] executeBatch:`, error);
      throw error;
    }
  },
};
