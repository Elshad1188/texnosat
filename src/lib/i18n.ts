import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Initialize with empty resources; loaded dynamically from DB
i18n
  .use(initReactI18next)
  .init({
    resources: {
      az: { translation: {} },
      ru: { translation: {} },
    },
    lng: localStorage.getItem("app_language") || "az",
    fallbackLng: "az",
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;
