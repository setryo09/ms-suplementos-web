// Catálogo de productos. Para agregar un producto nuevo, sumá un objeto acá
// siguiendo el mismo formato — no hace falta tocar ningún otro archivo.
//
// Para actualizar stock: cambiá `inStock` (producto sin variantes) o el
// `inStock` de la variante correspondiente (producto con variantes) a true/false.

const PRODUCTS = [
  {
    id: "creatina-300g",
    name: "Creatina Monohidrato Body Advance Gold Line",
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
    price: 22000,
    oldPrice: 25000,
    category: "creatina",
    badge: "Lanzamiento",
    hasVariants: true,
    variants: [
      {
        id: "pote",
        label: "Pote",
        inStock: true,
        // TODO: reemplazar por foto real del pote, sin texto superpuesto.
        image: "images/creatina-pote-300g.png",
      },
      {
        id: "paquete",
        label: "Paquete",
        inStock: true,
        // TODO: reemplazar por foto real del paquete, sin texto superpuesto.
        image: "images/Creatina-paquete-300g.png",
      },
    ],
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
    price: 46000,
    oldPrice: 50000,
    category: "proteina",
    badge: "Lanzamiento",
    hasVariants: true,
    variants: [
      {
        id: "vainilla",
        label: "Vainilla",
        inStock: true,
        // TODO: reemplazar por foto real del pote sabor vainilla, sin texto superpuesto.
        image: "images/Whey-vainilla-908g.png",
      },
      {
        id: "chocolate",
        label: "Chocolate",
        inStock: true,
        // TODO: reemplazar por foto real del pote sabor chocolate, sin texto superpuesto.
        image: "images/Whey-chocolate-908g.png",
      },
    ],
  },
];
