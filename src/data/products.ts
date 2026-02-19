export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  time: string;
  image: string;
  category: string;
  condition: "Yeni" | "İşlənmiş" | "Yeni kimi";
  description: string;
  isPremium?: boolean;
  isUrgent?: boolean;
  seller: {
    name: string;
    phone: string;
    rating: number;
    memberSince: string;
  };
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  count: number;
}

export const categories: Category[] = [
  { id: "telefonlar", label: "Telefonlar", icon: "Smartphone", count: 12450 },
  { id: "noutbuklar", label: "Noutbuklar", icon: "Laptop", count: 8320 },
  { id: "plansetler", label: "Planşetlər", icon: "Tablet", count: 3180 },
  { id: "qulaqliqlar", label: "Qulaqlıqlar", icon: "Headphones", count: 5640 },
  { id: "televizorlar", label: "Televizorlar", icon: "Monitor", count: 4210 },
  { id: "oyun-konsollari", label: "Oyun konsolları", icon: "Gamepad2", count: 2890 },
  { id: "kameralar", label: "Kameralar", icon: "Camera", count: 1950 },
  { id: "aksesuarlar", label: "Aksesuarlar", icon: "Watch", count: 7620 },
  { id: "komputer-hisseleri", label: "Kompüter hissələri", icon: "Cpu", count: 6340 },
  { id: "printer-skaner", label: "Printer & Skaner", icon: "Printer", count: 1280 },
  { id: "smart-ev", label: "Smart ev", icon: "Wifi", count: 2150 },
  { id: "diger", label: "Digər", icon: "CircuitBoard", count: 3400 },
];

export const products: Product[] = [
  {
    id: "1",
    title: "iPhone 15 Pro Max 256GB - Natural Titanium",
    price: 2100,
    currency: "₼",
    location: "Bakı",
    time: "2 saat əvvəl",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=300&fit=crop",
    category: "telefonlar",
    condition: "Yeni kimi",
    description: "iPhone 15 Pro Max, 256GB, Natural Titanium rəng. Qutusu, adapter və kabeli ilə birlikdə. Heç bir cızıq yoxdur, ekran qoruyucu ilə istifadə olunub.",
    isPremium: true,
    seller: { name: "Elvin M.", phone: "+994 50 123 4567", rating: 4.8, memberSince: "2023" },
  },
  {
    id: "2",
    title: "MacBook Pro M3 14-inch 512GB",
    price: 3400,
    currency: "₼",
    location: "Sumqayıt",
    time: "3 saat əvvəl",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
    category: "noutbuklar",
    condition: "Yeni",
    description: "MacBook Pro M3, 14 düym, 512GB SSD, 18GB RAM. Qutusu açılmayıb, tam yeni. Zəmanət var.",
    isUrgent: true,
    seller: { name: "Nigar A.", phone: "+994 55 987 6543", rating: 4.9, memberSince: "2022" },
  },
  {
    id: "3",
    title: "Samsung Galaxy S24 Ultra 512GB",
    price: 1850,
    currency: "₼",
    location: "Gəncə",
    time: "6 saat əvvəl",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=300&fit=crop",
    category: "telefonlar",
    condition: "Yeni",
    description: "Samsung Galaxy S24 Ultra, 512GB, Titanium Black. Yeni, qutusu açılmayıb.",
    seller: { name: "Rəşad K.", phone: "+994 70 456 7890", rating: 4.5, memberSince: "2024" },
  },
  {
    id: "4",
    title: "PlayStation 5 Slim + 3 oyun",
    price: 950,
    currency: "₼",
    location: "Bakı",
    time: "8 saat əvvəl",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=300&fit=crop",
    category: "oyun-konsollari",
    condition: "Yeni kimi",
    description: "PS5 Slim Digital Edition. 3 oyun daxildir: Spider-Man 2, God of War, FC 25. 2 joystik.",
    isPremium: true,
    seller: { name: "Tural H.", phone: "+994 51 234 5678", rating: 4.7, memberSince: "2023" },
  },
  {
    id: "5",
    title: "AirPods Pro 2 - USB-C versiya",
    price: 280,
    currency: "₼",
    location: "Bakı",
    time: "1 gün əvvəl",
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=300&fit=crop",
    category: "qulaqliqlar",
    condition: "Yeni",
    description: "Apple AirPods Pro 2, USB-C versiya. Tam yeni, qutuda. Rəsmi mağazadan alınıb.",
    seller: { name: "Leyla S.", phone: "+994 50 345 6789", rating: 4.6, memberSince: "2024" },
  },
  {
    id: "6",
    title: "iPad Air M2 11-inch 128GB Wi-Fi",
    price: 1200,
    currency: "₼",
    location: "Bakı",
    time: "4 saat əvvəl",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop",
    category: "plansetler",
    condition: "Yeni kimi",
    description: "iPad Air M2, 11 düym, 128GB. Space Gray rəng. Apple Pencil Pro ilə birlikdə.",
    isUrgent: true,
    seller: { name: "Kamran V.", phone: "+994 55 678 9012", rating: 4.4, memberSince: "2023" },
  },
  {
    id: "7",
    title: "Samsung 55\" QLED 4K Smart TV",
    price: 1650,
    currency: "₼",
    location: "Bakı",
    time: "5 saat əvvəl",
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop",
    category: "televizorlar",
    condition: "Yeni",
    description: "Samsung 55 düym QLED 4K, Smart TV. 2024 model, zəmanətli.",
    isPremium: true,
    seller: { name: "Fərid N.", phone: "+994 70 789 0123", rating: 4.9, memberSince: "2022" },
  },
  {
    id: "8",
    title: "Canon EOS R6 Mark II + 24-105mm Lens",
    price: 4200,
    currency: "₼",
    location: "Bakı",
    time: "1 gün əvvəl",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop",
    category: "kameralar",
    condition: "İşlənmiş",
    description: "Canon EOS R6 Mark II, 24-105mm f/4L lens ilə. 15K shutter count. Əla vəziyyətdə.",
    seller: { name: "Orxan B.", phone: "+994 51 890 1234", rating: 4.3, memberSince: "2021" },
  },
  {
    id: "9",
    title: "Apple Watch Ultra 2 - Titanium",
    price: 1450,
    currency: "₼",
    location: "Bakı",
    time: "12 saat əvvəl",
    image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&h=300&fit=crop",
    category: "aksesuarlar",
    condition: "Yeni",
    description: "Apple Watch Ultra 2. Tam yeni, qutuda. Orange Alpine Loop band.",
    seller: { name: "Aynur G.", phone: "+994 50 901 2345", rating: 4.7, memberSince: "2023" },
  },
  {
    id: "10",
    title: "NVIDIA RTX 4070 Ti Super 16GB",
    price: 1100,
    currency: "₼",
    location: "Bakı",
    time: "2 gün əvvəl",
    image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=300&fit=crop",
    category: "komputer-hisseleri",
    condition: "Yeni",
    description: "NVIDIA GeForce RTX 4070 Ti Super, 16GB GDDR6X. MSI Gaming X Trio. Tam yeni, zəmanətli.",
    isPremium: true,
    seller: { name: "Samir Y.", phone: "+994 55 012 3456", rating: 4.8, memberSince: "2022" },
  },
  {
    id: "11",
    title: "Sony WH-1000XM5 - Noise Cancelling",
    price: 420,
    currency: "₼",
    location: "Bakı",
    time: "7 saat əvvəl",
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=300&fit=crop",
    category: "qulaqliqlar",
    condition: "Yeni kimi",
    description: "Sony WH-1000XM5, qara rəng. Noise cancelling. Qutusu və aksesuarları ilə. Az istifadə olunub.",
    seller: { name: "Günay M.", phone: "+994 70 123 4567", rating: 4.5, memberSince: "2024" },
  },
  {
    id: "12",
    title: "Lenovo ThinkPad X1 Carbon Gen 11",
    price: 2800,
    currency: "₼",
    location: "Bakı",
    time: "3 gün əvvəl",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop",
    category: "noutbuklar",
    condition: "İşlənmiş",
    description: "ThinkPad X1 Carbon Gen 11, i7-1365U, 16GB RAM, 512GB SSD. İş üçün ideal.",
    seller: { name: "Vüsal R.", phone: "+994 51 234 5678", rating: 4.6, memberSince: "2022" },
  },
];
