/**
 * Configuración centralizada del menú lateral.
 * Aquí defines qué botones aparecen en la barra de navegación.
 */
export const MENU_ITEMS = [
  {
    id: "cashflow", // Debe coincidir con la clave en routes (main.js)
    label: "Cierre Diario",
    icon: "dollar", // Asegúrate de que este icono exista en Icon.js
  },
  {
    id: "suppliers",
    label: "Proveedores",
    icon: "truckPlus", // O 'truck', verifica tu Icon.js
    requiresAdmin: false,
  },
  // Futuro: { id: "settings", label: "Configuración", icon: "gear" }
];
