# Firebase bağlantısı — texniki qiymətləndirmə və plan

## Sual

Saytın bütün funksiyaları Firebase-ə köçürsək tam işləyəcəkmi? Firebase-in olmayan funksiyası varmı?

## Dürüst cavab: XEYR

Sayt Postgres (Lovable Cloud) üzərində qurulub və onlarla xüsusi imkandan istifadə edir. Firebase Firestore bu imkanları vermir, ona görə tam köçmə 60-70% yenidən yazmaq deməkdir və kritik funksiyalar pozular.

### Firebase-in OLMADIĞI / çatışmayan funksiyalar

1. **Avtomatik bildiriş trigger-ləri (30+ ədəd)** — yeni elan, mesaj, stok azalması, yeni istifadəçi, şikayət, rəy, mağaza sorğusu və s. hər biri üçün Postgres trigger-i var. Firestore-da bunların hər biri üçün ayrıca Cloud Function yazmaq lazımdır.
2. **Ödəniş sistemi (Epoint)** — `process_contest_join`, `spend_balance`, balans əməliyyatları Postgres transaction və `FOR UPDATE` kilidi ilə işləyir. Firestore-də race condition riski yüksəkdir, nəticədə cüt ödəniş/balans xətası mümkündür.
3. **Yarışma sistemi** — `finalize_current_contest`, `process_contest_free_join`, `register_contest_invite`, `process_referral` kimi 20+ security-definer funksiya. Firestore-da JS-lə yenidən qurmaq və təhlükəsizliyi təmin etmək lazımdır.
4. **Hədiyyə çarxı və referal bonusları** — maliyyə əməliyyatları atomik PostgreSQL transaction tələb edir.
5. **pg_cron avtomatika** — həftəlik yarışma yekunlaşması, email növbəsi avtomatik işləyir. Firebase-də ayrıca Cloud Scheduler lazımdır.
6. **Email növbəsi (pgmq)** — auth/transactional email-lər Postgres növbəsi ilə göndərilir.
7. **RLS (sətir-səviyyəsi təhlükəsizlik)** — Firestore "security rules" tam fərqli modeldir; 50+ mövcud siyasəti yenidən qurmaq riskli və vaxt aparıcıdır.
8. **Axtarış və saved_searches** — JSONB filter və avtomatik uyğunluq Firestore-də performans problemi yaradır.
9. **Vault secrets, net.http_post** — server daxili API-lar yoxdur.

## Tövsiyə olunan həll: Variant A (Firebase-siz)

Ayrıca yazılmış tətbiqinizi Firebase-ə deyil, birbaşa saytın mövcud bazasına bağlamaq:

- Tətbiqə Supabase SDK əlavə olunur (Flutter / Swift / Kotlin / React Native — hər biri üçün var)
- Eyni API url və anon açarı ilə bağlanır
- Bütün funksiyalar olduğu kimi işləyir: elanlar, mesajlar, ödəniş, yarışma, bildiriş, balans
- Real vaxt yenilənmə (Supabase Realtime)
- Bu layihədə kod dəyişikliyi demək olar ki, yoxdur — yalnız tətbiq tərəfində bağlantı qurulur
- Tətbiq koduna giriş və ya tətbiqin yazıldığı dil məlum olmalıdır

## Variant B (Firebase-ə sinxronizasiya — yalnız oxunan məlumatlar)

Yalnız son çarə kimi: elanlar, kateqoriyalar, bölgələr, mağazalar Firestore-a kopyalanır, amma giriş, ödəniş, mesaj, yarışma saytda qalır. Bu zaman:
- `firebase-sync` edge function-ları yazılır (webhook tipli)
- İlkin köçürmə funksiyası
- Firebase service account açarı tələb olunur
- Məhdudiyyət: mesajlaşma/ödəniş tətbiqdə işləməyəcək (sayta yönləndirmə lazım)

## Nə lazımdır (Variant A üçün)

1. Ayrıca tətbiqin hansı dil/framework-də yazıldığını bildirməyiniz
2. Tətbiqin hazır Firebase-i tamamilə çıxarmaq və ya paralel saxlamaq istədiyinizi təsdiqləməyiniz
3. Bu layihənin backend məlumatları (url + anon açar) — artıq mövcuddur, tətbiqə veriləcək

## Nəticə

Firebase-ə tam köçmək tövsiyə etmirəm — ödəniş, yarışma, bildiriş kimi funksiyalar mütləq pozular. Variant A (tətbiq birbaşa baza qoşulur) etibarlı, sürətli və bütün funksiyaları saxlayır.
