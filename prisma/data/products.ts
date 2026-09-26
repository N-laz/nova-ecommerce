// Realistic NOVA catalog. Prices in INR (GST inclusive). `img` maps to /public/products/<img>-{1,2,3}.webp
export type SeedSpec = [group: string, key: string, value: string, filterable?: boolean];
export type SeedProduct = {
  name: string;
  brand: string;
  category: string;
  img: string;
  price: number;
  mrp?: number;
  stock: number;
  tagline: string;
  description: string;
  colors: string[];
  tags: string[];
  warranty: string;
  specs: SeedSpec[];
  featured?: boolean;
  trending?: boolean;
  flash?: boolean;
  ageDays: number; // how long ago it was listed
  popularity: number; // relative weight for seeded orders
};

export const CATEGORIES = [
  { name: "Smartphones", slug: "smartphones", description: "Flagship cameras, all-day batteries and the fastest chips." },
  { name: "Laptops", slug: "laptops", description: "Ultraportables, creator machines and gaming powerhouses." },
  { name: "Tablets", slug: "tablets", description: "Big-screen productivity and entertainment that goes anywhere." },
  { name: "Audio", slug: "audio", description: "Noise-cancelling headphones, earbuds and speakers." },
  { name: "Wearables", slug: "wearables", description: "Smartwatches and fitness trackers for every routine." },
  { name: "Gaming", slug: "gaming", description: "Esports-grade mice, keyboards, headsets and consoles." },
  { name: "Desk Setup", slug: "desk-setup", description: "Keyboards, monitors, webcams and charging done right." },
  { name: "Smart Home", slug: "smart-home", description: "Speakers and cameras that make home a little smarter." },
];

export const BRANDS = [
  { name: "Apple", featured: true, description: "Designed in California." },
  { name: "Samsung", featured: true, description: "Galaxy devices and displays." },
  { name: "Google", featured: true, description: "Pixel phones, watches and Nest." },
  { name: "OnePlus", featured: false, description: "Fast and smooth flagships." },
  { name: "Nothing", featured: true, description: "Transparent design, London-made." },
  { name: "Sony", featured: true, description: "Audio, imaging and PlayStation." },
  { name: "Bose", featured: true, description: "Legendary noise cancellation." },
  { name: "Sennheiser", featured: false, description: "German audio engineering since 1945." },
  { name: "Logitech", featured: true, description: "Precision peripherals for work and play." },
  { name: "Razer", featured: false, description: "For gamers, by gamers." },
  { name: "Keychron", featured: false, description: "Premium mechanical keyboards." },
  { name: "Dell", featured: false, description: "XPS laptops and UltraSharp monitors." },
  { name: "ASUS", featured: false, description: "ROG and Zenbook innovation." },
  { name: "Garmin", featured: true, description: "GPS wearables for athletes." },
  { name: "Anker", featured: false, description: "Charging and smart home essentials." },
];

const phoneSpecs = (display: string, chip: string, ram: string, storage: string, camera: string, battery: string, os: string, weight: string, refresh: string): SeedSpec[] => [
  ["Display", "Display", display],
  ["Display", "Refresh Rate", refresh, true],
  ["Performance", "Processor", chip],
  ["Performance", "RAM", ram, true],
  ["Performance", "Storage", storage, true],
  ["Camera", "Rear Camera", camera],
  ["Battery", "Battery", battery],
  ["General", "Operating System", os, true],
  ["General", "5G", "Yes"],
  ["General", "Weight", weight],
];

const laptopSpecs = (display: string, cpu: string, gpu: string, ram: string, storage: string, battery: string, weight: string, os: string): SeedSpec[] => [
  ["Display", "Display", display],
  ["Performance", "Processor", cpu, true],
  ["Performance", "Graphics", gpu],
  ["Performance", "RAM", ram, true],
  ["Performance", "Storage", storage, true],
  ["Battery", "Battery Life", battery],
  ["General", "Weight", weight],
  ["General", "Operating System", os, true],
];

const hpSpecs = (type: string, driver: string, anc: string, battery: string, weight: string, codecs: string, charging: string, connectivity: string): SeedSpec[] => [
  ["Audio", "Type", type, true],
  ["Audio", "Driver", driver],
  ["Audio", "Noise Cancellation", anc, true],
  ["Audio", "Codecs", codecs],
  ["Battery", "Battery Life", battery],
  ["Battery", "Charging", charging],
  ["General", "Connectivity", connectivity, true],
  ["General", "Weight", weight],
];

const watchSpecs = (size: string, display: string, battery: string, gps: string, water: string, sensors: string, compat: string): SeedSpec[] => [
  ["Design", "Case Size", size, true],
  ["Display", "Display", display],
  ["Battery", "Battery Life", battery],
  ["Features", "GPS", gps, true],
  ["Features", "Water Resistance", water],
  ["Features", "Health Sensors", sensors],
  ["General", "Compatibility", compat, true],
];

export const PRODUCTS: SeedProduct[] = [
  // ───────── Smartphones ─────────
  {
    name: "iPhone 17 Pro", brand: "Apple", category: "smartphones", img: "phone-titanium", price: 134900, stock: 38, featured: true, trending: true, ageDays: 20, popularity: 10,
    tagline: "Titanium. A19 Pro. The most capable Pro camera yet.",
    description: "iPhone 17 Pro pairs a forged titanium frame with the A19 Pro chip for console-class gaming and on-device intelligence. The 48MP Fusion triple-camera system shoots 4K 120fps Dolby Vision, while the 6.3-inch ProMotion display ramps from 1Hz to 120Hz for silky scrolling and all-day efficiency.",
    colors: ["Natural Titanium", "Desert Titanium", "Black Titanium"], tags: ["iphone", "smartphone", "phone", "ios", "5g", "flagship"], warranty: "1 year Apple limited warranty",
    specs: phoneSpecs("6.3\" Super Retina XDR OLED, 2622×1206", "Apple A19 Pro", "12 GB", "256 GB", "48MP main + 48MP ultra-wide + 12MP 5× telephoto", "Up to 27 hours video playback", "iOS", "199 g", "120Hz"),
  },
  {
    name: "iPhone 17 Pro Max", brand: "Apple", category: "smartphones", img: "phone-titanium", price: 159900, stock: 22, trending: true, ageDays: 20, popularity: 8,
    tagline: "The biggest Pro display and the longest battery life on iPhone.",
    description: "A 6.9-inch ProMotion display, A19 Pro performance and the best battery life ever in an iPhone. The 5× tetraprism telephoto brings distant subjects close without losing detail, and USB-C with USB 3 speeds moves ProRes footage in seconds.",
    colors: ["Natural Titanium", "Black Titanium", "White Titanium"], tags: ["iphone", "smartphone", "phone", "ios", "5g", "flagship"], warranty: "1 year Apple limited warranty",
    specs: phoneSpecs("6.9\" Super Retina XDR OLED, 2868×1320", "Apple A19 Pro", "12 GB", "256 GB", "48MP main + 48MP ultra-wide + 12MP 5× telephoto", "Up to 33 hours video playback", "iOS", "227 g", "120Hz"),
  },
  {
    name: "Samsung Galaxy S25 Ultra", brand: "Samsung", category: "smartphones", img: "phone-galaxy", price: 119999, mrp: 129999, stock: 30, featured: true, flash: true, ageDays: 210, popularity: 9,
    tagline: "Built-in S Pen. 200MP camera. Galaxy AI.",
    description: "Galaxy S25 Ultra brings the Snapdragon 8 Elite for Galaxy, a 200MP ProVisual camera and a titanium frame with the S Pen tucked inside. The 6.9-inch anti-reflective Dynamic AMOLED 2X display stays readable in harsh sunlight, and seven years of OS updates keep it current.",
    colors: ["Titanium Silverblue", "Titanium Black", "Titanium Gray"], tags: ["galaxy", "android", "smartphone", "phone", "s pen", "5g", "flagship"], warranty: "1 year manufacturer warranty",
    specs: phoneSpecs("6.9\" QHD+ Dynamic AMOLED 2X", "Snapdragon 8 Elite for Galaxy", "12 GB", "256 GB", "200MP main + 50MP ultra-wide + 50MP 5× + 10MP 3×", "5000 mAh, 45W wired", "Android", "218 g", "120Hz"),
  },
  {
    name: "Google Pixel 10 Pro", brand: "Google", category: "smartphones", img: "phone-pixel", price: 109999, stock: 26, trending: true, ageDays: 34, popularity: 7,
    tagline: "Tensor G5. The smartest Pixel camera ever.",
    description: "Pixel 10 Pro is built around Google Tensor G5 and Gemini Nano for helpful on-device AI. Super Res Zoom reaches 100×, Night Sight video brightens the dark, and a 6.3-inch Super Actua display hits 3000 nits outdoors. Seven years of Pixel Drops included.",
    colors: ["Porcelain", "Obsidian", "Moonstone"], tags: ["pixel", "android", "smartphone", "phone", "5g", "camera"], warranty: "1 year Google warranty",
    specs: phoneSpecs("6.3\" Super Actua LTPO OLED", "Google Tensor G5", "16 GB", "256 GB", "50MP main + 48MP ultra-wide + 48MP 5× telephoto", "4870 mAh, 30W wired", "Android", "207 g", "120Hz"),
  },
  {
    name: "Nothing Phone (3)", brand: "Nothing", category: "smartphones", img: "phone-nothing", price: 79999, mrp: 84999, stock: 44, featured: true, trending: true, ageDays: 70, popularity: 8,
    tagline: "Glyph Matrix. Transparent by design.",
    description: "Nothing Phone (3) introduces the Glyph Matrix — a monochrome micro-LED display on the back for notifications, timers and Glyph Toys. Snapdragon 8s Gen 4, a 50MP periscope and the clean, fast Nothing OS make it the most distinctive flagship of the year.",
    colors: ["White", "Black"], tags: ["nothing", "android", "smartphone", "phone", "5g", "glyph"], warranty: "1 year Nothing warranty",
    specs: phoneSpecs("6.67\" Flexible AMOLED, 1.5K", "Snapdragon 8s Gen 4", "12 GB", "256 GB", "50MP main + 50MP periscope + 50MP ultra-wide", "5150 mAh, 65W wired", "Android", "218 g", "120Hz"),
  },
  {
    name: "OnePlus 13", brand: "OnePlus", category: "smartphones", img: "phone-oneplus", price: 69999, mrp: 72999, stock: 52, ageDays: 260, popularity: 7,
    tagline: "Hasselblad camera. 6000 mAh. Snapdragon 8 Elite.",
    description: "OnePlus 13 combines a massive 6000 mAh silicon-carbon battery with 100W SUPERVOOC charging and the Snapdragon 8 Elite. The fourth-gen Hasselblad camera system delivers natural colour, and IP69 protection shrugs off water jets and dust.",
    colors: ["Midnight Ocean", "Arctic Dawn", "Black Eclipse"], tags: ["oneplus", "android", "smartphone", "phone", "5g", "fast charging"], warranty: "1 year OnePlus warranty",
    specs: phoneSpecs("6.82\" 2K ProXDR LTPO AMOLED", "Snapdragon 8 Elite", "12 GB", "256 GB", "50MP main + 50MP 3× + 50MP ultra-wide", "6000 mAh, 100W wired", "Android", "213 g", "120Hz"),
  },
  {
    name: "Samsung Galaxy Z Fold7", brand: "Samsung", category: "smartphones", img: "phone-fold", price: 174999, mrp: 184999, stock: 9, ageDays: 60, popularity: 4,
    tagline: "Our thinnest, lightest Fold — a tablet in your pocket.",
    description: "Galaxy Z Fold7 opens into an 8-inch canvas for multitasking and closes to a pocketable 8.9mm. A 200MP camera, Snapdragon 8 Elite for Galaxy and Galaxy AI features like Drawing Assist make it a genuine productivity machine.",
    colors: ["Silver Shadow", "Blue Shadow", "Jetblack"], tags: ["galaxy", "fold", "foldable", "android", "smartphone", "phone", "5g"], warranty: "1 year manufacturer warranty",
    specs: phoneSpecs("8.0\" QXGA+ foldable + 6.5\" cover", "Snapdragon 8 Elite for Galaxy", "12 GB", "512 GB", "200MP main + 12MP ultra-wide + 10MP 3×", "4400 mAh, 25W wired", "Android", "215 g", "120Hz"),
  },

  // ───────── Laptops ─────────
  {
    name: "MacBook Air 15\" (M4)", brand: "Apple", category: "laptops", img: "laptop-mac", price: 124900, mrp: 129900, stock: 24, featured: true, ageDays: 190, popularity: 7,
    tagline: "Impossibly thin. Now with M4 and 16GB unified memory.",
    description: "The 15-inch MacBook Air with M4 is fanless, silent and just 11.5mm thin. It drives two external displays, lasts up to 18 hours on battery and runs Apple Intelligence on-device. The Liquid Retina display and six-speaker sound system make it as good for films as for spreadsheets.",
    colors: ["Sky Blue", "Midnight", "Starlight", "Silver"], tags: ["macbook", "laptop", "apple", "macos", "ultrabook"], warranty: "1 year Apple limited warranty",
    specs: laptopSpecs("15.3\" Liquid Retina, 2880×1864", "Apple M4", "10-core GPU", "16 GB", "512 GB SSD", "Up to 18 hours", "1.51 kg", "macOS"),
  },
  {
    name: "MacBook Pro 14\" (M4 Pro)", brand: "Apple", category: "laptops", img: "laptop-mac", price: 199900, stock: 14, trending: true, ageDays: 300, popularity: 5,
    tagline: "Pro performance with a nano-texture option and Thunderbolt 5.",
    description: "MacBook Pro with M4 Pro chews through 8K timelines and large code builds while staying cool and quiet. The Liquid Retina XDR display hits 1600 nits HDR, Thunderbolt 5 ports move data at 120Gb/s, and battery life reaches 22 hours.",
    colors: ["Space Black", "Silver"], tags: ["macbook", "laptop", "apple", "macos", "pro", "creator"], warranty: "1 year Apple limited warranty",
    specs: laptopSpecs("14.2\" Liquid Retina XDR, 3024×1964, 120Hz", "Apple M4 Pro", "16-core GPU", "24 GB", "512 GB SSD", "Up to 22 hours", "1.60 kg", "macOS"),
  },
  {
    name: "Dell XPS 14", brand: "Dell", category: "laptops", img: "laptop-xps", price: 169990, mrp: 189990, stock: 11, flash: true, ageDays: 150, popularity: 4,
    tagline: "Edge-to-edge glass. Intel Core Ultra. OLED.",
    description: "The XPS 14 carves its chassis from a single block of aluminium and hides a zero-lattice keyboard and seamless glass touchpad. Intel Core Ultra 7 with an NPU for Copilot+ features, NVIDIA GeForce RTX 4050 graphics and a 3.2K OLED touch display make it a true creator ultrabook.",
    colors: ["Platinum", "Graphite"], tags: ["xps", "laptop", "windows", "oled", "ultrabook"], warranty: "1 year Dell onsite warranty",
    specs: laptopSpecs("14.5\" 3.2K OLED touch, 120Hz", "Intel Core Ultra 7", "NVIDIA RTX 4050", "32 GB", "1 TB SSD", "Up to 13 hours", "1.68 kg", "Windows 11"),
  },
  {
    name: "ASUS ROG Zephyrus G16", brand: "ASUS", category: "laptops", img: "laptop-gaming", price: 259990, mrp: 279990, stock: 7, trending: true, ageDays: 120, popularity: 4,
    tagline: "RTX 5080 power in a 1.85 kg aluminium chassis.",
    description: "Zephyrus G16 squeezes an NVIDIA GeForce RTX 5080 and Intel Core Ultra 9 into a CNC-milled aluminium body under 1.5cm thick. The 2.5K 240Hz ROG Nebula OLED display is G-SYNC enabled, and the Slash Lighting bar adds just enough personality.",
    colors: ["Eclipse Gray", "Platinum White"], tags: ["rog", "laptop", "gaming laptop", "windows", "rtx"], warranty: "2 years ASUS warranty",
    specs: laptopSpecs("16\" 2.5K ROG Nebula OLED, 240Hz", "Intel Core Ultra 9", "NVIDIA RTX 5080", "32 GB", "2 TB SSD", "Up to 8 hours", "1.85 kg", "Windows 11"),
  },
  {
    name: "ASUS Zenbook 14 OLED", brand: "ASUS", category: "laptops", img: "laptop-xps", price: 94990, mrp: 109990, stock: 29, ageDays: 240, popularity: 6,
    tagline: "All-day Copilot+ PC with a 3K OLED display.",
    description: "Zenbook 14 OLED weighs just 1.2 kg yet runs for up to 20 hours thanks to AMD Ryzen AI 9 efficiency. The 3K 120Hz Lumina OLED is Pantone validated, and the Ceraluminum lid resists scratches while feeling premium in the hand.",
    colors: ["Jade Black", "Scandinavian White"], tags: ["zenbook", "laptop", "windows", "oled", "ultrabook", "copilot"], warranty: "1 year ASUS warranty",
    specs: laptopSpecs("14\" 3K Lumina OLED, 120Hz", "AMD Ryzen AI 9", "AMD Radeon 880M", "16 GB", "1 TB SSD", "Up to 20 hours", "1.20 kg", "Windows 11"),
  },

  // ───────── Tablets ─────────
  {
    name: "iPad Pro 13\" (M4)", brand: "Apple", category: "tablets", img: "tablet-ipad", price: 139900, stock: 16, featured: true, ageDays: 330, popularity: 5,
    tagline: "Thinnest Apple product ever. Tandem OLED.",
    description: "At 5.1mm, iPad Pro is astonishingly thin, yet the M4 chip delivers pro-level performance for Final Cut and Procreate. The Ultra Retina XDR tandem OLED display reaches 1600 nits peak HDR brightness, and Apple Pencil Pro adds squeeze and barrel-roll gestures.",
    colors: ["Space Black", "Silver"], tags: ["ipad", "tablet", "apple", "ipados", "oled"], warranty: "1 year Apple limited warranty",
    specs: [["Display", "Display", "13\" Ultra Retina XDR tandem OLED"], ["Performance", "Processor", "Apple M4"], ["Performance", "Storage", "256 GB", true], ["Connectivity", "Cellular", "Wi-Fi", true], ["Battery", "Battery Life", "Up to 10 hours"], ["General", "Weight", "579 g"], ["General", "Operating System", "iPadOS", true]],
  },
  {
    name: "iPad Air 11\" (M3)", brand: "Apple", category: "tablets", img: "tablet-ipad", price: 59900, stock: 34, ageDays: 180, popularity: 6,
    tagline: "Serious performance in a light, colourful design.",
    description: "iPad Air with M3 brings desktop-class performance and Apple Intelligence to a light, portable design. Pair it with Apple Pencil Pro and the Magic Keyboard for notes, sketches and study sessions that last all day.",
    colors: ["Blue", "Purple", "Starlight", "Space Gray"], tags: ["ipad", "tablet", "apple", "ipados"], warranty: "1 year Apple limited warranty",
    specs: [["Display", "Display", "11\" Liquid Retina"], ["Performance", "Processor", "Apple M3"], ["Performance", "Storage", "128 GB", true], ["Connectivity", "Cellular", "Wi-Fi", true], ["Battery", "Battery Life", "Up to 10 hours"], ["General", "Weight", "460 g"], ["General", "Operating System", "iPadOS", true]],
  },
  {
    name: "Samsung Galaxy Tab S10 Ultra", brand: "Samsung", category: "tablets", img: "tablet-galaxy", price: 108999, mrp: 119999, stock: 12, ageDays: 280, popularity: 3,
    tagline: "14.6\" of Dynamic AMOLED with S Pen included.",
    description: "Galaxy Tab S10 Ultra is a 14.6-inch canvas with an anti-reflective Dynamic AMOLED 2X display and an S Pen in the box. MediaTek Dimensity 9300+ performance, quad AKG speakers and IP68 protection make it the most capable Android tablet available.",
    colors: ["Moonstone Gray", "Platinum Silver"], tags: ["galaxy tab", "tablet", "android", "s pen", "amoled"], warranty: "1 year manufacturer warranty",
    specs: [["Display", "Display", "14.6\" Dynamic AMOLED 2X, 120Hz"], ["Performance", "Processor", "MediaTek Dimensity 9300+"], ["Performance", "Storage", "256 GB", true], ["Connectivity", "Cellular", "Wi-Fi", true], ["Battery", "Battery Life", "11200 mAh"], ["General", "Weight", "718 g"], ["General", "Operating System", "Android", true]],
  },

  // ───────── Audio ─────────
  {
    name: "Sony WH-1000XM6", brand: "Sony", category: "audio", img: "hp-sony", price: 39990, mrp: 42990, stock: 41, featured: true, trending: true, ageDays: 110, popularity: 10,
    tagline: "The best noise cancelling Sony has ever made.",
    description: "WH-1000XM6 uses the new HD Noise Cancelling Processor QN3 and twelve microphones to adapt cancellation to your surroundings in real time. Newly designed 30mm carbon-fibre drivers deliver studio-tuned sound, and the redesigned folding hinge makes them easier to travel with.",
    colors: ["Black", "Platinum Silver", "Midnight Blue"], tags: ["headphones", "wireless headphones", "noise cancelling", "anc", "over-ear", "sony"], warranty: "1 year Sony India warranty",
    specs: hpSpecs("Over-ear", "30 mm carbon fibre", "Adaptive ANC (QN3, 12 mics)", "Up to 30 hours (ANC on)", "254 g", "LDAC, AAC, SBC, LC3", "USB-C, 3 min = 3 hrs", "Bluetooth 5.3, multipoint"),
  },
  {
    name: "Bose QuietComfort Ultra Headphones", brand: "Bose", category: "audio", img: "hp-bose", price: 35900, mrp: 39900, stock: 27, trending: true, flash: true, ageDays: 400, popularity: 8,
    tagline: "World-class quiet with immersive spatial audio.",
    description: "QuietComfort Ultra Headphones combine Bose's signature CustomTune noise cancellation with Immersive Audio that makes music feel like it's playing around you. Plush protein-leather cushions and a balanced clamp keep them comfortable on long flights.",
    colors: ["Black", "White Smoke", "Lunar Blue"], tags: ["headphones", "wireless headphones", "noise cancelling", "anc", "over-ear", "bose"], warranty: "1 year Bose India warranty",
    specs: hpSpecs("Over-ear", "35 mm", "CustomTune ANC", "Up to 24 hours", "250 g", "aptX Adaptive, AAC, SBC", "USB-C, 15 min = 2.5 hrs", "Bluetooth 5.3, multipoint"),
  },
  {
    name: "AirPods Max", brand: "Apple", category: "audio", img: "hp-max", price: 59900, stock: 0, featured: true, ageDays: 380, popularity: 5,
    tagline: "High-fidelity audio with computational magic.",
    description: "AirPods Max pairs custom 40mm dynamic drivers with the H1 chip in each ear cup for Adaptive EQ, Active Noise Cancellation and Personalised Spatial Audio with dynamic head tracking. The knit-mesh canopy and memory-foam cushions distribute weight evenly for a premium fit.",
    colors: ["Midnight", "Starlight", "Blue", "Purple", "Orange"], tags: ["headphones", "wireless headphones", "noise cancelling", "anc", "over-ear", "airpods", "apple"], warranty: "1 year Apple limited warranty",
    specs: hpSpecs("Over-ear", "40 mm Apple dynamic", "Active Noise Cancellation", "Up to 20 hours", "385 g", "AAC, SBC", "USB-C, 5 min = 1.5 hrs", "Bluetooth 5.0"),
  },
  {
    name: "Sennheiser Momentum 4 Wireless", brand: "Sennheiser", category: "audio", img: "hp-senn", price: 27990, mrp: 34990, stock: 19, flash: true, ageDays: 520, popularity: 5,
    tagline: "60-hour battery and audiophile sound.",
    description: "Momentum 4 Wireless delivers Sennheiser's signature detailed sound through 42mm transducers, with adaptive noise cancellation and an astonishing 60-hour battery life. The customisable EQ and Sound Zones in the Smart Control app tailor every listen.",
    colors: ["Black", "White", "Graphite"], tags: ["headphones", "wireless headphones", "noise cancelling", "anc", "over-ear", "sennheiser", "audiophile"], warranty: "2 years Sennheiser warranty",
    specs: hpSpecs("Over-ear", "42 mm transducer", "Adaptive ANC", "Up to 60 hours", "293 g", "aptX Adaptive, AAC, SBC", "USB-C, 10 min = 6 hrs", "Bluetooth 5.2, multipoint"),
  },
  {
    name: "AirPods Pro 3", brand: "Apple", category: "audio", img: "buds-white", price: 25900, stock: 63, trending: true, featured: true, ageDays: 14, popularity: 10,
    tagline: "Twice the noise cancellation. Heart-rate sensing.",
    description: "AirPods Pro 3 doubles Active Noise Cancellation, adds heart-rate sensing for workouts and introduces Live Translation. Foam-infused ear tips improve seal and comfort, while Adaptive Audio blends cancellation and transparency automatically.",
    colors: ["White"], tags: ["earbuds", "true wireless", "tws", "noise cancelling", "anc", "airpods", "apple"], warranty: "1 year Apple limited warranty",
    specs: hpSpecs("In-ear", "Apple custom driver", "Active Noise Cancellation", "Up to 8 hours (24 with case)", "5.6 g per bud", "AAC", "USB-C / MagSafe", "Bluetooth 5.3"),
  },
  {
    name: "Nothing Ear", brand: "Nothing", category: "audio", img: "buds-clear", price: 11999, mrp: 13999, stock: 58, trending: true, ageDays: 190, popularity: 8,
    tagline: "Transparent design, Hi-Res sound, smart ANC.",
    description: "Nothing Ear pairs an 11mm ceramic driver with LDAC Hi-Res wireless for rich, detailed sound. Smart ANC checks for noise leakage and adjusts every 600ms, and the transparent case charges wirelessly.",
    colors: ["White", "Black"], tags: ["earbuds", "true wireless", "tws", "noise cancelling", "anc", "nothing"], warranty: "1 year Nothing warranty",
    specs: hpSpecs("In-ear", "11 mm ceramic", "Smart ANC (up to 45 dB)", "Up to 8.5 hours (40.5 with case)", "4.6 g per bud", "LDAC, AAC, SBC", "USB-C / Qi wireless", "Bluetooth 5.3, multipoint"),
  },
  {
    name: "Sony WF-1000XM5", brand: "Sony", category: "audio", img: "buds-white", price: 21990, mrp: 29990, stock: 4, flash: true, ageDays: 600, popularity: 6,
    tagline: "The best noise cancelling earbuds, now smaller.",
    description: "WF-1000XM5 are 25% smaller than their predecessor yet cancel more noise, thanks to two processors and three mics per bud. The 8.4mm Dynamic Driver X delivers deep bass and clear vocals, and LDAC keeps Hi-Res Audio intact.",
    colors: ["Black", "Platinum Silver"], tags: ["earbuds", "true wireless", "tws", "noise cancelling", "anc", "sony"], warranty: "1 year Sony India warranty",
    specs: hpSpecs("In-ear", "8.4 mm Dynamic Driver X", "Dual-processor ANC", "Up to 8 hours (24 with case)", "5.9 g per bud", "LDAC, AAC, SBC, LC3", "USB-C / Qi wireless", "Bluetooth 5.3, multipoint"),
  },
  {
    name: "Anker Soundcore Motion X600", brand: "Anker", category: "audio", img: "speaker", price: 17999, mrp: 22999, stock: 21, ageDays: 450, popularity: 4,
    tagline: "Spatial audio in a portable speaker.",
    description: "Motion X600 uses five drivers including an upward-firing unit to create room-filling spatial audio at 50W. LDAC Hi-Res wireless, a built-in handle and IPX7 water resistance make it the premium speaker for balconies and beach trips.",
    colors: ["Polar Grey", "Aurora Green"], tags: ["speaker", "bluetooth speaker", "portable speaker", "soundcore", "anker"], warranty: "18 months Anker warranty",
    specs: [["Audio", "Type", "Speaker", true], ["Audio", "Output", "50 W, 5 drivers"], ["Audio", "Noise Cancellation", "Not applicable", true], ["Audio", "Codecs", "LDAC, SBC"], ["Battery", "Battery Life", "Up to 12 hours"], ["General", "Connectivity", "Bluetooth 5.3", true], ["General", "Water Resistance", "IPX7"], ["General", "Weight", "1.9 kg"]],
  },

  // ───────── Wearables ─────────
  {
    name: "Apple Watch Series 11", brand: "Apple", category: "wearables", img: "watch-apple", price: 46900, stock: 33, trending: true, featured: true, ageDays: 12, popularity: 8,
    tagline: "Thinner. Tougher display. Sleep score and hypertension alerts.",
    description: "Apple Watch Series 11 adds a more scratch-resistant display, 24-hour battery life and Sleep Score. Hypertension notifications, ECG and blood-oxygen sensing support your health, while watchOS brings new workout coaching and smart stack widgets.",
    colors: ["Jet Black", "Rose Gold", "Silver", "Space Gray"], tags: ["smartwatch", "watch", "apple watch", "fitness", "health"], warranty: "1 year Apple limited warranty",
    specs: watchSpecs("46 mm", "LTPO3 OLED Always-On Retina", "Up to 24 hours", "Yes", "50 m (WR50)", "ECG, SpO₂, heart rate, temperature", "iOS"),
  },
  {
    name: "Apple Watch Ultra 3", brand: "Apple", category: "wearables", img: "watch-ultra", price: 89900, stock: 12, featured: true, ageDays: 12, popularity: 5,
    tagline: "The ultimate sports and adventure watch — now with satellite SOS.",
    description: "Apple Watch Ultra 3 features a 49mm titanium case, the biggest and brightest Apple Watch display yet, and up to 42 hours of battery. Precision dual-frequency GPS, an 86-decibel siren and Emergency SOS via satellite are built for the backcountry.",
    colors: ["Natural Titanium", "Black Titanium"], tags: ["smartwatch", "watch", "apple watch", "ultra", "outdoor", "fitness"], warranty: "1 year Apple limited warranty",
    specs: watchSpecs("49 mm", "Wide-angle LTPO3 OLED, 3000 nits", "Up to 42 hours", "Dual-frequency", "100 m (WR100), EN13319 dive", "ECG, SpO₂, heart rate, depth gauge", "iOS"),
  },
  {
    name: "Samsung Galaxy Watch8 Classic", brand: "Samsung", category: "wearables", img: "watch-round", price: 36999, mrp: 39999, stock: 18, ageDays: 75, popularity: 5,
    tagline: "The rotating bezel is back. With Antioxidant Index.",
    description: "Galaxy Watch8 Classic brings back the physical rotating bezel on a 46mm stainless steel case. Bedtime Guidance, Vascular Load and the new Antioxidant Index give deeper insights, while Gemini on the wrist handles quick requests hands-free.",
    colors: ["Black", "White"], tags: ["smartwatch", "watch", "galaxy watch", "fitness", "wear os"], warranty: "1 year manufacturer warranty",
    specs: watchSpecs("46 mm", "1.34\" Super AMOLED, sapphire crystal", "Up to 40 hours", "Yes", "5 ATM + IP68", "BioActive sensor: HR, ECG, BIA, SpO₂", "Android"),
  },
  {
    name: "Google Pixel Watch 4", brand: "Google", category: "wearables", img: "watch-round", price: 39900, stock: 20, ageDays: 30, popularity: 4,
    tagline: "Domed Actua display and Fitbit's best coaching.",
    description: "Pixel Watch 4 wraps a domed Actua display in recycled aluminium and brings Gemini to your wrist. Fitbit's personal health coach, Loss of Pulse Detection and satellite SOS make it a thoughtful companion for Pixel users.",
    colors: ["Matte Black", "Polished Silver", "Champagne Gold"], tags: ["smartwatch", "watch", "pixel watch", "fitbit", "wear os"], warranty: "1 year Google warranty",
    specs: watchSpecs("45 mm", "Domed Actua AMOLED, 3000 nits", "Up to 40 hours", "Dual-frequency", "5 ATM + IP68", "HR, ECG, SpO₂, skin temperature", "Android"),
  },
  {
    name: "Garmin fēnix 8 AMOLED", brand: "Garmin", category: "wearables", img: "watch-garmin", price: 104990, stock: 8, ageDays: 360, popularity: 3,
    tagline: "Multisport GPS with built-in speaker and dive rating.",
    description: "fēnix 8 AMOLED is built for athletes and adventurers, with a sapphire lens, titanium bezel and up to 16 days of battery. Built-in LED flashlight, speaker and mic for voice commands, topo maps and 40m dive rating cover every expedition.",
    colors: ["Slate Gray", "Bare Titanium"], tags: ["smartwatch", "watch", "garmin", "gps watch", "outdoor", "running", "multisport"], warranty: "2 years Garmin India warranty",
    specs: watchSpecs("47 mm", "1.4\" AMOLED, sapphire", "Up to 16 days", "Multi-band", "10 ATM, 40 m dive", "Elevate Gen5 HR, SpO₂, HRV", "iOS & Android"),
  },
  {
    name: "Garmin Forerunner 965", brand: "Garmin", category: "wearables", img: "watch-garmin", price: 59990, mrp: 64990, stock: 15, ageDays: 540, popularity: 4,
    tagline: "The runner's watch with an AMOLED display.",
    description: "Forerunner 965 gives serious runners and triathletes training readiness, race predictor and daily suggested workouts on a bright AMOLED touchscreen. Full-colour maps and up to 23 days of battery make it a training partner you'll never outrun.",
    colors: ["Carbon Gray", "Whitestone"], tags: ["smartwatch", "watch", "garmin", "gps watch", "running", "triathlon"], warranty: "2 years Garmin India warranty",
    specs: watchSpecs("47 mm", "1.4\" AMOLED", "Up to 23 days", "Multi-band", "5 ATM", "Elevate Gen4 HR, SpO₂, HRV", "iOS & Android"),
  },

  // ───────── Gaming ─────────
  {
    name: "Razer DeathAdder V3 Pro", brand: "Razer", category: "gaming", img: "mouse-gaming", price: 14999, mrp: 16999, stock: 36, trending: true, ageDays: 420, popularity: 7,
    tagline: "63 g of esports-grade ergonomics.",
    description: "DeathAdder V3 Pro refines the iconic ergonomic shape to just 63g. The Focus Pro 30K optical sensor, Gen-3 optical switches and HyperSpeed wireless with up to 4000Hz polling give pros the edge they demand.",
    colors: ["Black", "White"], tags: ["gaming mouse", "mouse", "wireless mouse", "esports", "razer"], warranty: "2 years Razer warranty",
    specs: [["Performance", "Type", "Mouse", true], ["Performance", "Sensor", "Focus Pro 30K optical"], ["Performance", "Polling Rate", "Up to 4000 Hz"], ["General", "Connectivity", "Wireless", true], ["General", "Weight", "63 g"], ["Battery", "Battery Life", "Up to 90 hours"]],
  },
  {
    name: "Logitech G PRO X SUPERLIGHT 2", brand: "Logitech", category: "gaming", img: "mouse-gaming", price: 13995, mrp: 16995, stock: 45, ageDays: 480, popularity: 7,
    tagline: "60 g. HERO 2 sensor. LIGHTFORCE switches.",
    description: "Designed with top esports pros, PRO X SUPERLIGHT 2 weighs 60g and uses the HERO 2 sensor with 32,000 DPI and 2kHz polling. Hybrid optical-mechanical LIGHTFORCE switches deliver crisp, reliable clicks match after match.",
    colors: ["Black", "White", "Magenta"], tags: ["gaming mouse", "mouse", "wireless mouse", "esports", "logitech"], warranty: "2 years Logitech warranty",
    specs: [["Performance", "Type", "Mouse", true], ["Performance", "Sensor", "HERO 2, 32K DPI"], ["Performance", "Polling Rate", "Up to 2000 Hz"], ["General", "Connectivity", "Wireless", true], ["General", "Weight", "60 g"], ["Battery", "Battery Life", "Up to 95 hours"]],
  },
  {
    name: "Razer BlackWidow V4 Pro", brand: "Razer", category: "gaming", img: "kb-gaming", price: 21999, mrp: 24999, stock: 14, ageDays: 500, popularity: 3,
    tagline: "Command dial, macro keys and per-key Chroma.",
    description: "BlackWidow V4 Pro is a full-size battlestation keyboard with Razer Green mechanical switches, a multifunction command dial, eight dedicated macro keys and underglow Chroma RGB. The plush magnetic wrist rest makes marathon sessions comfortable.",
    colors: ["Black"], tags: ["gaming keyboard", "keyboard", "mechanical keyboard", "rgb", "razer"], warranty: "2 years Razer warranty",
    specs: [["Performance", "Type", "Keyboard", true], ["Performance", "Switches", "Razer Green (clicky)"], ["Performance", "Layout", "Full size"], ["General", "Connectivity", "Wired", true], ["General", "Lighting", "Razer Chroma RGB"]],
  },
  {
    name: "Razer BlackShark V2 Pro", brand: "Razer", category: "gaming", img: "headset-gaming", price: 17999, mrp: 19999, stock: 23, ageDays: 350, popularity: 5,
    tagline: "Esports headset with a super-wideband mic.",
    description: "BlackShark V2 Pro delivers crystal-clear comms with its detachable HyperClear super-wideband microphone and precise positional audio from TriForce Titanium 50mm drivers. 70-hour battery and dual HyperSpeed + Bluetooth connectivity cover PC, PlayStation and mobile.",
    colors: ["Black", "White"], tags: ["gaming headset", "headset", "headphones", "wireless", "razer"], warranty: "2 years Razer warranty",
    specs: [["Performance", "Type", "Headset", true], ["Audio", "Driver", "TriForce Titanium 50 mm"], ["Audio", "Microphone", "HyperClear super-wideband, detachable"], ["General", "Connectivity", "Wireless", true], ["Battery", "Battery Life", "Up to 70 hours"], ["General", "Weight", "320 g"]],
  },
  {
    name: "Logitech G PRO X 2 LIGHTSPEED", brand: "Logitech", category: "gaming", img: "headset-gaming", price: 22995, mrp: 24995, stock: 10, ageDays: 440, popularity: 3,
    tagline: "Graphene drivers for pro-level clarity.",
    description: "PRO X 2 introduces 50mm graphene drivers for lower distortion and faster response, heard in every footstep. LIGHTSPEED wireless, Bluetooth and 3.5mm connectivity with 50+ hour battery make it the pro's choice.",
    colors: ["Black", "White", "Magenta"], tags: ["gaming headset", "headset", "headphones", "wireless", "logitech"], warranty: "2 years Logitech warranty",
    specs: [["Performance", "Type", "Headset", true], ["Audio", "Driver", "50 mm graphene"], ["Audio", "Microphone", "6 mm cardioid, detachable"], ["General", "Connectivity", "Wireless", true], ["Battery", "Battery Life", "Up to 50 hours"], ["General", "Weight", "345 g"]],
  },
  {
    name: "Sony DualSense Edge Wireless Controller", brand: "Sony", category: "gaming", img: "controller", price: 18990, stock: 17, ageDays: 560, popularity: 4,
    tagline: "Pro controller with swappable sticks and back buttons.",
    description: "DualSense Edge adds replaceable stick modules, adjustable trigger stops and mappable back buttons to the immersive haptics and adaptive triggers of DualSense. Save control profiles and switch on the fly without leaving the game.",
    colors: ["White"], tags: ["controller", "gamepad", "playstation", "ps5", "sony"], warranty: "1 year Sony India warranty",
    specs: [["Performance", "Type", "Controller", true], ["Features", "Haptics", "Haptic feedback, adaptive triggers"], ["Features", "Back Buttons", "2, remappable"], ["General", "Connectivity", "Wireless", true], ["General", "Compatibility", "PS5, PC"]],
  },
  {
    name: "PlayStation 5 Pro", brand: "Sony", category: "gaming", img: "console", price: 54990, stock: 0, trending: true, ageDays: 320, popularity: 6,
    tagline: "The most powerful PlayStation ever.",
    description: "PS5 Pro delivers up to 45% faster rendering, advanced ray tracing and PlayStation Spectral Super Resolution AI upscaling for sharper visuals at higher frame rates. 2TB SSD storage, Wi-Fi 7 and the DualSense controller included.",
    colors: ["White"], tags: ["console", "playstation", "ps5", "gaming", "sony"], warranty: "1 year Sony India warranty",
    specs: [["Performance", "Type", "Console", true], ["Performance", "Storage", "2 TB SSD", true], ["Performance", "Resolution", "Up to 8K output, 4K 120fps"], ["General", "Connectivity", "Wired", true], ["General", "In the box", "DualSense controller, HDMI cable"]],
  },

  // ───────── Desk Setup ─────────
  {
    name: "Keychron Q1 Max", brand: "Keychron", category: "desk-setup", img: "kb-mech", price: 21499, stock: 25, featured: true, trending: true, ageDays: 280, popularity: 6,
    tagline: "Full-aluminium 75% wireless mechanical keyboard.",
    description: "Q1 Max is CNC-machined from a solid block of aluminium with a double-gasket design for a soft, muted typing feel. Hot-swappable Gateron Jupiter switches, QMK/VIA programmability and 2.4GHz + Bluetooth wireless make it the definitive enthusiast keyboard.",
    colors: ["Carbon Black", "Shell White", "Silver Grey"], tags: ["mechanical keyboard", "keyboard", "wireless keyboard", "custom keyboard", "keychron"], warranty: "1 year Keychron warranty",
    specs: [["Performance", "Type", "Keyboard", true], ["Performance", "Layout", "75%", true], ["Performance", "Switches", "Gateron Jupiter Banana (hot-swappable)"], ["General", "Connectivity", "Wireless", true], ["General", "Body", "CNC aluminium, double gasket"], ["Battery", "Battery Life", "Up to 100 hours"]],
  },
  {
    name: "Keychron K2 HE", brand: "Keychron", category: "desk-setup", img: "kb-mech", price: 13999, stock: 31, ageDays: 40, popularity: 5,
    tagline: "Magnetic Hall-effect switches with rapid trigger.",
    description: "K2 HE brings Hall-effect magnetic switches to Keychron's classic 75% layout with a wooden side frame. Adjustable actuation from 0.1mm to 4.0mm and rapid trigger make it as good for gaming as for typing.",
    colors: ["Wood & Black", "Wood & White"], tags: ["mechanical keyboard", "keyboard", "hall effect", "wireless keyboard", "keychron"], warranty: "1 year Keychron warranty",
    specs: [["Performance", "Type", "Keyboard", true], ["Performance", "Layout", "75%", true], ["Performance", "Switches", "Gateron magnetic (Hall-effect)"], ["General", "Connectivity", "Wireless", true], ["General", "Body", "ABS with wooden frame"], ["Battery", "Battery Life", "Up to 180 hours"]],
  },
  {
    name: "Logitech MX Master 3S", brand: "Logitech", category: "desk-setup", img: "mouse-mx", price: 9995, mrp: 10995, stock: 70, featured: true, ageDays: 620, popularity: 9,
    tagline: "Quiet clicks. 8K DPI. MagSpeed scrolling.",
    description: "MX Master 3S is the productivity mouse perfected, with quiet clicks, an 8000 DPI sensor that tracks on glass and the MagSpeed electromagnetic scroll wheel that flies through 1000 lines a second. Pair with up to three devices and switch instantly.",
    colors: ["Graphite", "Pale Grey"], tags: ["mouse", "wireless mouse", "productivity", "logitech", "mx"], warranty: "1 year Logitech warranty",
    specs: [["Performance", "Type", "Mouse", true], ["Performance", "Sensor", "Darkfield 8000 DPI"], ["General", "Connectivity", "Wireless", true], ["General", "Weight", "141 g"], ["Battery", "Battery Life", "Up to 70 days"]],
  },
  {
    name: "Dell UltraSharp 27 4K Thunderbolt Hub Monitor", brand: "Dell", category: "desk-setup", img: "monitor", price: 58999, mrp: 69999, stock: 13, ageDays: 300, popularity: 4,
    tagline: "IPS Black 4K with a 90W Thunderbolt 4 hub.",
    description: "The UltraSharp U2725QE uses IPS Black technology for 3000:1 contrast and deeper blacks, with 120Hz 4K clarity. A single Thunderbolt 4 cable delivers 90W charging, video and data, while the built-in RJ45 and USB hub declutter your desk.",
    colors: ["Silver"], tags: ["monitor", "4k monitor", "display", "thunderbolt", "dell"], warranty: "3 years Dell advanced exchange",
    specs: [["Performance", "Type", "Monitor", true], ["Display", "Panel", "27\" IPS Black, 4K, 120Hz"], ["Display", "Resolution", "4K", true], ["General", "Connectivity", "Wired", true], ["General", "Ports", "Thunderbolt 4 (90W), HDMI, DP, RJ45, USB-A/C"]],
  },
  {
    name: "Samsung Odyssey OLED G8", brand: "Samsung", category: "desk-setup", img: "monitor", price: 99999, mrp: 129999, stock: 6, flash: true, ageDays: 160, popularity: 3,
    tagline: "32\" 4K QD-OLED at 240Hz.",
    description: "Odyssey OLED G8 combines a 32-inch 4K QD-OLED panel with a 240Hz refresh rate and 0.03ms response time. Glare-free anti-reflection, OLED Safeguard+ burn-in protection and Samsung Smart TV apps make it a work, play and streaming hub.",
    colors: ["Silver"], tags: ["monitor", "oled monitor", "gaming monitor", "4k monitor", "samsung"], warranty: "3 years Samsung warranty",
    specs: [["Performance", "Type", "Monitor", true], ["Display", "Panel", "32\" QD-OLED, 4K, 240Hz"], ["Display", "Resolution", "4K", true], ["General", "Connectivity", "Wired", true], ["General", "Ports", "HDMI 2.1 ×2, DP 1.4, USB hub"]],
  },
  {
    name: "Logitech MX Brio", brand: "Logitech", category: "desk-setup", img: "webcam", price: 17995, mrp: 19995, stock: 22, ageDays: 400, popularity: 4,
    tagline: "4K Ultra HD webcam with AI-enhanced image.",
    description: "MX Brio's 8.5MP sensor with larger pixels captures 4K at 30fps or 1080p at 60fps with sharp detail even in low light. AI-enhanced exposure and face tracking keep you looking your best, and the privacy shutter slides closed when you're done.",
    colors: ["Graphite", "Pale Grey"], tags: ["webcam", "camera", "4k webcam", "video calls", "logitech"], warranty: "2 years Logitech warranty",
    specs: [["Performance", "Type", "Webcam", true], ["Performance", "Resolution", "4K", true], ["Features", "Frame Rate", "4K30 / 1080p60"], ["General", "Connectivity", "Wired", true], ["Features", "Privacy", "Integrated shutter"]],
  },
  {
    name: "Anker Prime 100W GaN Charger", brand: "Anker", category: "desk-setup", img: "charger", price: 6499, mrp: 7999, stock: 88, ageDays: 210, popularity: 6,
    tagline: "Three ports. 100W. Fits in your palm.",
    description: "Anker Prime 100W uses GaNPrime technology to power a laptop, phone and earbuds simultaneously from one compact charger. ActiveShield 2.0 monitors temperature 3 million times a day for safe, fast charging.",
    colors: ["Black", "White"], tags: ["charger", "gan charger", "usb-c", "fast charging", "anker"], warranty: "18 months Anker warranty",
    specs: [["Performance", "Type", "Charger", true], ["Performance", "Output", "100 W max"], ["General", "Ports", "2× USB-C, 1× USB-A"], ["General", "Connectivity", "Wired", true]],
  },
  {
    name: "Anker Prime Power Bank 20,000mAh", brand: "Anker", category: "desk-setup", img: "powerbank", price: 8999, mrp: 10999, stock: 3, ageDays: 150, popularity: 6,
    tagline: "200W output with a smart display.",
    description: "Anker Prime Power Bank delivers up to 200W across two USB-C ports and one USB-A, enough to charge two laptops at once. The smart digital display shows real-time wattage and remaining capacity, and it recharges fully in about an hour.",
    colors: ["Black"], tags: ["power bank", "powerbank", "battery", "usb-c", "fast charging", "anker"], warranty: "18 months Anker warranty",
    specs: [["Performance", "Type", "Power Bank", true], ["Performance", "Capacity", "20,000 mAh"], ["Performance", "Output", "200 W total"], ["General", "Connectivity", "Wired", true], ["General", "Weight", "540 g"]],
  },
  {
    name: "Anker 13-in-1 Docking Station", brand: "Anker", category: "desk-setup", img: "dock", price: 19999, mrp: 24999, stock: 12, ageDays: 380, popularity: 3,
    tagline: "Triple display and 100W charging from one cable.",
    description: "Connect three monitors, Ethernet, SD cards and all your USB accessories through one USB-C cable. 100W pass-through charging keeps your laptop topped up, and the aluminium enclosure dissipates heat quietly.",
    colors: ["Space Gray"], tags: ["dock", "docking station", "usb-c hub", "hub", "anker"], warranty: "18 months Anker warranty",
    specs: [["Performance", "Type", "Dock", true], ["General", "Ports", "2× HDMI, DP, 3× USB-A, 2× USB-C, RJ45, SD, microSD, 3.5mm"], ["Performance", "Output", "100 W pass-through"], ["General", "Connectivity", "Wired", true]],
  },

  // ───────── Smart Home ─────────
  {
    name: "Google Nest Audio", brand: "Google", category: "smart-home", img: "smart-speaker", price: 7999, mrp: 9999, stock: 40, ageDays: 700, popularity: 4,
    tagline: "Room-filling sound with Google Assistant.",
    description: "Nest Audio's 75mm woofer and 19mm tweeter deliver 50% more bass than the original Google Home. Media EQ and Ambient IQ adapt the sound to what you're listening to and the room you're in, and Assistant controls your smart home hands-free.",
    colors: ["Chalk", "Charcoal"], tags: ["smart speaker", "speaker", "google assistant", "nest", "smart home"], warranty: "1 year Google warranty",
    specs: [["Performance", "Type", "Smart Speaker", true], ["Audio", "Drivers", "75 mm woofer, 19 mm tweeter"], ["Features", "Assistant", "Google Assistant", true], ["General", "Connectivity", "Wi-Fi + Bluetooth"]],
  },
  {
    name: "Apple HomePod mini", brand: "Apple", category: "smart-home", img: "smart-speaker", price: 10900, stock: 26, ageDays: 650, popularity: 4,
    tagline: "Big sound in a small sphere.",
    description: "HomePod mini delivers rich 360-degree audio, works as a smart home hub for Matter and Thread devices, and hands off music from iPhone with a tap. Use Siri to control lights, set timers and play from Apple Music.",
    colors: ["White", "Midnight", "Blue", "Yellow", "Orange"], tags: ["smart speaker", "speaker", "siri", "homepod", "smart home", "apple"], warranty: "1 year Apple limited warranty",
    specs: [["Performance", "Type", "Smart Speaker", true], ["Audio", "Drivers", "Full-range driver, dual passive radiators"], ["Features", "Assistant", "Siri", true], ["General", "Connectivity", "Wi-Fi + Bluetooth + Thread"]],
  },
  {
    name: "Google Nest Cam (Battery)", brand: "Google", category: "smart-home", img: "smart-cam", price: 14999, mrp: 17999, stock: 18, ageDays: 500, popularity: 3,
    tagline: "Wire-free security with intelligent alerts.",
    description: "Nest Cam (Battery) installs anywhere indoors or out, with 1080p HDR video, night vision and on-device detection of people, animals and vehicles. Three hours of free event history is included, and it keeps recording during Wi-Fi outages.",
    colors: ["Snow"], tags: ["security camera", "camera", "smart camera", "nest", "smart home"], warranty: "1 year Google warranty",
    specs: [["Performance", "Type", "Camera", true], ["Performance", "Resolution", "1080p HDR", true], ["Features", "Assistant", "Google Assistant", true], ["General", "Connectivity", "Wi-Fi"], ["Features", "Power", "Battery or wired"]],
  },
  {
    name: "eufy Indoor Cam E30", brand: "Anker", category: "smart-home", img: "smart-cam", price: 3999, mrp: 5499, stock: 64, ageDays: 90, popularity: 5,
    tagline: "4K pan & tilt with local storage — no subscription.",
    description: "eufy Indoor Cam E30 covers the whole room with 360° pan and 96° tilt at 4K resolution. AI tracking follows people and pets, and footage stays on the microSD card with no monthly fees.",
    colors: ["White"], tags: ["security camera", "camera", "smart camera", "eufy", "smart home", "anker"], warranty: "1 year Anker warranty",
    specs: [["Performance", "Type", "Camera", true], ["Performance", "Resolution", "4K", true], ["Features", "Assistant", "Alexa & Google Assistant", true], ["General", "Connectivity", "Wi-Fi"], ["Features", "Storage", "microSD up to 128 GB"]],
  },
];
