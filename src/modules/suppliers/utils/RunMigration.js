import { FirebaseDB } from "../../../core/firebase/db.js";

// Generador de IDs simple
const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- HERRAMIENTA 1: MIGRACIÓN INICIAL ---
export const runMigration = async () => {
  // ... (Esta parte ya no es crítica si ya tienen IDs, pero la dejamos por seguridad)
  console.log(
    "Para fusionar items, usa: mergeItems('Nombre Viejo', 'Nombre Nuevo')",
  );
};

// --- HERRAMIENTA 2: FUSIONAR ITEMS DUPLICADOS (MEJORADA) ---
export const mergeItems = async (badName, goodName) => {
  // Limpieza agresiva de los nombres ingresados
  const bad = badName ? badName.toString().trim().toUpperCase() : "";
  const good = goodName ? goodName.toString().trim().toUpperCase() : "";

  if (!bad || !good || bad === good)
    return alert("Error: Debes poner dos nombres diferentes.");

  const confirmMerge = confirm(
    `⚠ CONFIRMACIÓN DE FUSIÓN ⚠\n\nVAS A FUSIONAR:\n"${badName}"  --->  "${goodName}"\n\n1. Todas las compras de "${badName}" pasarán a ser de "${goodName}".\n2. "${badName}" se borrará de la lista.\n\n¿Estás seguro?`,
  );
  if (!confirmMerge) return;

  console.clear();
  console.log(
    `%c🔄 INTENTANDO FUSIONAR: "${bad}" -> "${good}"...`,
    "color: orange; font-weight: bold; font-size: 14px;",
  );

  try {
    const suppliers = await FirebaseDB.getAll("suppliers");
    let found = false;

    for (const supplier of suppliers) {
      if (!supplier.defaultItems) continue;

      // BUSQUEDA RELAJADA (ignora espacios y mayúsculas)
      const badItemIndex = supplier.defaultItems.findIndex(
        (i) => (i.name || "").trim().toUpperCase() === bad,
      );
      const goodItem = supplier.defaultItems.find(
        (i) => (i.name || "").trim().toUpperCase() === good,
      );

      // Solo actuamos si encontramos al menos el item BUENO o el item MALO
      if (goodItem) {
        // ID del bueno
        const goodId = goodItem.id;

        // ID del malo (si existe en la lista)
        let badId = null;
        if (badItemIndex !== -1) {
          badId = supplier.defaultItems[badItemIndex].id;
          console.log(
            `✅ Encontrado item duplicado en proveedor "${supplier.name}". ID Malo: ${badId}`,
          );
        } else {
          console.log(
            `ℹ️ El item viejo "${badName}" no está en la lista de configuración de "${supplier.name}", pero buscaré en sus transacciones antiguas por nombre.`,
          );
        }

        // 2. MUDAR EL HISTORIAL (Transacciones)
        const transactions = await FirebaseDB.getByFilter(
          "supplier_transactions",
          "supplierId",
          supplier.id,
        );
        let txUpdated = 0;

        for (const tx of transactions) {
          if (!tx.items) continue;
          let changed = false;

          const newItems = tx.items.map((item) => {
            // Limpiamos el nombre del item en la transacción para comparar
            const itemNameClean = (item.name || "").trim().toUpperCase();

            // Coincidencia por ID (si lo tenemos) o por Nombre
            const matchById = badId && item.id === badId;
            const matchByName = itemNameClean === bad;

            if (matchById || matchByName) {
              changed = true;
              return {
                ...item,
                id: goodId, // Ponemos el ID del nuevo
                name: goodItem.name, // Ponemos el Nombre del nuevo (tal cual está en config)
                color: goodItem.color, // Ponemos el Color del nuevo
              };
            }
            return item;
          });

          if (changed) {
            await FirebaseDB.update("supplier_transactions", tx.id, {
              items: newItems,
            });
            txUpdated++;
          }
        }

        if (txUpdated > 0) {
          console.log(
            `   ↳ 📝 Se corrigieron ${txUpdated} transacciones antiguas.`,
          );
          found = true;
        }

        // 3. BORRAR EL ITEM VIEJO DE LA CONFIGURACIÓN (Si existía)
        if (badItemIndex !== -1) {
          const newDefaultItems = [...supplier.defaultItems];
          newDefaultItems.splice(badItemIndex, 1); // Lo sacamos del array

          await FirebaseDB.update("suppliers", supplier.id, {
            defaultItems: newDefaultItems,
          });
          console.log(`   ↳ 🗑️ Item "${badName}" ELIMINADO de la lista.`);
          found = true;
        }
      }
    }

    if (found) {
      console.log(
        "%c✅ PROCESO FINALIZADO CON ÉXITO",
        "color: #00ff00; font-weight: bold; font-size: 16px;",
      );
      alert(
        `¡Listo! Se han unificado los datos.\n\n⚠️ MUY IMPORTANTE: RECARGA LA PÁGINA (F5) AHORA MISMO para ver los cambios.`,
      );
    } else {
      console.warn("⚠️ No se encontraron coincidencias.");
      console.log(
        `Busqué items llamados "${bad}" y "${good}" pero no los hallé juntos o no hay transacciones.`,
      );
      alert(
        "No se encontraron items con esos nombres exactos. Revisa la consola (F12) para ver detalles.",
      );
    }
  } catch (e) {
    console.error(e);
    alert("Error crítico. Revisa la consola.");
  }
};
