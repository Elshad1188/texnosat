// Avtomobil elan saytı üçün mərkəzi məlumat bazası (marka/model, texniki seçimlər)
import { carModels } from "./brandModels";

export type VehicleType =
  | "car"
  | "moto"
  | "truck"
  | "bus"
  | "agro"
  | "water"
  | "air"
  | "parts";

export const VEHICLE_TYPES: { value: VehicleType; label: string; label_ru: string; categorySlug: string }[] = [
  { value: "car", label: "Avtomobil", label_ru: "Автомобиль", categorySlug: "avtomobiller" },
  { value: "moto", label: "Motosiklet", label_ru: "Мотоцикл", categorySlug: "motosikletler" },
  { value: "truck", label: "Yük maşını", label_ru: "Грузовик", categorySlug: "yuk-masinlari" },
  { value: "bus", label: "Avtobus", label_ru: "Автобус", categorySlug: "avtobuslar" },
  { value: "agro", label: "Kənd təs. texnikası", label_ru: "Сельхозтехника", categorySlug: "kend-teserrufati" },
  { value: "water", label: "Su nəqliyyatı", label_ru: "Водный транспорт", categorySlug: "su-neqliyyati" },
  { value: "air", label: "Hava nəqliyyatı", label_ru: "Воздушный транспорт", categorySlug: "hava-neqliyyati" },
  { value: "parts", label: "Ehtiyat hissələri", label_ru: "Запчасти", categorySlug: "ehtiyat-hisseler" },
];

// ---------- Marka → model xəritələri ----------

export const motoModels: Record<string, string[]> = {
  "Aprilia": ["RS 660", "RSV4", "Tuareg 660", "Tuono 660", "SR GT"],
  "Bajaj": ["Boxer", "Dominar 400", "Pulsar 150", "Pulsar NS200"],
  "Benelli": ["502C", "Leoncino 500", "TNT 249S", "TRK 502"],
  "BMW": ["F 750 GS", "F 850 GS", "G 310 GS", "G 310 R", "R 1250 GS", "R 1250 RT", "R nineT", "S 1000 R", "S 1000 RR"],
  "CFMOTO": ["450SR", "650MT", "700CL-X", "800MT"],
  "Ducati": ["Diavel", "Hypermotard", "Monster", "Multistrada V4", "Panigale V2", "Panigale V4", "Scrambler", "Streetfighter V4"],
  "Harley-Davidson": ["Fat Boy", "Iron 883", "Nightster", "Pan America", "Road King", "Softail", "Sportster S", "Street Glide"],
  "Honda": ["Africa Twin", "CB500F", "CB650R", "CBR1000RR-R", "CBR500R", "CBR650R", "CRF300L", "Forza 350", "Gold Wing", "NC750X", "PCX 125", "Rebel 500", "SH150i", "Transalp 750"],
  "Husqvarna": ["701 Enduro", "Norden 901", "Svartpilen 401", "Vitpilen 401"],
  "Kawasaki": ["Eliminator", "Ninja 400", "Ninja 650", "Ninja H2", "Ninja ZX-10R", "Versys 650", "Versys 1000", "Vulcan S", "Z650", "Z900", "Z1000"],
  "KTM": ["125 Duke", "250 Adventure", "390 Adventure", "390 Duke", "690 SMC R", "790 Duke", "890 Adventure", "1290 Super Duke R", "RC 390"],
  "Kymco": ["AK 550", "Agility 125", "Downtown 350", "People S 125", "X-Town 300"],
  "Moto Guzzi": ["V7", "V85 TT", "V100 Mandello"],
  "MV Agusta": ["Brutale 800", "Dragster 800", "F3 800", "Turismo Veloce"],
  "Piaggio": ["Beverly 300", "Liberty 125", "Medley 125", "MP3 400"],
  "Royal Enfield": ["Classic 350", "Continental GT 650", "Himalayan", "Hunter 350", "Interceptor 650", "Meteor 350"],
  "Suzuki": ["Address 110", "Burgman 400", "GSX-8S", "GSX-R1000", "GSX-S750", "Hayabusa", "SV650", "V-Strom 650", "V-Strom 1050"],
  "SYM": ["Cruisym 300", "Jet 14", "Joymax Z 300", "Symphony 125"],
  "Triumph": ["Bonneville T120", "Rocket 3", "Scrambler 1200", "Speed Triple", "Street Triple", "Tiger 660", "Tiger 900", "Trident 660"],
  "Vespa": ["GTS 300", "Primavera 125", "Sprint 150"],
  "Yamaha": ["MT-03", "MT-07", "MT-09", "MT-10", "NMAX 155", "R1", "R3", "R6", "R7", "Tenere 700", "Tracer 9", "TMAX 560", "XMAX 300", "XSR 700"],
  "Zontes": ["310R", "310T", "350X", "703 RR"],
  "İjmaş (İJ)": ["Jupiter 5", "Planeta 5"],
  "Minsk": ["C4 250", "D4 125", "Ranger 250"],
  "Ural": ["Gear Up", "M-63", "M-67"],
};

export const truckModels: Record<string, string[]> = {
  "DAF": ["CF", "LF", "XF", "XG"],
  "Dongfeng": ["Captain", "KL", "KR", "Tianlong"],
  "FAW": ["J6", "J7", "Tiger V"],
  "Ford": ["Cargo 1833", "Cargo 2533", "Cargo 3542", "F-MAX", "Transit"],
  "Foton": ["Aumark", "Auman", "Ollin", "Tunland"],
  "Freightliner": ["Cascadia", "Century", "Columbia"],
  "GAZ": ["3307", "3309", "GAZelle Next", "Sadko", "Valday"],
  "Hino": ["300", "500", "700"],
  "Howo": ["A7", "Sinotruk 336", "Sinotruk 371"],
  "Hyundai": ["HD35", "HD65", "HD78", "Mighty", "Porter", "Xcient"],
  "Isuzu": ["Elf", "Forward", "Giga", "NPR", "NQR"],
  "Iveco": ["Daily", "Eurocargo", "S-Way", "Stralis", "Trakker"],
  "KamAZ": ["4308", "5320", "5490", "53215", "6520", "65115", "65201"],
  "Kia": ["Bongo"],
  "MAN": ["TGE", "TGL", "TGM", "TGS", "TGX"],
  "MAZ": ["4370", "5440", "5551", "6312"],
  "Mercedes-Benz": ["Actros", "Arocs", "Atego", "Axor", "Sprinter", "Unimog", "Vario"],
  "Mitsubishi Fuso": ["Canter", "Fighter", "Super Great"],
  "Peterbilt": ["379", "389", "579"],
  "Renault": ["Kerax", "Magnum", "Master", "Midlum", "Premium", "T-Series"],
  "Scania": ["G-Series", "P-Series", "R-Series", "S-Series"],
  "Shacman": ["F2000", "F3000", "X3000", "X5000"],
  "Tata": ["LPT 613", "LPT 1618", "Prima"],
  "Volvo": ["FE", "FH", "FL", "FM", "FMX"],
  "ZIL": ["130", "131", "4331", "5301 Bıçok"],
};

export const busModels: Record<string, string[]> = {
  "BMC": ["Belde", "Neocity", "Pro City", "Procity"],
  "Ford": ["Transit 16+1", "Transit Jumbo"],
  "Golden Dragon": ["Navigator", "Triumph", "XML6122"],
  "Higer": ["KLQ6118", "KLQ6129", "Klq6540"],
  "Hyundai": ["County", "H350", "Universe"],
  "Isuzu": ["Citiport", "Novo", "Roybus", "Turquoise"],
  "Iveco": ["Crossway", "Daily Minibus"],
  "King Long": ["XMQ6112", "XMQ6127", "XMQ6900"],
  "LiAZ": ["5256", "5292"],
  "MAN": ["Lion's City", "Lion's Coach"],
  "Mercedes-Benz": ["Conecto", "Intouro", "Sprinter City", "Tourismo", "Travego"],
  "Neoplan": ["Cityliner", "Skyliner", "Tourliner"],
  "PAZ": ["3205", "32054", "Vector Next"],
  "Setra": ["S 415", "S 431 DT", "S 516"],
  "Temsa": ["Maraton", "Prestij", "Safir", "Tourmalin"],
  "Volvo": ["7900", "9700", "B12", "B7R"],
  "Yutong": ["ZK6122", "ZK6858", "ZK6938"],
};

export const agroModels: Record<string, string[]> = {
  "Belarus (MTZ)": ["82.1", "892", "1025", "1221", "3022"],
  "Case IH": ["Axial-Flow", "Farmall", "Magnum", "Puma"],
  "Claas": ["Arion", "Axion", "Lexion", "Tucano", "Xerion"],
  "Deutz-Fahr": ["Agrofarm", "Agroplus", "Agrotron"],
  "Fendt": ["300 Vario", "700 Vario", "900 Vario"],
  "John Deere": ["5075E", "6110B", "6155M", "7830", "8R", "S660", "W540"],
  "Kubota": ["L Series", "M Series", "MX Series"],
  "Massey Ferguson": ["MF 240", "MF 375", "MF 385", "MF 5711", "MF 7724"],
  "New Holland": ["T4", "T5", "T6", "T7", "TC5", "TD5"],
  "Sampo Rosenlew": ["Comia C6", "Comia C10"],
  "YTO": ["X704", "X904", "X1104"],
  "Zoomlion": ["RH1104", "RK504"],
  "Digər texnika": ["Ekskavator", "Buldozer", "Yükləyici", "Kombayn", "Kotan", "Səpici", "Traktor qoşqusu"],
};

export const waterModels: Record<string, string[]> = {
  "Bayliner": ["Element", "VR5", "VR6"],
  "Beneteau": ["Antares", "Flyer", "Oceanis"],
  "Jeanneau": ["Cap Camarat", "Merry Fisher", "Sun Odyssey"],
  "Quicksilver": ["Activ 505", "Activ 605", "Captur"],
  "Sea-Doo": ["GTI", "GTR", "RXP-X", "Spark"],
  "Yamaha": ["FX Cruiser", "VX Deluxe", "SuperJet"],
  "Zodiac": ["Medline", "Open", "Pro"],
  "Qayıq / Kater": ["Alüminium qayıq", "Balıqçı qayığı", "Şişmə qayıq", "Kater", "Yaxta", "Su motosikleti", "Katamaran"],
};

export const airModels: Record<string, string[]> = {
  "Cessna": ["172 Skyhawk", "182 Skylane", "208 Caravan", "Citation"],
  "Piper": ["Archer", "M350", "Seneca"],
  "Robinson": ["R22", "R44", "R66"],
  "Airbus Helicopters": ["H125", "H130", "H145"],
  "Bell": ["206", "407", "429"],
  "DJI": ["Agras T40", "Mavic 3", "Matrice 350"],
  "Digər": ["Planer", "Paraplan", "Dron", "Təyyarə", "Helikopter"],
};

export const partsBrands: Record<string, string[]> = {
  "Kuza hissələri": ["Bamper", "Kapot", "Qapı", "Fara", "Stop", "Güzgü", "Qanad", "Baqaj qapağı"],
  "Mühərrik hissələri": ["Porşen", "Klapan", "Silindr başlığı", "Zəncir/Qayış", "Turbin", "Radiator", "Su nasosu"],
  "Sürət qutusu": ["Avtomat qutu", "Mexanik qutu", "Debriyaj dəsti", "Hidrotransformator"],
  "Əyləc sistemi": ["Əyləc diski", "Əyləc kolodkası", "Suport", "ABS bloku"],
  "Asqı sistemi": ["Amortizator", "Yay", "Şaraboy", "Rıçaq", "Stabilizator"],
  "Elektrik": ["Akkumulyator", "Starter", "Generator", "Ehtiyacsız blok (ECU)", "Şam", "Sensor"],
  "Salon": ["Oturacaq", "Sükan", "Torpeda", "Monitor / Multimedia", "Kondisioner radiatoru"],
  "Təkər və disklər": ["Yay təkəri", "Qış təkəri", "Universal təkər", "Yüngül lehimli disk", "Dəmir disk", "Kalpak"],
  "Yağ və maye": ["Mühərrik yağı", "Qutu yağı", "Antifriz", "Əyləc mayesi", "Filtr"],
  "Aksesuar": ["Ayaqaltı", "Örtük", "Videoqeydiyyatçı", "Radar detektor", "Baqaj boksu", "Yük relsi"],
};

export function getBrandMap(type: VehicleType): Record<string, string[]> {
  switch (type) {
    case "car": return carModels;
    case "moto": return motoModels;
    case "truck": return truckModels;
    case "bus": return busModels;
    case "agro": return agroModels;
    case "water": return waterModels;
    case "air": return airModels;
    case "parts": return partsBrands;
    default: return carModels;
  }
}

export function vehicleTypeFromCategory(slug?: string | null): VehicleType {
  const found = VEHICLE_TYPES.find((v) => v.categorySlug === slug);
  return found?.value || "car";
}

// ---------- Texniki seçimlər ----------

export const BODY_TYPES = [
  "Sedan", "Hetçbek", "Universal", "Kupe", "Kabriolet", "Offroader / SUV",
  "Krossover", "Pikap", "Miniven", "Mikroavtobus", "Furqon", "Liftbek", "Rodster", "Limuzin",
];

export const FUEL_TYPES = ["Benzin", "Dizel", "Qaz", "Hibrid", "Plug-in hibrid", "Elektro"];

export const GEARBOX_TYPES = ["Avtomat", "Mexaniki", "Robotlaşdırılmış", "Variator"];

export const DRIVE_TYPES = ["Ön", "Arxa", "Tam (4x4)"];

export const COLORS = [
  "Ağ", "Qara", "Gümüşü", "Boz", "Qırmızı", "Mavi", "Göy", "Yaşıl", "Qəhvəyi",
  "Bej", "Sarı", "Narıncı", "Bənövşəyi", "Qızılı", "Çəhrayı", "Şabalıdı", "Yaş asfalt",
];

export const OWNER_COUNTS = ["1", "2", "3", "4+"];

export const SEAT_COUNTS = ["2", "3", "4", "5", "6", "7", "8+"];

export const MARKET_OPTIONS = ["Avropa", "ABŞ", "Yaponiya", "Koreya", "Çin", "Rusiya", "Dubay", "Yerli (Azərbaycan)"];

export const CONDITION_OPTIONS = ["Yeni", "Sürülmüş", "Qəzalı / Ehtiyat hissə kimi"];

export const VEHICLE_FEATURES = [
  "ABS", "Yüngül lehimli disklər", "Lyuk", "Dəri salon", "Kondisioner", "Klimat kontrol",
  "Oturacaqların isidilməsi", "Oturacaqların ventilyasiyası", "Park radarı", "Arxa görüntü kamerası",
  "360° kamera", "Yan pərdələr", "Xenon / LED faralar", "Yağış sensoru", "Mərkəzi qapanma",
  "Siqnalizasiya", "Start/Stop düyməsi", "Kruiz kontrol", "Adaptiv kruiz kontrol", "Multimedia / Monitor",
  "CarPlay / Android Auto", "Elektrik oturacaqlar", "Elektrik şüşələr", "Qızdırılan sükan",
  "Ksenon işıqlar", "Panoram dam", "Şəritdə saxlama sistemi", "Kor nöqtə sensoru", "Avtomatik parking",
  "Qoşqu qurğusu", "Yük relsi", "Elektrik baqaj", "Hava asqısı",
];

export const DAMAGE_OPTIONS = ["Rənglənməmiş və vurulmamış", "Rənglənmiş", "Vurulmuş", "Qəzalı"];

export const YEARS: number[] = (() => {
  const current = new Date().getFullYear() + 1;
  const arr: number[] = [];
  for (let y = current; y >= 1940; y--) arr.push(y);
  return arr;
})();

export const ENGINE_VOLUMES: string[] = (() => {
  const arr: string[] = [];
  for (let v = 0.5; v <= 8.0 + 1e-9; v += 0.1) arr.push(v.toFixed(1));
  return arr;
})();

export const MILEAGE_STEPS = [0, 10000, 30000, 50000, 80000, 100000, 150000, 200000, 300000, 500000];

export const PRICE_STEPS = [0, 5000, 10000, 15000, 20000, 30000, 40000, 50000, 75000, 100000, 200000];
