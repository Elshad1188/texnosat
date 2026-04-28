## Məqsəd

Ana səhifədə deal-type tabs içindəki **"Otaq yoldaşı"** seçimini ləğv edib onun yerinə **"Hazır biznes"** kateqoriyası gətirmək. Hazır biznes — daşınmaz əmlakdan fərqli olaraq tam fəaliyyətdə olan biznes obyektinin (kafe, market, salon, istehsalat və s.) avadanlıqları + müştəri bazası + lokasiyası ilə birgə satışı/icarəsidir, ona görə öz xüsusi sahələri olmalıdır. Həmçinin bütün kateqoriyalarda **"Razılaşma yolu ilə"** qiymət seçimi əlavə olunacaq.

## 1) Deal-type tabs dəyişikliyi

`src/components/DealTypeTabs.tsx` — `roommate` sətrini silib yerinə əlavə edirik:
```ts
{ value: "business", label: "Hazır biznes", icon: Briefcase }
```

Tab ikonu `Briefcase` (lucide). Beləliklə tabs sırası: **Alqı-satqı · Kirayə · Günlük · Hazır biznes** (yenə də 4 sütun).

## 2) "Hazır biznes" kateqoriyasını yaratmaq

`src/data/categories.ts` faylına yeni root kateqoriya əlavə (`obyektler`-dən sonra):
```ts
{
  id: "hazir-biznes",
  name: "Hazır biznes",
  slug: "hazir-biznes",
  icon: "Briefcase",
  color: "bg-fuchsia-500",
  subCategories: [
    { id: "kafe-restoran",   name: "Kafe / Restoran",     slug: "hazir-biznes-kafe" },
    { id: "market",          name: "Market / Mağaza",     slug: "hazir-biznes-market" },
    { id: "gozellik",        name: "Gözəllik salonu",     slug: "hazir-biznes-gozellik" },
    { id: "istehsalat",      name: "İstehsalat",          slug: "hazir-biznes-istehsalat" },
    { id: "xidmet",          name: "Xidmət sahəsi",       slug: "hazir-biznes-xidmet" },
    { id: "online",          name: "Onlayn biznes",       slug: "hazir-biznes-online" },
    { id: "diger",           name: "Digər",               slug: "hazir-biznes-diger" },
  ],
},
```

## 3) Hazır biznes üçün xüsusi sahələr (category_fields)

Yeni migrasiya `hazir-biznes` (root + 7 alt slug) üçün aşağıdakı sahələri yaradır:

| field_name | label | type | options |
|---|---|---|---|
| deal_type | Əməliyyat növü | select | Satılır, Kirayəyə verilir, Pay satılır |
| business_area_m2 | Sahə (m²) | number | — |
| monthly_revenue | Aylıq dövriyyə (AZN) | number | — |
| monthly_profit | Aylıq xalis gəlir (AZN) | number | — |
| staff_count | İşçi sayı | number | — |
| operating_years | Neçə ildir fəaliyyətdədir | number | — |
| rent_included | İcarə daxildir | select | Bəli, Xeyr, Əmlak özümüzdür |
| equipment_included | Avadanlıq daxildir | select | Bəli, Xeyr, Qismən |
| license_status | Lisenziya / icazə | select | Var, Yoxdur, Tələb olunmur |
| reason_for_sale | Satış səbəbi | text | — |

Bütün bu sahələr üçün `is_active=true`, `sort_order` ardıcıl. Admin **Kateqoriya sahələri** panelindən sonradan redaktə edə biləcək (mövcud `AdminCategoryFieldsManager` ilə).

## 4) "Razılaşma yolu ilə" qiymət seçimi (bütün kateqoriyalar üçün)

CreateListing formuna qiymət bloku yanında **checkbox** əlavə olunur:
- Label: **"Qiymət razılaşma yolu ilədir"**
- Aktivləşəndə: qiymət inputu disabled olur, `price = 0` saxlanılır, `custom_fields.price_negotiable = true`.

Göstərilmə (ListingCard, ProductDetail, share text):
- `custom_fields?.price_negotiable === true` olanda qiymət əvəzinə **"Razılaşma yolu ilə"** yazısı çıxır (üç yerdə də).

Bu yalnız front-end + custom_fields istifadə edir, sxem dəyişmir.

## 5) Mövcud kodu təmizləmək

- `src/pages/CreateListing.tsx` (sətir 387-390): `roommate` mappinqini silib yerinə `business` (label "Hazır biznes" / "biznes") mappinqi əlavə.
- `src/pages/Products.tsx` (sətir 163): `roommate` filterini `business` filterinə dəyişmək (`norm === "business" || norm.includes("biznes")`).
- DB-də `validate_listing_deal_type` triggerini yeniləyirik: icazəli dəyərlər `('sale','rent','daily','business')`. Migrasiya əvvəlcə mövcud `roommate` qeydlərini `sale`-ə migrasiya edir (bina.az-da real istifadə yoxdur).

## 6) Texniki addımlar yekun

1. **DB migrasiyası**:
   - `validate_listing_deal_type` funksiyasını yeniləmək (`roommate` → `business`).
   - Mövcud `listings.deal_type='roommate'` qeydlərini `'sale'`-ə UPDATE.
   - `category_fields`-ə `hazir-biznes` üçün 10 sətir INSERT (root slug üçün).
2. **Front-end**:
   - `DealTypeTabs.tsx` — tab dəyişdir.
   - `categories.ts` — yeni root kateqoriya.
   - `CreateListing.tsx` — deal mapping + negotiable checkbox.
   - `Products.tsx` — filter mapping.
   - `ListingCard.tsx` + `ProductDetail.tsx` — "Razılaşma yolu ilə" göstəricisi.

## Qeyd

`DEAL_TYPES` icon `Users` artıq istifadə olunmadığı üçün importdan silinəcək. Hazır biznes elanları üçün `category` sütunu `hazir-biznes` slug-u alacaq, root kateqoriya kartları yığını avtomatik yenilənəcək.

Təsdiq edin — implementasiyaya başlayım.
