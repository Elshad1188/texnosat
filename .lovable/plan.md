# Sayt məlumatlarının Firebase-ə bağlanması

## Məsələ

Saytın bütün məlumatları hazırda Lovable Cloud məlumat bazasında saxlanılır (elanlar, istifadəçilər, mesajlar, mağazalar, sifarişlər və s.). Ayrıca yazılmış tətbiqiniz isə Firebase-ə bağlıdır və hər iki yerdə eyni elanlar görünməlidir.

## Vacib qeyd (dürüst tövsiyə)

Firebase-ə **tam köçmək** tövsiyə etmirəm, çünki saytın 50+ cədvəli, onlarla avtomatik funksiyası (bildirişlər, ödənişlər, yarışma, referal sistemi), giriş sistemi və fayl saxlama sistemi hamısı mövcud bazaya bağlıdır. Tam köçmə saytın böyük hissəsinin yenidən yazılması deməkdir və ödəniş/bildiriş funksiyaları pozula bilər.

Bunun əvəzinə iki real variant var:

## Variant A (Tövsiyə olunan): Tətbiq birbaşa mövcud bazaya bağlanır

Firebase ümumiyyətlə lazım deyil. Ayrıca tətbiqiniz saytın mövcud backend-inə qoşulur:

- Tətbiqə Supabase JS kitabxanası (və ya Flutter/Swift/Kotlin üçün Supabase SDK) əlavə olunur
- Tətbiq eyni API ünvanı və açar ilə bağlanır — elanlar, kateqoriyalar, axtarış, sevimlilər, mesajlar hamısı eyni məlumatdan oxunur
- Saytda nə dəyişirsə, tətbiqdə dərhal görünür (real vaxt rejimində)
- Sizdən tələb olunur: ayrıca tətbiqin koduna giriş (tətbiqi kim yazıbsa, ona API məlumatlarını vermək)

Bu variantda bu layihədə kod dəyişikliyi demək olar ki, lazım deyil — yalnız tətbiq tərəfində bağlantı qurulur.

## Variant B: Firebase-ə avtomatik sinxronizasiya (körpü)

Məlumatlar saytda qalır, amma hər dəyişiklik Firebase Firestore-a avtomatik kopyalanır:

- Yeni edge function-lar: elan yaradılanda/dəyişəndə/silindəndə Firebase Firestore-a yazır
- İlkin köçürmə: mövcud bütün elanlar bir dəfəlik Firebase-ə köçürülür
- Sinxronlaşdırılan məlumatlar: elanlar, kateqoriyalar, bölgələr, mağazalar, bannerlər
- Firebase service account açarı lazımdır (siz Firebase konsolundan götürüb təhlükəsiz formada əlavə edəcəksiniz)
- Məhdudiyyət: mesajlaşma, ödəniş, giriş (auth) kimi funksiyalar sayt tərəfində qalır — Firebase-ə yalnız oxunan məlumatlar (elanlar və s.) gedir

## Tətbiq planı (Variant B seçilərsə)

1. Firebase-də Firestore bazası yaradın və service account açarı əldə edin (təlimat veriləcək)
2. Açarı təhlükəsiz şəkildə layihəyə əlavə etməyiniz üçün forma açılacaq
3. `firebase-sync` edge function-u: elanlar/kateqoriyalar üçün webhook tipli sinxronizasiya
4. Mövcud məlumatların bir dəfəlik köçürülməsi funksiyası
5. Test: saytda yeni elan → Firebase-də görünməsi

## Sual (planı təsdiqləməzdən əvvəl)

Hansı variantı seçirsiniz? Variant A sadə və etibarlıdır, amma tətbiq kodunun dəyişməsini tələb edir. Variant B Firebase-i saxlayır, amma məlumatlar iki yerdə olur və gecikmə/risk yaranır.
