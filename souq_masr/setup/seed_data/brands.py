# Ported 1:1 from ../../../mock/taxonomy/brands.ts — same ids, same category
# assignments. A brand can belong to more than one category (Apple spans
# mobiles/tablets/laptops), matching the mobile app exactly.


def _car(key, name):
	return {"id": f"car-{key}", "name": name, "category_ids": ["cars"]}


def _bike(key, name):
	return {"id": f"bike-{key}", "name": name, "category_ids": ["motorcycles"]}


def _phone(key, name):
	return {"id": f"phone-{key}", "name": name, "category_ids": ["mobiles"]}


def _laptop(key, name):
	return {"id": f"laptop-{key}", "name": name, "category_ids": ["laptops"]}


def _appliance(key, name, cats):
	return {"id": f"app-{key}", "name": name, "category_ids": cats}


BRANDS = [
	# ---- سيارات (القائمة كاملة) ----
	_car("toyota", "Toyota"), _car("hyundai", "Hyundai"), _car("kia", "Kia"), _car("chevrolet", "Chevrolet"),
	_car("nissan", "Nissan"), _car("renault", "Renault"), _car("peugeot", "Peugeot"), _car("citroen", "Citroën"),
	_car("fiat", "Fiat"), _car("volkswagen", "Volkswagen"), _car("skoda", "Skoda"), _car("mg", "MG"),
	_car("chery", "Chery"), _car("geely", "Geely"), _car("byd", "BYD"), _car("jetour", "Jetour"),
	_car("haval", "Haval"), _car("mitsubishi", "Mitsubishi"), _car("honda", "Honda"), _car("mazda", "Mazda"),
	_car("suzuki", "Suzuki"), _car("subaru", "Subaru"), _car("ford", "Ford"), _car("jeep", "Jeep"),
	_car("dodge", "Dodge"), _car("ram", "RAM"), _car("bmw", "BMW"), _car("mercedes", "Mercedes-Benz"),
	_car("audi", "Audi"), _car("porsche", "Porsche"), _car("volvo", "Volvo"), _car("lexus", "Lexus"),
	_car("jaguar", "Jaguar"), _car("landrover", "Land Rover"), _car("tesla", "Tesla"), _car("maserati", "Maserati"),
	_car("ferrari", "Ferrari"), _car("lamborghini", "Lamborghini"), _car("bentley", "Bentley"),
	_car("rollsroyce", "Rolls-Royce"), _car("astonmartin", "Aston Martin"), _car("mclaren", "McLaren"),
	_car("genesis", "Genesis"), _car("cupra", "Cupra"), {"id": "car-other", "name": "أخرى", "category_ids": ["cars"]},

	# ---- دراجات نارية ----
	_bike("honda", "Honda"), _bike("yamaha", "Yamaha"), _bike("bajaj", "Bajaj"), _bike("vespa", "Vespa"),
	_bike("ktm", "KTM"), _bike("kawasaki", "Kawasaki"), _bike("other", "أخرى"),

	# ---- موبايلات ----
	{"id": "phone-apple", "name": "Apple", "category_ids": ["mobiles", "tablets", "laptops"]},
	_phone("samsung", "Samsung"), _phone("xiaomi", "Xiaomi"), _phone("redmi", "Redmi"), _phone("poco", "Poco"),
	_phone("oppo", "Oppo"), _phone("realme", "Realme"), _phone("oneplus", "OnePlus"), _phone("huawei", "Huawei"),
	_phone("honor", "Honor"), _phone("vivo", "Vivo"), _phone("infinix", "Infinix"), _phone("tecno", "Tecno"),
	_phone("nokia", "Nokia"), _phone("motorola", "Motorola"), _phone("sony", "Sony"), _phone("googlepixel", "Google Pixel"),
	_phone("asus", "Asus"), _phone("zte", "ZTE"), _phone("nothing", "Nothing"), _phone("lenovo", "Lenovo"),
	{"id": "phone-other", "name": "أخرى", "category_ids": ["mobiles"]},

	# ---- لابتوب (Apple فوق بتشمل اللابتوبات كمان) ----
	_laptop("dell", "Dell"), _laptop("hp", "HP"), _laptop("lenovo", "Lenovo"), _laptop("asus", "Asus"),
	_laptop("acer", "Acer"), _laptop("msi", "MSI"), _laptop("microsoft", "Microsoft"), _laptop("huawei", "Huawei"),
	_laptop("samsung", "Samsung"), _laptop("razer", "Razer"), _laptop("gigabyte", "Gigabyte"),
	{"id": "laptop-other", "name": "أخرى", "category_ids": ["laptops"]},

	# ---- تلفزيونات / أجهزة منزلية ----
	_appliance("samsung-tv", "Samsung", ["tvs"]),
	_appliance("lg", "LG", ["tvs", "ac", "refrigerators", "washing_machines"]),
	_appliance("sony-tv", "Sony", ["tvs"]), _appliance("tcl", "TCL", ["tvs"]), _appliance("hisense", "Hisense", ["tvs"]),
	_appliance("philips", "Philips", ["tvs"]),
	_appliance("sharp", "Sharp", ["ac", "refrigerators"]), _appliance("carrier", "Carrier", ["ac"]),
	_appliance("fresh", "Fresh", ["ac", "refrigerators", "washing_machines"]),
	_appliance("toshiba", "Toshiba", ["refrigerators", "washing_machines"]),
	_appliance("bosch", "Bosch", ["washing_machines"]), _appliance("miele", "Miele", ["washing_machines"]),
]
