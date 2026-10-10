// Realistic sample data for a pet & poultry supply store in Central Luzon.
// Prices are in Philippine pesos (VAT-inclusive shelf prices).

export const categories = [
  { key: 'poultry', name: 'Poultry Feeds', color: 'amber', description: 'Chick booster, grower, layer and broiler feeds' },
  { key: 'dog', name: 'Dog Food', color: 'green', description: 'Dry and wet food for puppies and adult dogs' },
  { key: 'cat', name: 'Cat Food', color: 'violet', description: 'Dry kibble, wet pouches and cans for cats' },
  { key: 'vitamins', name: 'Vitamins & Supplements', color: 'teal', description: 'Vitamins, dewormers and health supplements' },
  { key: 'accessories', name: 'Pet Accessories', color: 'blue', description: 'Bowls, leashes, cages and grooming tools' },
  { key: 'livestock', name: 'Livestock Feeds', color: 'rose', description: 'Hog and goat feeds' },
];

export const suppliers = [
  {
    key: 'agri',
    name: 'Pampanga Agri Supply Co.',
    contactPerson: 'Ramon Dizon',
    phone: '09171234501',
    email: 'orders@pampangaagri.ph',
    address: 'San Fernando, Pampanga',
    leadTimeDays: 2,
  },
  {
    key: 'luzon',
    name: 'Luzon Feeds Distribution',
    contactPerson: 'Maricel Santos',
    phone: '09181234502',
    email: 'sales@luzonfeeds.ph',
    address: 'Tarlac City, Tarlac',
    leadTimeDays: 4,
  },
  {
    key: 'petcare',
    name: 'PetCare Wholesale PH',
    contactPerson: 'Joel Manalo',
    phone: '09191234503',
    email: 'hello@petcarewholesale.ph',
    address: 'Angeles City, Pampanga',
    leadTimeDays: 3,
  },
  {
    key: 'vetplus',
    name: 'VetPlus Trading',
    contactPerson: 'Dr. Ana Lacson',
    phone: '09201234504',
    email: 'vetplus.trading@gmail.com',
    address: 'Mabalacat, Pampanga',
    leadTimeDays: 5,
  },
  {
    key: 'essentials',
    name: 'Central Luzon Pet Essentials',
    contactPerson: 'Kristine Yap',
    phone: '09211234505',
    email: '',
    address: 'Malolos, Bulacan',
    leadTimeDays: 7,
  },
];

export const customers = [
  { name: 'Mang Ernesto Cruz', phone: '09171110001', email: '', address: 'Brgy. Del Pilar, San Fernando', customerType: 'farm' },
  { name: 'Liza Mendoza', phone: '09171110002', email: 'liza.mendoza@gmail.com', address: 'Brgy. Dolores, San Fernando', customerType: 'retail' },
  { name: 'Tolentino Poultry Farm', phone: '09171110003', email: 'tolentinofarm@yahoo.com', address: 'Bacolor, Pampanga', customerType: 'wholesale' },
  { name: 'Carlo Bautista', phone: '09171110004', email: '', address: 'Brgy. Sindalan, San Fernando', customerType: 'retail' },
  { name: 'Happy Paws Grooming', phone: '09171110005', email: 'happypaws.sf@gmail.com', address: 'Jose Abad Santos Ave, San Fernando', customerType: 'wholesale' },
  { name: 'Aling Remy Pascual', phone: '09171110006', email: '', address: 'Mexico, Pampanga', customerType: 'farm' },
  { name: 'Jasmine Villanueva', phone: '09171110007', email: 'jas.villanueva@gmail.com', address: 'Brgy. Telabastagan, San Fernando', customerType: 'retail' },
  { name: 'Benjie Ocampo', phone: '09171110008', email: '', address: 'Sta. Ana, Pampanga', customerType: 'retail' },
  // The two below have no purchases, so they can be deleted during the demo
  { name: 'Patricia Soriano', phone: '09171110009', email: 'pat.soriano@gmail.com', address: 'Guagua, Pampanga', customerType: 'retail' },
  { name: 'Rodel Garcia', phone: '09171110010', email: '', address: 'Lubao, Pampanga', customerType: 'farm' },
];

// finalStock = the stock level shown after seeding (some are deliberately low / out)
// expiresInDays = optional expiry date relative to today (negative = already expired)
export const products = [
  // Poultry feeds
  { sku: 'PF-CHB-50', name: 'Chick Booster Crumble 50kg', category: 'poultry', supplier: 'agri', animalType: 'poultry', unit: 'sack', costPrice: 1580, sellingPrice: 1750, finalStock: 18, reorderLevel: 8, expiresInDays: 120, weight: 9 },
  { sku: 'PF-GRW-50', name: 'Broiler Grower Pellets 50kg', category: 'poultry', supplier: 'agri', animalType: 'poultry', unit: 'sack', costPrice: 1450, sellingPrice: 1620, finalStock: 6, reorderLevel: 8, expiresInDays: 90, weight: 10 },
  { sku: 'PF-LYR-50', name: 'Layer Mash Complete 50kg', category: 'poultry', supplier: 'luzon', animalType: 'poultry', unit: 'sack', costPrice: 1390, sellingPrice: 1560, finalStock: 22, reorderLevel: 10, expiresInDays: 150, weight: 10 },
  { sku: 'PF-STR-1K', name: 'Chick Starter Mash (per kg)', category: 'poultry', supplier: 'agri', animalType: 'poultry', unit: 'kg', costPrice: 36, sellingPrice: 45, finalStock: 140, reorderLevel: 50, expiresInDays: 75, weight: 12 },
  { sku: 'PF-GMC-25', name: 'Gamefowl Conditioning Pellets 25kg', category: 'poultry', supplier: 'luzon', animalType: 'poultry', unit: 'sack', costPrice: 1240, sellingPrice: 1420, finalStock: 0, reorderLevel: 4, expiresInDays: 200, weight: 5 },
  { sku: 'PF-SCR-1K', name: 'Scratch Grains Mix (per kg)', category: 'poultry', supplier: 'luzon', animalType: 'poultry', unit: 'kg', costPrice: 28, sellingPrice: 35, finalStock: 210, reorderLevel: 60, expiresInDays: 180, weight: 8 },

  // Dog food
  { sku: 'DF-PDA-3K', name: 'Pedigree Adult Beef 3kg', category: 'dog', supplier: 'petcare', animalType: 'dog', unit: 'pack', costPrice: 640, sellingPrice: 735, finalStock: 14, reorderLevel: 6, expiresInDays: 300, weight: 7 },
  { sku: 'DF-PDP-1K', name: 'Pedigree Puppy Milk & Chicken 1.3kg', category: 'dog', supplier: 'petcare', animalType: 'dog', unit: 'pack', costPrice: 290, sellingPrice: 345, finalStock: 3, reorderLevel: 6, expiresInDays: 25, weight: 6 },
  { sku: 'DF-VTL-20', name: 'Vitality Classic Dog Food 20kg', category: 'dog', supplier: 'essentials', animalType: 'dog', unit: 'sack', costPrice: 2380, sellingPrice: 2650, finalStock: 5, reorderLevel: 3, expiresInDays: 240, weight: 3 },
  { sku: 'DF-TOP-1K', name: 'Top Breed Adult Dog Food (per kg)', category: 'dog', supplier: 'essentials', animalType: 'dog', unit: 'kg', costPrice: 115, sellingPrice: 140, finalStock: 48, reorderLevel: 20, expiresInDays: 210, weight: 9 },
  { sku: 'DF-CAN-400', name: 'Beef Chunks in Gravy Can 400g', category: 'dog', supplier: 'petcare', animalType: 'dog', unit: 'can', costPrice: 72, sellingPrice: 89, finalStock: 36, reorderLevel: 12, expiresInDays: 400, weight: 6 },

  // Cat food
  { sku: 'CF-WHK-1K', name: 'Whiskas Ocean Fish 1.2kg', category: 'cat', supplier: 'petcare', animalType: 'cat', unit: 'pack', costPrice: 330, sellingPrice: 389, finalStock: 11, reorderLevel: 6, expiresInDays: 280, weight: 7 },
  { sku: 'CF-PCH-85', name: 'Tuna Wet Pouch 85g', category: 'cat', supplier: 'petcare', animalType: 'cat', unit: 'pack', costPrice: 24, sellingPrice: 32, finalStock: 64, reorderLevel: 24, expiresInDays: 18, weight: 10 },
  { sku: 'CF-SPC-7K', name: 'Special Cat Urinary Care 7kg', category: 'cat', supplier: 'essentials', animalType: 'cat', unit: 'sack', costPrice: 1420, sellingPrice: 1650, finalStock: 2, reorderLevel: 3, expiresInDays: 190, weight: 3 },
  { sku: 'CF-KTN-1K', name: 'Kitten Formula Dry Food (per kg)', category: 'cat', supplier: 'essentials', animalType: 'cat', unit: 'kg', costPrice: 160, sellingPrice: 195, finalStock: 25, reorderLevel: 10, expiresInDays: 160, weight: 5 },

  // Vitamins & supplements
  { sku: 'VT-B12-60', name: 'Vitamin B-Complex Water Soluble 100g', category: 'vitamins', supplier: 'vetplus', animalType: 'poultry', unit: 'pack', costPrice: 85, sellingPrice: 120, finalStock: 30, reorderLevel: 10, expiresInDays: 365, weight: 6 },
  { sku: 'VT-ELC-1K', name: 'Electrolytes Plus Poultry Drink 1kg', category: 'vitamins', supplier: 'vetplus', animalType: 'poultry', unit: 'pack', costPrice: 210, sellingPrice: 265, finalStock: 9, reorderLevel: 5, expiresInDays: -4, weight: 4 },
  { sku: 'VT-NUT-120', name: 'Nutri-Vet Multivitamin Syrup 120ml', category: 'vitamins', supplier: 'vetplus', animalType: 'dog', unit: 'bottle', costPrice: 180, sellingPrice: 240, finalStock: 12, reorderLevel: 5, expiresInDays: 220, weight: 4 },
  { sku: 'VT-DWM-10', name: 'Broad-Spectrum Dewormer Tablets x10', category: 'vitamins', supplier: 'vetplus', animalType: 'general', unit: 'box', costPrice: 145, sellingPrice: 199, finalStock: 4, reorderLevel: 5, expiresInDays: 27, weight: 4 },
  { sku: 'VT-LIV-100', name: 'Liver Tonic Supplement 100ml', category: 'vitamins', supplier: 'vetplus', animalType: 'general', unit: 'bottle', costPrice: 155, sellingPrice: 210, finalStock: 16, reorderLevel: 4, expiresInDays: 330, weight: 3 },

  // Accessories
  { sku: 'AC-BWL-SS', name: 'Stainless Steel Pet Bowl Medium', category: 'accessories', supplier: 'essentials', animalType: 'general', unit: 'piece', costPrice: 95, sellingPrice: 150, finalStock: 20, reorderLevel: 6, weight: 4 },
  { sku: 'AC-LSH-NY', name: 'Nylon Leash with Padded Handle', category: 'accessories', supplier: 'essentials', animalType: 'dog', unit: 'piece', costPrice: 120, sellingPrice: 185, finalStock: 9, reorderLevel: 4, weight: 3 },
  { sku: 'AC-WTR-4L', name: 'Poultry Drinker 4L', category: 'accessories', supplier: 'agri', animalType: 'poultry', unit: 'piece', costPrice: 130, sellingPrice: 175, finalStock: 0, reorderLevel: 5, weight: 4 },
  { sku: 'AC-LTR-10', name: 'Clumping Cat Litter 10L', category: 'accessories', supplier: 'petcare', animalType: 'cat', unit: 'pack', costPrice: 260, sellingPrice: 320, finalStock: 15, reorderLevel: 5, weight: 5 },
  { sku: 'AC-CMB-01', name: 'Grooming Slicker Brush', category: 'accessories', supplier: 'essentials', animalType: 'general', unit: 'piece', costPrice: 110, sellingPrice: 175, finalStock: 7, reorderLevel: 3, weight: 2 },

  // Livestock feeds
  { sku: 'LF-HOG-50', name: 'Hog Grower Pellets 50kg', category: 'livestock', supplier: 'luzon', animalType: 'livestock', unit: 'sack', costPrice: 1620, sellingPrice: 1795, finalStock: 12, reorderLevel: 5, expiresInDays: 140, weight: 5 },
  { sku: 'LF-GOT-25', name: 'Goat Developer Feed 25kg', category: 'livestock', supplier: 'luzon', animalType: 'livestock', unit: 'sack', costPrice: 890, sellingPrice: 1010, finalStock: 8, reorderLevel: 4, expiresInDays: 160, weight: 3 },

  // Never sold yet - safe to delete during the demo
  { sku: 'AC-CGE-SM', name: 'Small Folding Pet Cage', category: 'accessories', supplier: 'essentials', animalType: 'general', unit: 'piece', costPrice: 780, sellingPrice: 990, finalStock: 4, reorderLevel: 2, weight: 0 },
];
