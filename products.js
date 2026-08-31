// Catálogo de productos. Para agregar un producto nuevo, sumá un objeto acá
// siguiendo el mismo formato — no hace falta tocar ningún otro archivo.
//
// Para actualizar stock: cambiá `inStock` (producto sin variantes) o el
// `inStock` de la variante correspondiente (producto con variantes) a true/false.

const PRODUCTS = [
  {
    id: "creatina-300g",
    name: "Creatina Monohidrato Body Advance",
    weight: "300g",
    shortDescription:
      "100% pura, micronizada, sin sabor. Fuerza, rendimiento y recuperación.",
    description:
      "Suplemento dietario a base de creatina monohidrato micronizada en polvo, 100% pura y sin agregado de sabor. Ayuda a mejorar la fuerza y el rendimiento físico durante entrenamientos de alta intensidad, y favorece la recuperación muscular entre sesiones.",
    features: [
      "Rinde aproximadamente 100 servicios",
      "100% creatina monohidrato pura",
      "Sin sabor — se disuelve en agua, jugo o batido",
      "Libre de gluten",
      "Industria Argentina",
    ],
    usage:
      "Diluir 1 medida (aprox. 5g) en agua, jugo o tu bebida preferida. Se recomienda tomar después del entrenamiento, o según indicación de un profesional.",
    ingredients: "Creatina monohidrato micronizada 100%.",
    warnings:
      "Suplemento dietario. No reemplaza una alimentación variada y equilibrada. Mantener fuera del alcance de los niños. Ante cualquier duda, consultar con un profesional de la salud antes de iniciar su consumo.",
    price: 25000,
    oldPrice: 30000,
    category: "creatina",
    badge: "Lanzamiento",
    // TODO: reemplazar por foto real del envase, sin texto superpuesto, fondo neutro.
    image: "images/placeholder-creatina.svg",
    hasVariants: false,
    inStock: true,
  },
  {
    id: "whey-908g-gold-line",
    name: "Whey Protein Advance Gold Line",
    weight: "908g",
    shortDescription:
      "Con BCAA's, glutamina y creatina agregada. Vainilla y Chocolate.",
    description:
      "Suplemento proteico de alta calidad, formulado con proteína de suero, BCAA's, glutamina y creatina, pensado para acompañar el crecimiento y mantenimiento de la masa muscular y mejorar la recuperación después del entrenamiento.",
    features: [
      "Línea Gold Line",
      "Aporta proteína, BCAA's, glutamina y creatina",
      "Fácil disolución",
      "Industria Argentina",
    ],
    usage:
      "Mezclar 1-2 medidas en agua, leche o tu bebida preferida, preferentemente después del entrenamiento o distribuido durante el día según tu requerimiento de proteína.",
    // TODO: completar con la información nutricional exacta del envase de cada sabor.
    ingredients: null,
    warnings:
      "Suplemento dietario. No reemplaza una alimentación variada y equilibrada. Mantener fuera del alcance de los niños. Ante cualquier duda, consultar con un profesional de la salud antes de iniciar su consumo.",
    price: 64000,
    oldPrice: 70000,
    category: "proteina",
    badge: "Lanzamiento",
    // TODO: reemplazar por foto real del envase, sin texto superpuesto, fondo neutro.
    image: "images/placeholder-proteina.svg",
    hasVariants: true,
    variants: [
      { id: "vainilla", label: "Vainilla", inStock: true },
      { id: "chocolate", label: "Chocolate", inStock: false },
    ],
  },
];
