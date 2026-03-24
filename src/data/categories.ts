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

export const CATEGORIES: Category[] = [
  {
    id: "electronics",
    name: "Elektronika",
    slug: "electronics",
    icon: "Zap",
    color: "bg-blue-500",
    subCategories: [
      { id: "phones", name: "Telefonlar", slug: "electronics-phones", icon: "Smartphone" },
      { id: "laptops", name: "Noutbuklar", slug: "electronics-laptops", icon: "Laptop" },
      { id: "tablets", name: "Planşetlər", slug: "electronics-tablets", icon: "Tablet" },
      { id: "accessories", name: "Aksesuarlar", slug: "electronics-accessories", icon: "Headphones" },
      { id: "cameras", name: "Kameralar", slug: "electronics-cameras", icon: "Camera" },
    ],
  },
  {
    id: "real-estate",
    name: "Daşınmaz Əmlak",
    slug: "real-estate",
    icon: "Home",
    color: "bg-amber-500",
    subCategories: [
      { id: "apartments", name: "Mənzillər", slug: "real-estate-apartments" },
      { id: "houses", name: "Evlər", slug: "real-estate-houses" },
      { id: "commercial", name: "Kommersiya", slug: "real-estate-commercial" },
      { id: "land", name: "Torpaq", slug: "real-estate-land" },
      { id: "offices", name: "Ofislər", slug: "real-estate-offices" },
    ],
  },
  {
    id: "vehicles",
    name: "Avtomobillər",
    slug: "vehicles",
    icon: "Car",
    color: "bg-rose-500",
    subCategories: [
      { id: "cars", name: "Avtomobillər", slug: "vehicles-cars" },
      { id: "motorcycles", name: "Motosiklətlər", slug: "vehicles-motorcycles" },
      { id: "trucks", name: "Yük Maşınları", slug: "vehicles-trucks" },
      { id: "bikes", name: "Velosipedlər", slug: "vehicles-bikes" },
      { id: "parts", name: "Ehtiyat Hissələri", slug: "vehicles-parts" },
    ],
  },
  {
    id: "fashion",
    name: "Moda və Geyim",
    slug: "fashion",
    icon: "Shirt",
    color: "bg-fuchsia-500",
    subCategories: [
      { id: "mens", name: "Kişi Geyimi", slug: "fashion-mens" },
      { id: "womens", name: "Qadın Geyimi", slug: "fashion-womens" },
      { id: "kids", name: "Uşaq Geyimi", slug: "fashion-kids" },
      { id: "shoes", name: "Ayakkabılar", slug: "fashion-shoes" },
      { id: "bags", name: "Çantalar", slug: "fashion-bags" },
    ],
  },
  {
    id: "furniture",
    name: "Mebel",
    slug: "furniture",
    icon: "Armchair",
    color: "bg-emerald-500",
    subCategories: [
      { id: "living", name: "Qonaq Otağı", slug: "furniture-living" },
      { id: "bedroom", name: "Yataq Otağı", slug: "furniture-bedroom" },
      { id: "kitchen", name: "Mətbəx", slug: "furniture-kitchen" },
      { id: "office", name: "Ofis Mebeli", slug: "furniture-office" },
      { id: "outdoor", name: "Açıq Hava", slug: "furniture-outdoor" },
    ],
  },
  {
    id: "services",
    name: "Xidmətlər",
    slug: "services",
    icon: "Wrench",
    color: "bg-indigo-500",
    subCategories: [
      { id: "repair", name: "Təmir Xidmətləri", slug: "services-repair" },
      { id: "cleaning", name: "Təmizlik", slug: "services-cleaning" },
      { id: "tutoring", name: "Təhsil", slug: "services-tutoring" },
      { id: "beauty", name: "Güzəllik Xidmətləri", slug: "services-beauty" },
      { id: "delivery", name: "Çatdırılma", slug: "services-delivery" },
    ],
  },
  {
    id: "jobs",
    name: "Vakansiyalar",
    slug: "jobs",
    icon: "Briefcase",
    color: "bg-sky-500",
    subCategories: [
      { id: "full-time", name: "Tam Vaxt", slug: "jobs-full-time" },
      { id: "part-time", name: "Hissə-Vaxt", slug: "jobs-part-time" },
      { id: "remote", name: "Remote", slug: "jobs-remote" },
      { id: "freelance", name: "Frilans", slug: "jobs-freelance" },
      { id: "internship", name: "Praktika", slug: "jobs-internship" },
    ],
  },
  {
    id: "sports",
    name: "İdman və Hobbilər",
    slug: "sports",
    icon: "Dumbbell",
    color: "bg-teal-500",
    subCategories: [
      { id: "fitness", name: "Fitness Avadanlığı", slug: "sports-fitness" },
      { id: "sports-equipment", name: "İdman Avadanlığı", slug: "sports-equipment" },
      { id: "outdoor-gear", name: "Açıq Hava Avadanlığı", slug: "sports-outdoor" },
      { id: "games", name: "Oyunlar", slug: "sports-games" },
      { id: "music", name: "Musiqi Aletləri", slug: "sports-music" },
    ],
  },
];