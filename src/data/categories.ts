export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  subCategories: SubCategory[];
}

// Daşınmaz əmlak kateqoriyaları (bina.az tərzində)
export const CATEGORIES: Category[] = [
  {
    id: "menziller",
    name: "Mənzillər",
    slug: "menziller",
    icon: "Building2",
    color: "bg-blue-500",
    subCategories: [
      { id: "yeni-tikili", name: "Yeni tikili", slug: "menziller-yeni-tikili", icon: "Building" },
      { id: "kohne-tikili", name: "Köhnə tikili", slug: "menziller-kohne-tikili", icon: "Building2" },
    ],
  },
  {
    id: "heyet-evi",
    name: "Həyət evi / Bağ evi",
    slug: "heyet-evi",
    icon: "Home",
    color: "bg-emerald-500",
    subCategories: [
      { id: "villa", name: "Villa", slug: "heyet-evi-villa", icon: "Home" },
      { id: "bag", name: "Bağ evi", slug: "heyet-evi-bag", icon: "Trees" },
      { id: "heyet", name: "Həyət evi", slug: "heyet-evi-heyet", icon: "Home" },
    ],
  },
  {
    id: "ofisler",
    name: "Ofislər",
    slug: "ofisler",
    icon: "Briefcase",
    color: "bg-indigo-500",
    subCategories: [
      { id: "ofis", name: "Ofis", slug: "ofisler-ofis", icon: "Briefcase" },
      { id: "coworking", name: "Co-working", slug: "ofisler-coworking", icon: "Users" },
    ],
  },
  {
    id: "qarajlar",
    name: "Qarajlar",
    slug: "qarajlar",
    icon: "Warehouse",
    color: "bg-amber-500",
    subCategories: [
      { id: "qaraj", name: "Qaraj", slug: "qarajlar-qaraj", icon: "Warehouse" },
      { id: "parkinq", name: "Parkinq yeri", slug: "qarajlar-parkinq", icon: "ParkingCircle" },
    ],
  },
  {
    id: "torpaq",
    name: "Torpaq sahələri",
    slug: "torpaq",
    icon: "TreePine",
    color: "bg-teal-500",
    subCategories: [
      { id: "yasayis", name: "Yaşayış", slug: "torpaq-yasayis", icon: "TreePine" },
      { id: "kommersiya", name: "Kommersiya", slug: "torpaq-kommersiya", icon: "TreePine" },
      { id: "kt", name: "Kənd təsərrüfatı", slug: "torpaq-kt", icon: "Sprout" },
    ],
  },
  {
    id: "obyektler",
    name: "Obyektlər",
    slug: "obyektler",
    icon: "Store",
    color: "bg-rose-500",
    subCategories: [
      { id: "magaza", name: "Mağaza", slug: "obyektler-magaza", icon: "Store" },
      { id: "restoran", name: "Restoran / Kafe", slug: "obyektler-restoran", icon: "UtensilsCrossed" },
      { id: "hotel", name: "Hotel / Otel", slug: "obyektler-hotel", icon: "Hotel" },
      { id: "salon", name: "Salon / Studio", slug: "obyektler-salon", icon: "Scissors" },
    ],
  },
  {
    id: "qeyri-yasayis",
    name: "Qeyri-yaşayış sahələri",
    slug: "qeyri-yasayis",
    icon: "Factory",
    color: "bg-slate-500",
    subCategories: [
      { id: "anbar", name: "Anbar", slug: "qeyri-yasayis-anbar", icon: "Warehouse" },
      { id: "istehsalat", name: "İstehsalat", slug: "qeyri-yasayis-istehsalat", icon: "Factory" },
      { id: "soyuducu", name: "Soyuducu kamera", slug: "qeyri-yasayis-soyuducu", icon: "Snowflake" },
    ],
  },
];
