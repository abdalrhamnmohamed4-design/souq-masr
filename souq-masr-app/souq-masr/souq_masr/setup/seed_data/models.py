# Ported 1:1 from ../../../mock/taxonomy/models.ts. Full depth on the PART-40
# verification brands (Apple/iPhone, Samsung, Toyota, Hyundai, Kia, BMW,
# Mercedes) exactly as specified; representative model lists for the rest,
# same as the mobile app — expandable from the admin later, not fabricated
# beyond what the mobile app itself already ships with.


def _models(brand_key, names):
	return [{"brand": brand_key, "model_name": n} for n in names]


MODELS = [
	*_models("phone-apple", [
		"iPhone 6", "iPhone 6 Plus", "iPhone 6s", "iPhone 6s Plus", "iPhone 7", "iPhone 7 Plus",
		"iPhone 8", "iPhone 8 Plus", "iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max",
		"iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max", "iPhone SE", "iPhone 12", "iPhone 12 mini",
		"iPhone 12 Pro", "iPhone 12 Pro Max", "iPhone 13", "iPhone 13 mini", "iPhone 13 Pro", "iPhone 13 Pro Max",
		"iPhone SE 2", "iPhone SE 3", "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
		"iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 16", "iPhone 16 Plus",
		"iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone 16e", "iPhone 17", "iPhone 17 Air", "iPhone 17 Pro",
		"iPhone 17 Pro Max", "أخرى",
	]),
	*_models("phone-apple", ["iPad", "iPad mini", "iPad Air", 'iPad Pro 11"', 'iPad Pro 13"']),
	*_models("phone-apple", ["MacBook Air M2", "MacBook Air M3", 'MacBook Pro 14"', 'MacBook Pro 16"', "MacBook (Intel قديم)"]),

	*_models("phone-samsung", [
		"Galaxy S22", "Galaxy S22 Ultra", "Galaxy S23", "Galaxy S23 Ultra", "Galaxy S24", "Galaxy S24 Ultra",
		"Galaxy S25", "Galaxy S25 Ultra", "Galaxy Note 20", "Galaxy Note 20 Ultra", "Galaxy Z Fold5",
		"Galaxy Z Fold6", "Galaxy Z Flip5", "Galaxy Z Flip6", "Galaxy A54", "Galaxy A55", "Galaxy A14",
		"Galaxy A34", "Galaxy M54", "Galaxy M34", "أخرى",
	]),

	*_models("phone-xiaomi", ["Xiaomi 13", "Xiaomi 14", "Xiaomi 13T", "Xiaomi 14T", "أخرى"]),
	*_models("phone-redmi", ["Redmi Note 12", "Redmi Note 13", "Redmi 12", "Redmi 13C", "أخرى"]),
	*_models("phone-poco", ["Poco X6", "Poco F6", "Poco M6", "أخرى"]),

	*_models("car-toyota", ["Corolla", "Camry", "Yaris", "RAV4", "Fortuner", "Land Cruiser", "Hilux", "Rush", "أخرى"]),
	*_models("car-hyundai", ["Elantra", "Tucson", "Accent", "Creta", "i10", "i20", "Sonata", "Santa Fe", "H-1", "أخرى"]),
	*_models("car-kia", ["Sportage", "Cerato", "Rio", "Sorento", "Picanto", "Carens", "K5", "أخرى"]),
	*_models("car-bmw", ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "iX", "i4", "i5", "i7", "أخرى"]),
	*_models("car-mercedes", ["A-Class", "B-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "أخرى"]),

	*_models("car-nissan", ["Sunny", "Sentra", "Qashqai", "X-Trail", "Patrol", "أخرى"]),
	*_models("car-renault", ["Logan", "Sandero", "Duster", "Megane", "أخرى"]),
	*_models("car-peugeot", ["301", "2008", "3008", "508", "أخرى"]),
	*_models("car-fiat", ["Tipo", "500", "Punto", "أخرى"]),
	*_models("car-volkswagen", ["Golf", "Passat", "Tiguan", "Jetta", "أخرى"]),
	*_models("car-chevrolet", ["Optra", "Cruze", "Spark", "Captiva", "أخرى"]),
	*_models("car-honda", ["Civic", "Accord", "CR-V", "أخرى"]),

	*_models("laptop-dell", ["XPS 13", "XPS 15", "Inspiron 15", "Latitude", "أخرى"]),
	*_models("laptop-hp", ["Pavilion", "EliteBook", "Omen", "ProBook", "أخرى"]),
	*_models("laptop-lenovo", ["ThinkPad", "IdeaPad", "Legion", "Yoga", "أخرى"]),
	*_models("laptop-asus", ["ROG", "ZenBook", "VivoBook", "TUF", "أخرى"]),
]
