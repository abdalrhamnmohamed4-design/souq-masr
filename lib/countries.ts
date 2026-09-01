/**
 * lib/countries.ts — قائمة دول عالمية كاملة لاختيار كود الدولة وقت تسجيل
 * الدخول (طلب المستخدم: "يجب أن يدعم قائمة الدول الدولية الكاملة").
 *
 * كل دولة: كود ISO 3166-1 alpha-2، اسمها بالعربي، وكود الاتصال الدولي.
 * العلم مش مخزّن كنص إيموجي لكل دولة (200 سطر تكرار عرضة للغلط) — بيتحسب
 * برمجيًا من كود الـISO عبر Regional Indicator Symbols (نفس الطريقة اللي
 * كل النظم الحديثة بتستخدمها).
 */

export type Country = {
  iso2: string; // ISO 3166-1 alpha-2, e.g. 'EG'
  nameAr: string;
  dial: string; // كود الاتصال الدولي من غير '+'، e.g. '20'
};

/** بيحوّل كود ISO لعلم — كل حرف بيتحوّل لرمز Regional Indicator المقابل. */
export function flagEmoji(iso2: string): string {
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)),
  );
}

/** الدول المطلوب ظهورها فوق كقائمة سريعة (مصر افتراضيًا الأولى) — نفس
 * التسعة اللي المستخدم طلبهم بالظبط، بالترتيب. */
export const PINNED_ISO2 = ['EG', 'SA', 'SD', 'SY', 'LY', 'AE', 'KW', 'IQ', 'DZ'];

export const DEFAULT_COUNTRY_ISO2 = 'EG';

export const COUNTRIES: Country[] = [
  // ---- الوطن العربي أولًا (أولوية لقاعدة مستخدمي سوق مصر) ----
  { iso2: 'EG', nameAr: 'مصر', dial: '20' },
  { iso2: 'SA', nameAr: 'السعودية', dial: '966' },
  { iso2: 'SD', nameAr: 'السودان', dial: '249' },
  { iso2: 'SY', nameAr: 'سوريا', dial: '963' },
  { iso2: 'LY', nameAr: 'ليبيا', dial: '218' },
  { iso2: 'AE', nameAr: 'الإمارات', dial: '971' },
  { iso2: 'KW', nameAr: 'الكويت', dial: '965' },
  { iso2: 'IQ', nameAr: 'العراق', dial: '964' },
  { iso2: 'DZ', nameAr: 'الجزائر', dial: '213' },
  { iso2: 'MA', nameAr: 'المغرب', dial: '212' },
  { iso2: 'TN', nameAr: 'تونس', dial: '216' },
  { iso2: 'JO', nameAr: 'الأردن', dial: '962' },
  { iso2: 'LB', nameAr: 'لبنان', dial: '961' },
  { iso2: 'PS', nameAr: 'فلسطين', dial: '970' },
  { iso2: 'OM', nameAr: 'عُمان', dial: '968' },
  { iso2: 'QA', nameAr: 'قطر', dial: '974' },
  { iso2: 'BH', nameAr: 'البحرين', dial: '973' },
  { iso2: 'YE', nameAr: 'اليمن', dial: '967' },
  { iso2: 'MR', nameAr: 'موريتانيا', dial: '222' },
  { iso2: 'SO', nameAr: 'الصومال', dial: '252' },
  { iso2: 'DJ', nameAr: 'جيبوتي', dial: '253' },
  { iso2: 'KM', nameAr: 'جزر القمر', dial: '269' },

  // ---- باقي دول العالم (أبجدي بالعربي تقريبًا) ----
  { iso2: 'AF', nameAr: 'أفغانستان', dial: '93' },
  { iso2: 'AL', nameAr: 'ألبانيا', dial: '355' },
  { iso2: 'DE', nameAr: 'ألمانيا', dial: '49' },
  { iso2: 'AD', nameAr: 'أندورا', dial: '376' },
  { iso2: 'AO', nameAr: 'أنغولا', dial: '244' },
  { iso2: 'UY', nameAr: 'أوروجواي', dial: '598' },
  { iso2: 'UZ', nameAr: 'أوزبكستان', dial: '998' },
  { iso2: 'UA', nameAr: 'أوكرانيا', dial: '380' },
  { iso2: 'UG', nameAr: 'أوغندا', dial: '256' },
  { iso2: 'IS', nameAr: 'آيسلندا', dial: '354' },
  { iso2: 'IE', nameAr: 'أيرلندا', dial: '353' },
  { iso2: 'AZ', nameAr: 'أذربيجان', dial: '994' },
  { iso2: 'ET', nameAr: 'إثيوبيا', dial: '251' },
  { iso2: 'ES', nameAr: 'إسبانيا', dial: '34' },
  { iso2: 'IT', nameAr: 'إيطاليا', dial: '39' },
  { iso2: 'IL', nameAr: 'إسرائيل', dial: '972' },
  { iso2: 'EE', nameAr: 'إستونيا', dial: '372' },
  { iso2: 'EC', nameAr: 'الإكوادور', dial: '593' },
  { iso2: 'SV', nameAr: 'السلفادور', dial: '503' },
  { iso2: 'SN', nameAr: 'السنغال', dial: '221' },
  { iso2: 'GQ', nameAr: 'غينيا الاستوائية', dial: '240' },
  { iso2: 'AR', nameAr: 'الأرجنتين', dial: '54' },
  { iso2: 'AM', nameAr: 'أرمينيا', dial: '374' },
  { iso2: 'PT', nameAr: 'البرتغال', dial: '351' },
  { iso2: 'BR', nameAr: 'البرازيل', dial: '55' },
  { iso2: 'BA', nameAr: 'البوسنة والهرسك', dial: '387' },
  { iso2: 'GA', nameAr: 'الغابون', dial: '241' },
  { iso2: 'GM', nameAr: 'غامبيا', dial: '220' },
  { iso2: 'PY', nameAr: 'الباراغواي', dial: '595' },
  { iso2: 'PA', nameAr: 'بنما', dial: '507' },
  { iso2: 'GW', nameAr: 'غينيا بيساو', dial: '245' },
  { iso2: 'PH', nameAr: 'الفلبين', dial: '63' },
  { iso2: 'FJ', nameAr: 'فيجي', dial: '679' },
  { iso2: 'CY', nameAr: 'قبرص', dial: '357' },
  { iso2: 'KZ', nameAr: 'كازاخستان', dial: '7' },
  { iso2: 'ME', nameAr: 'الجبل الأسود', dial: '382' },
  { iso2: 'CV', nameAr: 'الرأس الأخضر', dial: '238' },
  { iso2: 'KG', nameAr: 'قيرغيزستان', dial: '996' },
  { iso2: 'CO', nameAr: 'كولومبيا', dial: '57' },
  { iso2: 'CR', nameAr: 'كوستاريكا', dial: '506' },
  { iso2: 'CI', nameAr: 'ساحل العاج', dial: '225' },
  { iso2: 'CU', nameAr: 'كوبا', dial: '53' },
  { iso2: 'KH', nameAr: 'كمبوديا', dial: '855' },
  { iso2: 'CM', nameAr: 'الكاميرون', dial: '237' },
  { iso2: 'CA', nameAr: 'كندا', dial: '1' },
  { iso2: 'KI', nameAr: 'كيريباتي', dial: '686' },
  { iso2: 'CD', nameAr: 'الكونغو الديمقراطية', dial: '243' },
  { iso2: 'CG', nameAr: 'الكونغو برازافيل', dial: '242' },
  { iso2: 'KR', nameAr: 'كوريا الجنوبية', dial: '82' },
  { iso2: 'KP', nameAr: 'كوريا الشمالية', dial: '850' },
  { iso2: 'HR', nameAr: 'كرواتيا', dial: '385' },
  { iso2: 'LA', nameAr: 'لاوس', dial: '856' },
  { iso2: 'LV', nameAr: 'لاتفيا', dial: '371' },
  { iso2: 'LT', nameAr: 'ليتوانيا', dial: '370' },
  { iso2: 'LI', nameAr: 'ليختنشتاين', dial: '423' },
  { iso2: 'LR', nameAr: 'ليبيريا', dial: '231' },
  { iso2: 'LS', nameAr: 'ليسوتو', dial: '266' },
  { iso2: 'LU', nameAr: 'لوكسمبورغ', dial: '352' },
  { iso2: 'MG', nameAr: 'مدغشقر', dial: '261' },
  { iso2: 'MY', nameAr: 'ماليزيا', dial: '60' },
  { iso2: 'MW', nameAr: 'مالاوي', dial: '265' },
  { iso2: 'ML', nameAr: 'مالي', dial: '223' },
  { iso2: 'MT', nameAr: 'مالطا', dial: '356' },
  { iso2: 'MK', nameAr: 'مقدونيا الشمالية', dial: '389' },
  { iso2: 'MX', nameAr: 'المكسيك', dial: '52' },
  { iso2: 'MZ', nameAr: 'موزمبيق', dial: '258' },
  { iso2: 'MD', nameAr: 'مولدوفا', dial: '373' },
  { iso2: 'MC', nameAr: 'موناكو', dial: '377' },
  { iso2: 'MN', nameAr: 'منغوليا', dial: '976' },
  { iso2: 'MU', nameAr: 'موريشيوس', dial: '230' },
  { iso2: 'MM', nameAr: 'ميانمار', dial: '95' },
  { iso2: 'NA', nameAr: 'ناميبيا', dial: '264' },
  { iso2: 'NR', nameAr: 'ناورو', dial: '674' },
  { iso2: 'NP', nameAr: 'نيبال', dial: '977' },
  { iso2: 'NE', nameAr: 'النيجر', dial: '227' },
  { iso2: 'NG', nameAr: 'نيجيريا', dial: '234' },
  { iso2: 'NZ', nameAr: 'نيوزيلندا', dial: '64' },
  { iso2: 'NI', nameAr: 'نيكاراغوا', dial: '505' },
  { iso2: 'NO', nameAr: 'النرويج', dial: '47' },
  { iso2: 'NL', nameAr: 'هولندا', dial: '31' },
  { iso2: 'HN', nameAr: 'هندوراس', dial: '504' },
  { iso2: 'IN', nameAr: 'الهند', dial: '91' },
  { iso2: 'ID', nameAr: 'إندونيسيا', dial: '62' },
  { iso2: 'HU', nameAr: 'المجر', dial: '36' },
  { iso2: 'VU', nameAr: 'فانواتو', dial: '678' },
  { iso2: 'VA', nameAr: 'الفاتيكان', dial: '379' },
  { iso2: 'VE', nameAr: 'فنزويلا', dial: '58' },
  { iso2: 'VN', nameAr: 'فيتنام', dial: '84' },
  { iso2: 'FI', nameAr: 'فنلندا', dial: '358' },
  { iso2: 'FR', nameAr: 'فرنسا', dial: '33' },
  { iso2: 'PK', nameAr: 'باكستان', dial: '92' },
  { iso2: 'PW', nameAr: 'بالاو', dial: '680' },
  { iso2: 'PG', nameAr: 'بابوا غينيا الجديدة', dial: '675' },
  { iso2: 'PL', nameAr: 'بولندا', dial: '48' },
  { iso2: 'BO', nameAr: 'بوليفيا', dial: '591' },
  { iso2: 'PE', nameAr: 'بيرو', dial: '51' },
  { iso2: 'TH', nameAr: 'تايلاند', dial: '66' },
  { iso2: 'TW', nameAr: 'تايوان', dial: '886' },
  { iso2: 'TJ', nameAr: 'طاجيكستان', dial: '992' },
  { iso2: 'TZ', nameAr: 'تنزانيا', dial: '255' },
  { iso2: 'TR', nameAr: 'تركيا', dial: '90' },
  { iso2: 'TM', nameAr: 'تركمانستان', dial: '993' },
  { iso2: 'TO', nameAr: 'تونغا', dial: '676' },
  { iso2: 'TG', nameAr: 'توغو', dial: '228' },
  { iso2: 'TL', nameAr: 'تيمور الشرقية', dial: '670' },
  { iso2: 'TT', nameAr: 'ترينيداد وتوباغو', dial: '1868' },
  { iso2: 'CZ', nameAr: 'التشيك', dial: '420' },
  { iso2: 'CL', nameAr: 'تشيلي', dial: '56' },
  { iso2: 'TD', nameAr: 'تشاد', dial: '235' },
  { iso2: 'JM', nameAr: 'جامايكا', dial: '1876' },
  { iso2: 'GE', nameAr: 'جورجيا', dial: '995' },
  { iso2: 'ZA', nameAr: 'جنوب أفريقيا', dial: '27' },
  { iso2: 'SS', nameAr: 'جنوب السودان', dial: '211' },
  { iso2: 'JP', nameAr: 'اليابان', dial: '81' },
  { iso2: 'GR', nameAr: 'اليونان', dial: '30' },
  { iso2: 'GY', nameAr: 'غيانا', dial: '592' },
  { iso2: 'GT', nameAr: 'غواتيمالا', dial: '502' },
  { iso2: 'GD', nameAr: 'غرينادا', dial: '1473' },
  { iso2: 'GN', nameAr: 'غينيا', dial: '224' },
  { iso2: 'GH', nameAr: 'غانا', dial: '233' },
  { iso2: 'DK', nameAr: 'الدنمارك', dial: '45' },
  { iso2: 'DO', nameAr: 'جمهورية الدومينيكان', dial: '1809' },
  { iso2: 'DM', nameAr: 'دومينيكا', dial: '1767' },
  { iso2: 'RW', nameAr: 'رواندا', dial: '250' },
  { iso2: 'RU', nameAr: 'روسيا', dial: '7' },
  { iso2: 'RO', nameAr: 'رومانيا', dial: '40' },
  { iso2: 'ZM', nameAr: 'زامبيا', dial: '260' },
  { iso2: 'ZW', nameAr: 'زيمبابوي', dial: '263' },
  { iso2: 'WS', nameAr: 'ساموا', dial: '685' },
  { iso2: 'SM', nameAr: 'سان مارينو', dial: '378' },
  { iso2: 'ST', nameAr: 'ساو تومي وبرينسيبي', dial: '239' },
  { iso2: 'LC', nameAr: 'سانت لوسيا', dial: '1758' },
  { iso2: 'KN', nameAr: 'سانت كيتس ونيفيس', dial: '1869' },
  { iso2: 'VC', nameAr: 'سانت فينسنت والغرينادين', dial: '1784' },
  { iso2: 'LK', nameAr: 'سريلانكا', dial: '94' },
  { iso2: 'SC', nameAr: 'سيشل', dial: '248' },
  { iso2: 'SL', nameAr: 'سيراليون', dial: '232' },
  { iso2: 'SG', nameAr: 'سنغافورة', dial: '65' },
  { iso2: 'SE', nameAr: 'السويد', dial: '46' },
  { iso2: 'CH', nameAr: 'سويسرا', dial: '41' },
  { iso2: 'SR', nameAr: 'سورينام', dial: '597' },
  { iso2: 'SK', nameAr: 'سلوفاكيا', dial: '421' },
  { iso2: 'SI', nameAr: 'سلوفينيا', dial: '386' },
  { iso2: 'SB', nameAr: 'جزر سليمان', dial: '677' },
  { iso2: 'SZ', nameAr: 'إسواتيني', dial: '268' },
  { iso2: 'RS', nameAr: 'صربيا', dial: '381' },
  { iso2: 'XK', nameAr: 'كوسوفو', dial: '383' },
  { iso2: 'CN', nameAr: 'الصين', dial: '86' },
  { iso2: 'IR', nameAr: 'إيران', dial: '98' },
  { iso2: 'AT', nameAr: 'النمسا', dial: '43' },
  { iso2: 'AU', nameAr: 'أستراليا', dial: '61' },
  { iso2: 'GB', nameAr: 'المملكة المتحدة', dial: '44' },
  { iso2: 'US', nameAr: 'الولايات المتحدة', dial: '1' },
  { iso2: 'BS', nameAr: 'الباهاماس', dial: '1242' },
  { iso2: 'BB', nameAr: 'باربادوس', dial: '1246' },
  { iso2: 'BD', nameAr: 'بنغلاديش', dial: '880' },
  { iso2: 'BY', nameAr: 'روسيا البيضاء', dial: '375' },
  { iso2: 'BE', nameAr: 'بلجيكا', dial: '32' },
  { iso2: 'BZ', nameAr: 'بليز', dial: '501' },
  { iso2: 'BJ', nameAr: 'بنين', dial: '229' },
  { iso2: 'BT', nameAr: 'بوتان', dial: '975' },
  { iso2: 'BW', nameAr: 'بوتسوانا', dial: '267' },
  { iso2: 'BN', nameAr: 'بروناي', dial: '673' },
  { iso2: 'BG', nameAr: 'بلغاريا', dial: '359' },
  { iso2: 'BF', nameAr: 'بوركينا فاسو', dial: '226' },
  { iso2: 'BI', nameAr: 'بوروندي', dial: '257' },
  { iso2: 'AG', nameAr: 'أنتيغوا وبربودا', dial: '1268' },
  { iso2: 'HT', nameAr: 'هايتي', dial: '509' },
  { iso2: 'CF', nameAr: 'أفريقيا الوسطى', dial: '236' },
  { iso2: 'ER', nameAr: 'إريتريا', dial: '291' },
  { iso2: 'FM', nameAr: 'ميكرونيزيا', dial: '691' },
  { iso2: 'MH', nameAr: 'جزر مارشال', dial: '692' },
  { iso2: 'MV', nameAr: 'المالديف', dial: '960' },
  { iso2: 'NC', nameAr: 'كاليدونيا الجديدة', dial: '687' },
  { iso2: 'TV', nameAr: 'توفالو', dial: '688' },
  { iso2: 'KE', nameAr: 'كينيا', dial: '254' },
];

/** الاسم الإنجليزي القياسي لكل دولة، بنفس كود ISO — مصدر منفصل عن
 * COUNTRIES (بدل ما نضيف حقل جوه كل سطر) عشان تقليل احتمال أي غلط
 * تعديل وسط مصفوفة 195 عنصر. */
const COUNTRY_NAMES_EN: Record<string, string> = {
  EG: 'Egypt', SA: 'Saudi Arabia', SD: 'Sudan', SY: 'Syria', LY: 'Libya', AE: 'United Arab Emirates',
  KW: 'Kuwait', IQ: 'Iraq', DZ: 'Algeria', MA: 'Morocco', TN: 'Tunisia', JO: 'Jordan', LB: 'Lebanon',
  PS: 'Palestine', OM: 'Oman', QA: 'Qatar', BH: 'Bahrain', YE: 'Yemen', MR: 'Mauritania', SO: 'Somalia',
  DJ: 'Djibouti', KM: 'Comoros', AF: 'Afghanistan', AL: 'Albania', DE: 'Germany', AD: 'Andorra',
  AO: 'Angola', UY: 'Uruguay', UZ: 'Uzbekistan', UA: 'Ukraine', UG: 'Uganda', IS: 'Iceland', IE: 'Ireland',
  AZ: 'Azerbaijan', ET: 'Ethiopia', ES: 'Spain', IT: 'Italy', IL: 'Israel', EE: 'Estonia', EC: 'Ecuador',
  SV: 'El Salvador', SN: 'Senegal', GQ: 'Equatorial Guinea', AR: 'Argentina', AM: 'Armenia', PT: 'Portugal',
  BR: 'Brazil', BA: 'Bosnia and Herzegovina', GA: 'Gabon', GM: 'Gambia', PY: 'Paraguay', PA: 'Panama',
  GW: 'Guinea-Bissau', PH: 'Philippines', FJ: 'Fiji', CY: 'Cyprus', KZ: 'Kazakhstan', ME: 'Montenegro',
  CV: 'Cabo Verde', KG: 'Kyrgyzstan', CO: 'Colombia', CR: 'Costa Rica', CI: "Côte d'Ivoire", CU: 'Cuba',
  KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada', KI: 'Kiribati', CD: 'DR Congo', CG: 'Congo',
  KR: 'South Korea', KP: 'North Korea', HR: 'Croatia', LA: 'Laos', LV: 'Latvia', LT: 'Lithuania',
  LI: 'Liechtenstein', LR: 'Liberia', LS: 'Lesotho', LU: 'Luxembourg', MG: 'Madagascar', MY: 'Malaysia',
  MW: 'Malawi', ML: 'Mali', MT: 'Malta', MK: 'North Macedonia', MX: 'Mexico', MZ: 'Mozambique',
  MD: 'Moldova', MC: 'Monaco', MN: 'Mongolia', MU: 'Mauritius', MM: 'Myanmar', NA: 'Namibia', NR: 'Nauru',
  NP: 'Nepal', NE: 'Niger', NG: 'Nigeria', NZ: 'New Zealand', NI: 'Nicaragua', NO: 'Norway', NL: 'Netherlands',
  HN: 'Honduras', IN: 'India', ID: 'Indonesia', HU: 'Hungary', VU: 'Vanuatu', VA: 'Vatican City',
  VE: 'Venezuela', VN: 'Vietnam', FI: 'Finland', FR: 'France', PK: 'Pakistan', PW: 'Palau',
  PG: 'Papua New Guinea', PL: 'Poland', BO: 'Bolivia', PE: 'Peru', TH: 'Thailand', TW: 'Taiwan',
  TJ: 'Tajikistan', TZ: 'Tanzania', TR: 'Turkey', TM: 'Turkmenistan', TO: 'Tonga', TG: 'Togo',
  TL: 'Timor-Leste', TT: 'Trinidad and Tobago', CZ: 'Czechia', CL: 'Chile', TD: 'Chad', JM: 'Jamaica',
  GE: 'Georgia', ZA: 'South Africa', SS: 'South Sudan', JP: 'Japan', GR: 'Greece', GY: 'Guyana',
  GT: 'Guatemala', GD: 'Grenada', GN: 'Guinea', GH: 'Ghana', DK: 'Denmark', DO: 'Dominican Republic',
  DM: 'Dominica', RW: 'Rwanda', RU: 'Russia', RO: 'Romania', ZM: 'Zambia', ZW: 'Zimbabwe', WS: 'Samoa',
  SM: 'San Marino', ST: 'São Tomé and Príncipe', LC: 'Saint Lucia', KN: 'Saint Kitts and Nevis',
  VC: 'Saint Vincent and the Grenadines', LK: 'Sri Lanka', SC: 'Seychelles', SL: 'Sierra Leone',
  SG: 'Singapore', SE: 'Sweden', CH: 'Switzerland', SR: 'Suriname', SK: 'Slovakia', SI: 'Slovenia',
  SB: 'Solomon Islands', SZ: 'Eswatini', RS: 'Serbia', XK: 'Kosovo', CN: 'China', IR: 'Iran',
  AT: 'Austria', AU: 'Australia', GB: 'United Kingdom', US: 'United States', BS: 'Bahamas',
  BB: 'Barbados', BD: 'Bangladesh', BY: 'Belarus', BE: 'Belgium', BZ: 'Belize', BJ: 'Benin',
  BT: 'Bhutan', BW: 'Botswana', BN: 'Brunei', BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi',
  AG: 'Antigua and Barbuda', HT: 'Haiti', CF: 'Central African Republic', ER: 'Eritrea',
  FM: 'Micronesia', MH: 'Marshall Islands', MV: 'Maldives', NC: 'New Caledonia', TV: 'Tuvalu', KE: 'Kenya',
};

/** اسم الدولة حسب اللغة الحالية — عربي افتراضيًا، إنجليزي لو متاح. */
export function countryName(c: Country, lang: 'ar' | 'en'): string {
  if (lang === 'en') return COUNTRY_NAMES_EN[c.iso2] ?? c.nameAr;
  return c.nameAr;
}

/** بحث حي: بالاسم (عربي أو إنجليزي) أو كود الاتصال أو كود ISO. */
export function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES;
  return COUNTRIES.filter(
    (c) =>
      c.nameAr.includes(query.trim()) ||
      (COUNTRY_NAMES_EN[c.iso2] ?? '').toLowerCase().includes(q) ||
      c.dial.includes(q.replace(/^\+/, '')) ||
      c.iso2.toLowerCase().includes(q),
  );
}

export function getCountry(iso2: string): Country | undefined {
  return COUNTRIES.find((c) => c.iso2 === iso2);
}
