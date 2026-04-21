-- Translations table for multilingual support
CREATE TABLE public.translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  az TEXT NOT NULL DEFAULT '',
  ru TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'common',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_translations_key ON public.translations(key);
CREATE INDEX idx_translations_category ON public.translations(category);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view translations"
ON public.translations FOR SELECT
USING (true);

CREATE POLICY "Admins can manage translations"
ON public.translations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_translations_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Site settings: enable Russian language toggle
INSERT INTO public.site_settings (key, value)
VALUES ('language_settings', '{"ru_enabled": true, "default_language": "az"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed initial translations (common UI)
INSERT INTO public.translations (key, az, ru, category) VALUES
-- Header
('nav.home', 'Ana səhifə', 'Главная', 'header'),
('nav.products', 'Elanlar', 'Объявления', 'header'),
('nav.stores', 'Mağazalar', 'Магазины', 'header'),
('nav.reels', 'Reels', 'Reels', 'header'),
('nav.blog', 'Bloq', 'Блог', 'header'),
('nav.favorites', 'Seçilmişlər', 'Избранное', 'header'),
('nav.messages', 'Mesajlar', 'Сообщения', 'header'),
('nav.profile', 'Profil', 'Профиль', 'header'),
('nav.login', 'Daxil ol', 'Войти', 'header'),
('nav.register', 'Qeydiyyat', 'Регистрация', 'header'),
('nav.logout', 'Çıxış', 'Выйти', 'header'),
('nav.create_listing', 'Elan yerləşdir', 'Подать объявление', 'header'),
('nav.create_store', 'Mağaza yarat', 'Создать магазин', 'header'),
('nav.balance', 'Balans', 'Баланс', 'header'),
('nav.orders', 'Sifarişlər', 'Заказы', 'header'),
('nav.support', 'Dəstək', 'Поддержка', 'header'),
('nav.admin', 'Admin panel', 'Админ-панель', 'header'),
('nav.search_placeholder', 'Nə axtarırsınız?', 'Что вы ищете?', 'header'),
('nav.compare', 'Müqayisə', 'Сравнение', 'header'),
('nav.spin', 'Hədiyyə çarxı', 'Колесо подарков', 'header'),

-- Footer
('footer.about', 'Haqqımızda', 'О нас', 'footer'),
('footer.rules', 'Qaydalar', 'Правила', 'footer'),
('footer.privacy', 'Məxfilik siyasəti', 'Политика конфиденциальности', 'footer'),
('footer.contact', 'Əlaqə', 'Контакты', 'footer'),
('footer.copyright', 'Bütün hüquqlar qorunur', 'Все права защищены', 'footer'),
('footer.follow_us', 'Bizi izləyin', 'Подписывайтесь', 'footer'),

-- Hero
('hero.title', 'Hər şeyi tap, hər şeyi sat', 'Найди всё, продай всё', 'hero'),
('hero.subtitle', 'Azərbaycanın ən böyük elan platforması', 'Крупнейшая платформа объявлений Азербайджана', 'hero'),
('hero.search_button', 'Axtar', 'Поиск', 'hero'),
('hero.all_categories', 'Bütün kateqoriyalar', 'Все категории', 'hero'),

-- Categories
('categories.title', 'Kateqoriyalar', 'Категории', 'categories'),
('categories.view_all', 'Hamısına bax', 'Смотреть все', 'categories'),

-- Common
('common.loading', 'Yüklənir...', 'Загрузка...', 'common'),
('common.save', 'Yadda saxla', 'Сохранить', 'common'),
('common.cancel', 'Ləğv et', 'Отмена', 'common'),
('common.delete', 'Sil', 'Удалить', 'common'),
('common.edit', 'Redaktə et', 'Редактировать', 'common'),
('common.confirm', 'Təsdiq et', 'Подтвердить', 'common'),
('common.back', 'Geri', 'Назад', 'common'),
('common.next', 'İrəli', 'Далее', 'common'),
('common.search', 'Axtar', 'Поиск', 'common'),
('common.send', 'Göndər', 'Отправить', 'common'),
('common.yes', 'Bəli', 'Да', 'common'),
('common.no', 'Xeyr', 'Нет', 'common'),
('common.close', 'Bağla', 'Закрыть', 'common'),
('common.error', 'Xəta', 'Ошибка', 'common'),
('common.success', 'Uğurlu', 'Успешно', 'common'),
('common.required', 'Mütləqdir', 'Обязательно', 'common'),
('common.optional', 'İstəyə bağlı', 'По желанию', 'common'),
('common.all', 'Hamısı', 'Все', 'common'),
('common.new', 'Yeni', 'Новый', 'common'),
('common.used', 'İşlənmiş', 'Б/у', 'common'),
('common.price', 'Qiymət', 'Цена', 'common'),
('common.location', 'Yer', 'Местоположение', 'common'),
('common.category', 'Kateqoriya', 'Категория', 'common'),
('common.description', 'Açıqlama', 'Описание', 'common'),
('common.title', 'Başlıq', 'Заголовок', 'common'),
('common.phone', 'Telefon', 'Телефон', 'common'),
('common.email', 'E-poçt', 'Эл. почта', 'common'),
('common.password', 'Şifrə', 'Пароль', 'common'),
('common.name', 'Ad', 'Имя', 'common'),
('common.from', 'dən', 'от', 'common'),
('common.to', 'ə qədər', 'до', 'common'),
('common.show_more', 'Daha çox göstər', 'Показать больше', 'common'),
('common.show_less', 'Daha az göstər', 'Показать меньше', 'common'),
('common.no_results', 'Nəticə tapılmadı', 'Ничего не найдено', 'common'),
('common.try_again', 'Yenidən cəhd edin', 'Попробуйте снова', 'common'),

-- Auth
('auth.welcome', 'Xoş gəldiniz', 'Добро пожаловать', 'auth'),
('auth.signin_title', 'Hesabınıza daxil olun', 'Войдите в свой аккаунт', 'auth'),
('auth.signup_title', 'Yeni hesab yaradın', 'Создайте новый аккаунт', 'auth'),
('auth.full_name', 'Ad və soyad', 'Имя и фамилия', 'auth'),
('auth.forgot_password', 'Şifrəni unutmusunuz?', 'Забыли пароль?', 'auth'),
('auth.no_account', 'Hesabınız yoxdur?', 'Нет аккаунта?', 'auth'),
('auth.have_account', 'Artıq hesabınız var?', 'Уже есть аккаунт?', 'auth'),
('auth.signup_link', 'Qeydiyyatdan keçin', 'Зарегистрируйтесь', 'auth'),
('auth.signin_link', 'Daxil olun', 'Войдите', 'auth'),
('auth.referral_code', 'Referal kodu (istəyə bağlı)', 'Реферальный код (по желанию)', 'auth'),
('auth.continue_google', 'Google ilə davam et', 'Продолжить с Google', 'auth'),

-- Mobile nav
('mobilenav.home', 'Ana səhifə', 'Главная', 'mobilenav'),
('mobilenav.favorites', 'Seçilmişlər', 'Избранное', 'mobilenav'),
('mobilenav.add', 'Əlavə et', 'Добавить', 'mobilenav'),
('mobilenav.reels', 'Reels', 'Reels', 'mobilenav'),
('mobilenav.messages', 'Mesajlar', 'Сообщения', 'mobilenav'),
('mobilenav.profile', 'Profil', 'Профиль', 'mobilenav'),

-- Language
('lang.az', 'Azərbaycan', 'Азербайджанский', 'language'),
('lang.ru', 'Русский', 'Русский', 'language'),
('lang.switch', 'Dili dəyişdir', 'Сменить язык', 'language')
ON CONFLICT (key) DO NOTHING;