export interface Intent {
    id: string;
    trainingPhrases: string[];
    response: string;
}

export const intents: Intent[] = [
    {
        id: "greeting",
        trainingPhrases: ["hola", "buenas", "buenos dias", "buenas tardes", "hey", "saludos"],
        response: "¡Hola! Soy tu asistente de inventario Nexus. ¿En qué te puedo ayudar hoy?"
    },
    {
        id: "help",
        trainingPhrases: ["ayuda", "que puedes hacer", "opciones", "como funcionas", "que es nexus", "para que sirve"],
        response: "Puedo ayudarte a resolver dudas sobre cómo gestionar bodegas, movimientos de stock, facturación, contratos y la administración de la plataforma. Pregúntame lo que necesites."
    },
    {
        id: "create_warehouse",
        trainingPhrases: ["como crear una bodega", "nueva bodega", "agregar bodega", "registrar bodega"],
        response: "Para crear una bodega, ve al módulo de 'Disponibilidad Operativa', busca la lista de 'Bodegas registradas' y haz clic en el botón 'Crear bodega'. Completa el formulario con la ubicación y capacidad."
    },
    {
        id: "space_catalog",
        trainingPhrases: ["catalogo", "ver la capacidad", "catalogo de espacios", "espacios libres", "ofertas", "ver bodegas disponibles"],
        response: "El Catálogo de Espacios te permite ver todas las opciones de almacenamiento con capacidad disponible. Es ideal para buscar dónde alojar nuevos productos o generar una renta."
    },
    {
        id: "rent_warehouse",
        trainingPhrases: ["como puedo arrendar una bodega", "quiero alquilar una bodega", "arrendar espacio", "alquiler de bodegas", "renta"],
        response: "Para arrendar una bodega, dirígete al módulo de 'Ventas y Contratos' y explora el 'Catálogo de Espacios'. Allí podrás elegir la bodega ideal y proceder al checkout interactivo para generar un acuerdo de servicio."
    },
    {
        id: "contracts",
        trainingPhrases: ["como puedo tener un contrato", "crear contrato", "ver mis contratos", "acuerdo legal", "contratos activos", "firmar contrato"],
        response: "Los contratos se administran en la sección 'Contratos Activos' de tu Dashboard. Para generar uno nuevo, primero selecciona el espacio que deseas desde el catálogo y completa la simulación de arriendo."
    },
    {
        id: "clients",
        trainingPhrases: ["clientes", "registrar cliente", "nuevo cliente", "como agregar un cliente", "ver clientes"],
        response: "En el panel principal encontrarás el módulo 'Gestión de Clientes'. Allí puedes registrar personas o empresas, agregar su información fiscal y asociarlos a tus futuros contratos de arrendamiento."
    },
    {
        id: "checkout_billing",
        trainingPhrases: ["pagar", "checkout", "facturacion", "como pagar", "cobro", "simulacion de venta"],
        response: "Nuestro sistema de Checkout incluye un asistente interactivo. Una vez que escojas las dimensiones del espacio y los servicios (almacenamiento seco o frío), verás la pre-facturación antes de confirmar el servicio."
    },
    {
        id: "movements",
        trainingPhrases: ["movimiento de stock", "ingresar mercancia", "como hacer un ingreso", "como hacer una salida", "agregar productos"],
        response: "Los movimientos (entradas, salidas o transferencias) se gestionan desde el módulo de 'Control de Inventario'. Necesitas el SKU del producto y seleccionar los sectores de origen/destino."
    },
    {
        id: "sectors",
        trainingPhrases: ["que es un sector", "como dividir una bodega", "crear sector", "sectores"],
        response: "Los sectores son subdivisiones lógicas dentro de una bodega. Debes seleccionar una bodega en 'Disponibilidad Operativa' y usar la opción 'Modelar sectores' para definir áreas."
    },
    {
        id: "users_roles",
        trainingPhrases: ["crear usuario", "roles", "permisos", "gestion de usuarios", "administrar accesos"],
        response: "La administración de usuarios se encuentra en el submenú de 'Configuración'. Solo los administradores pueden crear nuevos agentes o cambiar roles."
    },
    {
        id: "export_logs",
        trainingPhrases: ["/export logs", "/download logs", "/admin logs"],
        response: "--EXPORT_COMMAND--" 
    }
];

export const fallbackResponse = "Lo siento, no he entendido tu pregunta. Podrías intentar reformularla relacionada con bodegas, inventario o la plataforma Nexus?";
