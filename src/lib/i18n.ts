import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Local navigation labels remain usable when hosted translations are unavailable.
// Admin-managed translations loaded by LanguageProvider override these defaults.
const az = {
  "nav.login": "Daxil ol", "nav.home": "Ana səhifə", "nav.products": "Elanlar",
  "nav.stores": "Mağazalar", "nav.blog": "Bloq", "nav.admin": "Admin panel",
  "nav.create_listing": "Elan yerləşdir", "nav.create_store": "Mağaza yarat",
  "nav.search_placeholder": "Nə axtarırsınız?", "hero.search_button": "Axtar",
  "common.all": "Hamısı", "common.all_short": "Hamısı", "common.view_all": "Hamısına bax",
  "categories.title": "Kateqoriyalar", "footer.about": "Haqqımızda",
  "footer.contact": "Əlaqə", "footer.rules": "Qaydalar", "footer.privacy": "Məxfilik siyasəti",
  "mobilenav.home": "Ana səhifə", "mobilenav.add": "Əlavə et",
  "mobilenav.messages": "Mesajlar", "mobilenav.profile": "Profil", "mobilenav.favorites": "Seçilmişlər",
};
const ru = {
  "nav.login": "Войти", "nav.home": "Главная", "nav.products": "Объявления",
  "nav.stores": "Магазины", "nav.blog": "Блог", "nav.admin": "Админ-панель",
  "nav.create_listing": "Подать объявление", "nav.create_store": "Создать магазин",
  "nav.search_placeholder": "Что вы ищете?", "hero.search_button": "Поиск",
  "common.all": "Все", "common.all_short": "Все", "common.view_all": "Все объявления",
  "categories.title": "Категории", "footer.about": "О нас",
  "footer.contact": "Контакты", "footer.rules": "Правила", "footer.privacy": "Конфиденциальность",
  "mobilenav.home": "Главная", "mobilenav.add": "Добавить",
  "mobilenav.messages": "Сообщения", "mobilenav.profile": "Профиль", "mobilenav.favorites": "Избранное",
};
i18n
  .use(initReactI18next)
  .init({
    resources: {
      az: { translation: az },
      ru: { translation: ru },
    },
    lng: localStorage.getItem("app_language") || "az",
    fallbackLng: "az",
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;
