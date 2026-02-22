import { db } from "../../core/firebase/db.js";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const BUSINESS_DOC = "config";
const BUSINESS_COLLECTION = "business";

export const BusinessService = {
  /**
   * Obtiene la configuración del negocio.
   * Retorna null si no existe aún.
   */
  async get() {
    try {
      const ref = doc(db, BUSINESS_COLLECTION, BUSINESS_DOC);
      const snap = await getDoc(ref);
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
      console.error("[BusinessService] Error al obtener config:", error);
      throw error;
    }
  },

  /**
   * Guarda o actualiza la configuración del negocio.
   * Usa setDoc con merge:true para no pisar campos no incluidos.
   */
  async save(data) {
    try {
      const ref = doc(db, BUSINESS_COLLECTION, BUSINESS_DOC);
      await setDoc(
        ref,
        {
          ...data,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return true;
    } catch (error) {
      console.error("[BusinessService] Error al guardar config:", error);
      throw error;
    }
  },
};
