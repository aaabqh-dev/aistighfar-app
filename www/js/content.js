/* المحتوى الثابت: الأذكار، الفضائل، الأوسمة، رسائل التذكير، المدن.
   ⚠️ النصوص الشرعية يجب أن يراجعها طالب علم قبل النشر. */
(function (App) {
  'use strict';

  App.ADHKAR = [
    { id: 'astaghfar', text: 'أستغفر الله', short: 'استغفار', main: true },
    { id: 'astaghfar_tawba', text: 'أستغفر الله وأتوب إليه', short: 'استغفار وتوبة' },
    { id: 'subhan', text: 'سبحان الله', short: 'تسبيح' },
    { id: 'hamd', text: 'الحمد لله', short: 'تحميد' },
    { id: 'tahlil', text: 'لا إله إلا الله', short: 'تهليل' },
    { id: 'takbir', text: 'الله أكبر', short: 'تكبير' },
    { id: 'subhan_bihamdihi', text: 'سبحان الله وبحمده', short: 'تسبيح وتحميد' },
    { id: 'salawat', text: 'اللهم صلِّ على محمد', short: 'صلاة على النبي ﷺ' },
    { id: 'hawqala', text: 'لا حول ولا قوة إلا بالله', short: 'حوقلة' }
  ];

  App.GOAL_PRESETS = [100, 300, 500, 1000, 2000, 3000];

  // --- الآيات (نص قرآني) ---
  App.AYAT = [
    { text: 'فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا ۝ يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا ۝ وَيُمْدِدْكُم بِأَمْوَالٍ وَبَنِينَ وَيَجْعَل لَّكُمْ جَنَّاتٍ وَيَجْعَل لَّكُمْ أَنْهَارًا', key: 'ayah_0', get ref() { return App.t('ayah_0_ref'); }, get meaning() { return App.t('ayah_0'); } },
    { text: 'وَأَنِ اسْتَغْفِرُوا رَبَّكُمْ ثُمَّ تُوبُوا إِلَيْهِ يُمَتِّعْكُم مَّتَاعًا حَسَنًا إِلَىٰ أَجَلٍ مُّسَمًّى وَيُؤْتِ كُلَّ ذِي فَضْلٍ فَضْلَهُ', key: 'ayah_1', get ref() { return App.t('ayah_1_ref'); }, get meaning() { return App.t('ayah_1'); } },
    { text: 'وَيَا قَوْمِ اسْتَغْفِرُوا رَبَّكُمْ ثُمَّ تُوبُوا إِلَيْهِ يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا وَيَزِدْكُمْ قُوَّةً إِلَىٰ قُوَّتِكُمْ', key: 'ayah_2', get ref() { return App.t('ayah_2_ref'); }, get meaning() { return App.t('ayah_2'); } },
    { text: 'وَمَا كَانَ اللَّهُ مُعَذِّبَهُمْ وَهُمْ يَسْتَغْفِرُونَ', key: 'ayah_3', get ref() { return App.t('ayah_3_ref'); }, get meaning() { return App.t('ayah_3'); } },
    { text: 'وَمَن يَعْمَلْ سُوءًا أَوْ يَظْلِمْ نَفْسَهُ ثُمَّ يَسْتَغْفِرِ اللَّهَ يَجِدِ اللَّهَ غَفُورًا رَّحِيمًا', key: 'ayah_4', get ref() { return App.t('ayah_4_ref'); }, get meaning() { return App.t('ayah_4'); } },
    { text: 'وَالَّذِينَ إِذَا فَعَلُوا فَاحِشَةً أَوْ ظَلَمُوا أَنفُسَهُمْ ذَكَرُوا اللَّهَ فَاسْتَغْفَرُوا لِذُنُوبِهِمْ وَمَن يَغْفِرُ الذُّنُوبَ إِلَّا اللَّهُ', key: 'ayah_5', get ref() { return App.t('ayah_5_ref'); }, get meaning() { return App.t('ayah_5'); } },
    { text: 'وَبِالْأَسْحَارِ هُمْ يَسْتَغْفِرُونَ', key: 'ayah_6', get ref() { return App.t('ayah_6_ref'); }, get meaning() { return App.t('ayah_6'); } },
    { text: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا', key: 'ayah_7', get ref() { return App.t('ayah_7_ref'); }, get meaning() { return App.t('ayah_7'); } }
  ];

  // --- الأحاديث (صحيحة/حسنة — للمراجعة) ---
  App.AHADITH = [
    { text: 'وَاللَّهِ إِنِّي لَأَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ فِي الْيَوْمِ أَكْثَرَ مِنْ سَبْعِينَ مَرَّةً', key: 'hadith_0', get ref() { return App.t('hadith_0_ref'); }, get meaning() { return App.t('hadith_0'); } },
    { text: 'يَا أَيُّهَا النَّاسُ تُوبُوا إِلَى اللَّهِ، فَإِنِّي أَتُوبُ فِي الْيَوْمِ إِلَيْهِ مِائَةَ مَرَّةٍ', key: 'hadith_1', get ref() { return App.t('hadith_1_ref'); }, get meaning() { return App.t('hadith_1'); } },
    { text: 'إِنَّهُ لَيُغَانُ عَلَى قَلْبِي، وَإِنِّي لَأَسْتَغْفِرُ اللَّهَ فِي الْيَوْمِ مِائَةَ مَرَّةٍ', key: 'hadith_2', get ref() { return App.t('hadith_2_ref'); }, get meaning() { return App.t('hadith_2'); } },
    { text: 'يَا عِبَادِي إِنَّكُمْ تُخْطِئُونَ بِاللَّيْلِ وَالنَّهَارِ، وَأَنَا أَغْفِرُ الذُّنُوبَ جَمِيعًا، فَاسْتَغْفِرُونِي أَغْفِرْ لَكُمْ', key: 'hadith_3', get ref() { return App.t('hadith_3_ref'); }, get meaning() { return App.t('hadith_3'); } },
    { text: 'طُوبَى لِمَنْ وَجَدَ فِي صَحِيفَتِهِ اسْتِغْفَارًا كَثِيرًا', key: 'hadith_4', get ref() { return App.t('hadith_4_ref'); }, get meaning() { return App.t('hadith_4'); } }
  ];

  App.SAYYID_ISTIGHFAR = {
    text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    virtue: 'مَنْ قَالَهَا مِنَ النَّهَارِ مُوقِنًا بِهَا فَمَاتَ مِنْ يَوْمِهِ قَبْلَ أَنْ يُمْسِيَ فَهُوَ مِنْ أَهْلِ الْجَنَّةِ، وَمَنْ قَالَهَا مِنَ اللَّيْلِ وَهُوَ مُوقِنٌ بِهَا فَمَاتَ قَبْلَ أَنْ يُصْبِحَ فَهُوَ مِنْ أَهْلِ الْجَنَّةِ',
    get ref() { return App.t('sayyid_ref'); },
    get meaning() { return App.t('sayyid_meaning'); },
    get virtueMeaning() { return App.t('sayyid_virtue'); }
  };

  // ثمرات الاستغفار — مأخوذة من نصوص الآيات أعلاه
  App.BENEFITS = [
    { icon: '🤍', get title() { return App.t('benefit_0'); }, get ref() { return App.t('benefit_0_ref'); } },
    { icon: '🌧️', get title() { return App.t('benefit_1'); }, get ref() { return App.t('benefit_1_ref'); } },
    { icon: '💰', get title() { return App.t('benefit_2'); }, get ref() { return App.t('benefit_2_ref'); } },
    { icon: '🌳', get title() { return App.t('benefit_3'); }, get ref() { return App.t('benefit_3_ref'); } },
    { icon: '💪', get title() { return App.t('benefit_4'); }, get ref() { return App.t('benefit_4_ref'); } },
    { icon: '😌', get title() { return App.t('benefit_5'); }, get ref() { return App.t('benefit_5_ref'); } },
    { icon: '🛡️', get title() { return App.t('benefit_6'); }, get ref() { return App.t('benefit_6_ref'); } },
    { icon: '💚', get title() { return App.t('benefit_7'); }, get ref() { return App.t('benefit_7_ref'); } }
  ];

  // --- الأوسمة ---
  App.ACHIEVEMENTS = [
    { id: 'first', icon: '🌱', get title() { return App.t('ach_first_t'); }, get desc() { return App.t('ach_first_d'); }, test: (s) => s.total >= 1 },
    { id: 'day100', icon: '💯', get title() { return App.t('ach_day100_t'); }, get desc() { return App.t('ach_day100_d'); }, test: (s) => s.bestDay >= 100 },
    { id: 'goal1', icon: '🎯', get title() { return App.t('ach_goal1_t'); }, get desc() { return App.t('ach_goal1_d'); }, test: (s) => s.goalDays >= 1 },
    { id: 'day1000', icon: '🌟', get title() { return App.t('ach_day1000_t'); }, get desc() { return App.t('ach_day1000_d'); }, test: (s) => s.bestDay >= 1000 },
    { id: 'streak3', icon: '🔥', get title() { return App.t('ach_streak3_t'); }, get desc() { return App.t('ach_streak3_d'); }, test: (s) => s.longestStreak >= 3 },
    { id: 'streak7', icon: '🔥', get title() { return App.t('ach_streak7_t'); }, get desc() { return App.t('ach_streak7_d'); }, test: (s) => s.longestStreak >= 7 },
    { id: 'streak30', icon: '🏅', get title() { return App.t('ach_streak30_t'); }, get desc() { return App.t('ach_streak30_d'); }, test: (s) => s.longestStreak >= 30 },
    { id: 'streak100', icon: '👑', get title() { return App.t('ach_streak100_t'); }, get desc() { return App.t('ach_streak100_d'); }, test: (s) => s.longestStreak >= 100 },
    { id: 'goal30', icon: '🏆', get title() { return App.t('ach_goal30_t'); }, get desc() { return App.t('ach_goal30_d'); }, test: (s) => s.goalDays >= 30 },
    { id: 'total10k', icon: '✨', get title() { return App.t('ach_total10k_t'); }, get desc() { return App.t('ach_total10k_d'); }, test: (s) => s.total >= 10000 },
    { id: 'total100k', icon: '💎', get title() { return App.t('ach_total100k_t'); }, get desc() { return App.t('ach_total100k_d'); }, test: (s) => s.total >= 100000 },
    { id: 'total1m', icon: '🕌', get title() { return App.t('ach_total1m_t'); }, get desc() { return App.t('ach_total1m_d'); }, test: (s) => s.total >= 1000000 }
  ];

  // --- رسائل التذكير (من قاموس اللغة الحالية) ---
  App.MESSAGES = {};
  ['morning', 'notStarted', 'progress', 'almost', 'streak', 'missYou', 'afterPrayer', 'weekly', 'goalDone'].forEach((k) => {
    Object.defineProperty(App.MESSAGES, k, { get: () => App.tList('msg_' + k), enumerable: true });
  });

  App.PRAYER_NAMES = {};
  ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach((p) => {
    Object.defineProperty(App.PRAYER_NAMES, p, { get: () => App.t('prayer_' + p), enumerable: true });
  });

  // المدن لحساب أوقات الصلاة (بدون إذن موقع)
  App.CITIES = [
    { id: 'makkah', en: "Makkah", name: 'مكة المكرمة', lat: 21.4225, lng: 39.8262 },
    { id: 'madinah', en: "Madinah", name: 'المدينة المنورة', lat: 24.4672, lng: 39.6111 },
    { id: 'riyadh', en: "Riyadh", name: 'الرياض', lat: 24.7136, lng: 46.6753 },
    { id: 'jeddah', en: "Jeddah", name: 'جدة', lat: 21.4858, lng: 39.1925 },
    { id: 'dammam', en: "Dammam", name: 'الدمام', lat: 26.4207, lng: 50.0888 },
    { id: 'khobar', en: "Al Khobar", name: 'الخبر', lat: 26.2172, lng: 50.1971 },
    { id: 'taif', en: "Taif", name: 'الطائف', lat: 21.2703, lng: 40.4158 },
    { id: 'tabuk', en: "Tabuk", name: 'تبوك', lat: 28.3835, lng: 36.5662 },
    { id: 'buraydah', en: "Buraydah", name: 'بريدة', lat: 26.3592, lng: 43.9818 },
    { id: 'abha', en: "Abha", name: 'أبها', lat: 18.2164, lng: 42.5053 },
    { id: 'khamis', en: "Khamis Mushait", name: 'خميس مشيط', lat: 18.3000, lng: 42.7333 },
    { id: 'hail', en: "Hail", name: 'حائل', lat: 27.5114, lng: 41.7208 },
    { id: 'jazan', en: "Jazan", name: 'جازان', lat: 16.8892, lng: 42.5511 },
    { id: 'najran', en: "Najran", name: 'نجران', lat: 17.4924, lng: 44.1277 },
    { id: 'hofuf', en: "Al-Ahsa", name: 'الأحساء', lat: 25.3833, lng: 49.5833 },
    { id: 'jubail', en: "Jubail", name: 'الجبيل', lat: 27.0046, lng: 49.6460 },
    { id: 'yanbu', en: "Yanbu", name: 'ينبع', lat: 24.0895, lng: 38.0618 },
    { id: 'arar', en: "Arar", name: 'عرعر', lat: 30.9753, lng: 41.0381 },
    { id: 'sakaka', en: "Sakaka", name: 'سكاكا', lat: 29.9697, lng: 40.2064 },
    { id: 'baha', en: "Al Bahah", name: 'الباحة', lat: 20.0129, lng: 41.4677 },
    { id: 'kuwait', en: "Kuwait City", name: 'الكويت', lat: 29.3759, lng: 47.9774 },
    { id: 'dubai', en: "Dubai", name: 'دبي', lat: 25.2048, lng: 55.2708 },
    { id: 'abudhabi', en: "Abu Dhabi", name: 'أبوظبي', lat: 24.4539, lng: 54.3773 },
    { id: 'doha', en: "Doha", name: 'الدوحة', lat: 25.2854, lng: 51.5310 },
    { id: 'manama', en: "Manama", name: 'المنامة', lat: 26.2285, lng: 50.5860 },
    { id: 'muscat', en: "Muscat", name: 'مسقط', lat: 23.5880, lng: 58.3829 },
    { id: 'amman', en: "Amman", name: 'عمّان', lat: 31.9454, lng: 35.9284 },
    { id: 'cairo', en: "Cairo", name: 'القاهرة', lat: 30.0444, lng: 31.2357 },
    { id: 'baghdad', en: "Baghdad", name: 'بغداد', lat: 33.3152, lng: 44.3661 },
    { id: 'sanaa', en: "Sana'a", name: 'صنعاء', lat: 15.3694, lng: 44.1910 },
    { id: 'khartoum', en: "Khartoum", name: 'الخرطوم', lat: 15.5007, lng: 32.5599 },
    { id: 'rabat', en: "Rabat", name: 'الرباط', lat: 34.0209, lng: -6.8416 },
    { id: 'algiers', en: "Algiers", name: 'الجزائر', lat: 36.7538, lng: 3.0588 },
    { id: 'tunis', en: "Tunis", name: 'تونس', lat: 36.8065, lng: 10.1815 },
    { id: 'beirut', en: "Beirut", name: 'بيروت', lat: 33.8938, lng: 35.5018 },
    { id: 'damascus', en: "Damascus", name: 'دمشق', lat: 33.5138, lng: 36.2765 },
    { id: 'jerusalem', en: "Jerusalem", name: 'القدس', lat: 31.7683, lng: 35.2137 },
    { id: 'istanbul', en: "Istanbul", name: 'إسطنبول', lat: 41.0082, lng: 28.9784 },
    { id: 'jakarta', en: "Jakarta", name: 'جاكرتا', lat: -6.2088, lng: 106.8456, method: 'Singapore' },
    { id: 'surabaya', en: "Surabaya", name: 'سورابايا', lat: -7.2575, lng: 112.7521, method: 'Singapore' },
    { id: 'bandung', en: "Bandung", name: 'باندونغ', lat: -6.9175, lng: 107.6191, method: 'Singapore' },
    { id: 'medan', en: "Medan", name: 'ميدان', lat: 3.5952, lng: 98.6722, method: 'Singapore' },
    { id: 'makassar', en: "Makassar", name: 'ماكاسار', lat: -5.1477, lng: 119.4327, method: 'Singapore' },
    { id: 'kualalumpur', en: "Kuala Lumpur", name: 'كوالالمبور', lat: 3.139, lng: 101.6869, method: 'Singapore' },
    { id: 'ankara', en: "Ankara", name: 'أنقرة', lat: 39.9334, lng: 32.8597, method: 'Turkey' },
    { id: 'izmir', en: "İzmir", name: 'إزمير', lat: 38.4237, lng: 27.1428, method: 'Turkey' },
    { id: 'bursa', en: "Bursa", name: 'بورصة', lat: 40.1885, lng: 29.061, method: 'Turkey' },
    { id: 'konya', en: "Konya", name: 'قونية', lat: 37.8746, lng: 32.4932, method: 'Turkey' },
    { id: 'karachi', en: "Karachi", name: 'كراتشي', lat: 24.8607, lng: 67.0011, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'lahore', en: "Lahore", name: 'لاهور', lat: 31.5204, lng: 74.3587, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'islamabad', en: "Islamabad", name: 'إسلام آباد', lat: 33.6844, lng: 73.0479, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'peshawar', en: "Peshawar", name: 'بيشاور', lat: 34.0151, lng: 71.5249, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'faisalabad', en: "Faisalabad", name: 'فيصل آباد', lat: 31.4504, lng: 73.135, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'hyderabad_in', en: "Hyderabad", name: 'حيدر آباد', lat: 17.385, lng: 78.4867, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'delhi', en: "Delhi", name: 'دلهي', lat: 28.6139, lng: 77.209, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'dhaka', en: "Dhaka", name: 'دكا', lat: 23.8103, lng: 90.4125, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'chittagong', en: "Chattogram", name: 'شيتاغونغ', lat: 22.3569, lng: 91.7832, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'sylhet', en: "Sylhet", name: 'سلهت', lat: 24.8949, lng: 91.8687, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'kolkata', en: "Kolkata", name: 'كولكاتا', lat: 22.5726, lng: 88.3639, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'tehran', en: "Tehran", name: 'طهران', lat: 35.6892, lng: 51.389, method: 'Tehran' },
    { id: 'mashhad', en: "Mashhad", name: 'مشهد', lat: 36.2605, lng: 59.6168, method: 'Tehran' },
    { id: 'isfahan', en: "Isfahan", name: 'أصفهان', lat: 32.6546, lng: 51.668, method: 'Tehran' },
    { id: 'shiraz', en: "Shiraz", name: 'شيراز', lat: 29.5918, lng: 52.5837, method: 'Tehran' },
    { id: 'tabriz', en: "Tabriz", name: 'تبريز', lat: 38.08, lng: 46.2919, method: 'Tehran' },
    { id: 'kabul', en: "Kabul", name: 'كابل', lat: 34.5553, lng: 69.2075, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'herat', en: "Herat", name: 'هرات', lat: 34.3529, lng: 62.204, method: 'Karachi', madhab: 'Hanafi' },
    { id: 'kano', en: "Kano", name: 'كانو', lat: 12.0022, lng: 8.592, method: 'MuslimWorldLeague' },
    { id: 'abuja', en: "Abuja", name: 'أبوجا', lat: 9.0765, lng: 7.3986, method: 'MuslimWorldLeague' },
    { id: 'lagos', en: "Lagos", name: 'لاغوس', lat: 6.5244, lng: 3.3792, method: 'MuslimWorldLeague' },
    { id: 'kaduna', en: "Kaduna", name: 'كادونا', lat: 10.5105, lng: 7.4165, method: 'MuslimWorldLeague' },
    { id: 'sokoto', en: "Sokoto", name: 'سوكوتو', lat: 13.0059, lng: 5.2476, method: 'MuslimWorldLeague' },
    { id: 'maiduguri', en: "Maiduguri", name: 'مايدوغوري', lat: 11.8311, lng: 13.151, method: 'MuslimWorldLeague' },
    { id: 'niamey', en: "Niamey", name: 'نيامي', lat: 13.5116, lng: 2.1254, method: 'MuslimWorldLeague' },
    { id: 'accra', en: "Accra", name: 'أكرا', lat: 5.6037, lng: -0.187, method: 'MuslimWorldLeague' },
    { id: 'london', en: "London", name: 'لندن', lat: 51.5074, lng: -0.1278, method: 'MuslimWorldLeague' },
    { id: 'newyork', en: "New York", name: 'نيويورك', lat: 40.7128, lng: -74.006, method: 'NorthAmerica' }
  ];

  App.cityName = (c) => (App.lang.code === 'ar' ? c.name : c.en);

  App.INTERVALS = [5, 10, 15, 20, 30, 60, 120, 180].map((min) => ({ min, get label() { return App.t('int_' + min); } }));
})(window.App = window.App || {});
