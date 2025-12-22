/**
 * Configuración centralizada del menú lateral.
 * Aquí defines qué botones aparecen en la barra de navegación.
 */
export const MENU_ITEMS = [
  {
    id: "dashboard",
    label: "Inicio",
    icon: "dollar", // Asegúrate que este icono exista en Icon.js
    requiresAdmin: false,
  },
  {
    id: "suppliers",
    label: "Proveedores",
    icon: "truckPlus", // O 'truck', verifica tu Icon.js
    requiresAdmin: false,
  },
  // Futuro: { id: "settings", label: "Configuración", icon: "gear" }
];
