export const products = [
  {
    id: 1,
    name: 'MacBook Pro 14"',
    type: "Laptop",
    price: 1999.99,
    description: "Apple M3 Pro chip, 18 GB RAM, 1 TB SSD — pro-level performance for creators and developers.",
    image: "https://picsum.photos/seed/macbookpro/200/200",
  },
  {
    id: 2,
    name: "iPhone 15 Pro",
    type: "Smartphone",
    price: 999.99,
    description: "Titanium build, A17 Pro chip, 48 MP camera system, USB-C with SuperSpeed transfer.",
    image: "https://picsum.photos/seed/iphone15/200/200",
  },
  {
    id: 3,
    name: "iPad Air 5th Gen",
    type: "Tablet",
    price: 599.99,
    description: "M1 chip, 10.9\" Liquid Retina display, 5G capable, USB-C connectivity.",
    image: "https://picsum.photos/seed/ipadair/200/200",
  },
  {
    id: 4,
    name: "Sony WH-1000XM5",
    type: "Headphones",
    price: 349.99,
    description: "Industry-leading noise cancellation, 30-hour battery life, multipoint Bluetooth connection.",
    image: "https://picsum.photos/seed/sonywh/200/200",
  },
  {
    id: 5,
    name: 'Samsung 65" QLED 4K TV',
    type: "Television",
    price: 1299.99,
    description: "Quantum Dot technology, 120Hz refresh rate, Neo Slim design, Tizen smart OS.",
    image: "https://picsum.photos/seed/samsungtv/200/200",
  },
  {
    id: 6,
    name: "PlayStation 5",
    type: "Gaming Console",
    price: 499.99,
    description: "Custom SSD, 4K gaming at 120fps, DualSense haptic controller, backward compatible.",
    image: "https://picsum.photos/seed/ps5console/200/200",
  },
  {
    id: 7,
    name: "Apple AirPods Pro 2",
    type: "Earbuds",
    price: 249.99,
    description: "H2 chip, Adaptive Transparency, Personalised Spatial Audio, MagSafe charging case.",
    image: "https://picsum.photos/seed/airpodspro/200/200",
  },
  {
    id: 8,
    name: "Dell XPS 15",
    type: "Laptop",
    price: 1799.99,
    description: "Intel Core i7-13700H, RTX 4060, 16 GB RAM, 15.6\" OLED InfinityEdge display.",
    image: "https://picsum.photos/seed/dellxps/200/200",
  },
  {
    id: 9,
    name: "Canon EOS R6 Mark II",
    type: "Camera",
    price: 2499.99,
    description: "40 fps burst shooting, 6K RAW video, Dual Pixel CMOS AF II, weather-sealed body.",
    image: "https://picsum.photos/seed/canoneosr6/200/200",
  },
  {
    id: 10,
    name: "Kindle Paperwhite",
    type: "E-Reader",
    price: 139.99,
    description: "6.8\" 300 ppi glare-free display, 10-week battery, USB-C, waterproof (IPX8).",
    image: "https://picsum.photos/seed/kindlepw/200/200",
  },
  {
    id: 11,
    name: "Apple Watch Series 9",
    type: "Smartwatch",
    price: 399.99,
    description: "S9 chip, always-on Retina display, Double Tap gesture, blood oxygen & ECG sensors.",
    image: "https://picsum.photos/seed/applewatch/200/200",
  },
  {
    id: 12,
    name: "Nintendo Switch OLED",
    type: "Gaming Console",
    price: 349.99,
    description: "7\" OLED screen, enhanced audio, 64 GB internal storage, wide adjustable stand.",
    image: "https://picsum.photos/seed/switcholed/200/200",
  },
];

export function getProductsHandler({ name, type, minPrice, maxPrice } = {}) {
  let result = [...products];

  if (name) {
    const q = name.toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (type) {
    const q = type.toLowerCase();
    result = result.filter((p) => p.type.toLowerCase() === q);
  }
  if (minPrice != null) {
    result = result.filter((p) => p.price >= Number(minPrice));
  }
  if (maxPrice != null) {
    result = result.filter((p) => p.price <= Number(maxPrice));
  }

  return { products: result, total: result.length };
}

export const PRODUCT_TYPES = [...new Set(products.map((p) => p.type))].sort();
