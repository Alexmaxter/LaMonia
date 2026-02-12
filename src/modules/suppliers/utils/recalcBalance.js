import { FirebaseDB } from "../../../core/firebase/db.js";

export const recalcAllBalances = async () => {
  console.clear();
  console.log(
    "%c🚀 INICIANDO RECALCULO DE SALDOS...",
    "color: #fff; background: #007bff; padding: 5px; font-weight: bold; font-size: 14px; border-radius: 4px;",
  );

  try {
    // 1. Obtener proveedores
    console.log("%c📦 Cargando proveedores...", "color: orange");
    const suppliers = await FirebaseDB.getAll("suppliers");

    if (!suppliers || suppliers.length === 0) {
      console.warn("⚠️ No se encontraron proveedores.");
      return;
    }

    console.log(
      `✅ Se encontraron ${suppliers.length} proveedores para procesar.\n`,
    );

    let updatedCount = 0;
    let grandTotalDebt = 0;

    // 2. Recorrer cada uno
    for (const s of suppliers) {
      // Usamos groupCollapsed para mantener la consola ordenada. Haz clic en la flecha para ver detalles.
      console.groupCollapsed(`👤 Procesando: ${s.name.toUpperCase()}`);

      // 3. Obtener sus transacciones
      const txs = await FirebaseDB.getByFilter(
        "supplier_transactions",
        "supplierId",
        s.id,
      );
      console.log(`📄 Transacciones encontradas: ${txs.length}`);

      // 4. Calcular saldo
      let realBalance = 0;
      let invoicesCount = 0;
      let paymentsCount = 0;

      txs.forEach((t) => {
        const type = (t.type || "").toLowerCase().trim();
        const amt = parseFloat(t.amount || 0);

        // Lógica de signos: Invoice suma deuda, Payment resta deuda.
        if (type === "invoice" || type === "boleta") {
          realBalance += amt;
          invoicesCount++;
        } else {
          realBalance -= amt;
          paymentsCount++;
        }
      });

      // Redondeo para evitar errores de decimales (ej: 100.00000001)
      realBalance = Math.round(realBalance * 100) / 100;

      console.log(`   ➕ Deudas (Invoices): ${invoicesCount}`);
      console.log(`   ➖ Pagos/Entregas:    ${paymentsCount}`);
      console.log(
        `   💰 SALDO CALCULADO:   $${realBalance.toLocaleString("es-AR")}`,
      );

      // 5. Guardar en DB
      // Solo actualizamos el balance, no tocamos nada más
      await FirebaseDB.update("suppliers", s.id, {
        balance: realBalance,
        lastBalanceCheck: new Date(), // Opcional: marca de cuándo se revisó
      });

      console.log(`   💾 %cGuardado exitoso en Firebase`, "color: green;");
      console.groupEnd(); // Cerramos el grupo de este proveedor

      updatedCount++;
      grandTotalDebt += realBalance;
    }

    console.log("\n---------------------------------------------------");
    console.log(
      "%c✨ SINCRONIZACIÓN FINALIZADA ✨",
      "color: #fff; background: green; padding: 5px; font-weight: bold; font-size: 14px; border-radius: 4px;",
    );
    console.log(`👉 Proveedores actualizados: ${updatedCount}`);
    console.log(
      `👉 Deuda Global del Negocio: $${grandTotalDebt.toLocaleString("es-AR")}`,
    );

    alert(
      `¡Éxito!\n\nSe han recalculado los saldos de ${updatedCount} proveedores.\nDeuda total detectada: $${grandTotalDebt.toLocaleString("es-AR")}`,
    );
  } catch (error) {
    console.error("❌ ERROR FATAL DURANTE EL RECALCULO:", error);
    alert("Hubo un error. Abre la consola (F12) para ver los detalles.");
  }
};
