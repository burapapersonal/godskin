// Common foods, all per 100 g (or 100 ml for drinks); `pc` lets the user log in pieces instead.
// Values per `per` units of `unit`. Approximate figures from standard food tables
// (USDA / Thai food composition); cooked dishes vary with oil, so treat them as estimates.
// k = kcal, p/c/f = protein/carb/fat grams, na = sodium mg where a label or table gives it.
// g = variant group (foods sharing one switch between their forms), vn = the variant's short label,
// a = extra search words (English, spelling variants).

export const CATS = [
  ["carb", "ข้าว แป้ง เส้น"],
  ["meat", "เนื้อสัตว์ ทะเล"],
  ["egg", "ไข่ นม เวย์"],
  ["dish", "จานเดียว"],
  ["ready", "เซเว่น สำเร็จรูป"],
  ["veg", "ผัก"],
  ["fruit", "ผลไม้"],
  ["snack", "ขนม ถั่ว"],
  ["drink", "เครื่องดื่ม"],
  ["fat", "น้ำมัน เครื่องปรุง"],
];

const cat = (c, list) => list.map((f) => ({ ...f, cat: c }));

export const FOODS = [
  ...cat("carb", [
    { id: "rice", g: "rice", vn: "ข้าวขาว", n: "ข้าวสวย (สุก)", a: "rice white", unit: "g", per: 100, def: 150, pc: ["ถ้วย", 150], k: 130, p: 2.7, c: 28, f: 0.3 },
    { id: "rice_brown", g: "rice", vn: "ข้าวกล้อง", n: "ข้าวกล้อง (สุก)", a: "brown rice", unit: "g", per: 100, def: 150, pc: ["ถ้วย", 150], k: 123, p: 2.7, c: 26, f: 1 },
    { id: "riceberry", g: "rice", vn: "ไรซ์เบอร์รี่", n: "ข้าวไรซ์เบอร์รี่ (สุก)", a: "riceberry", unit: "g", per: 100, def: 150, pc: ["ถ้วย", 150], k: 130, p: 3, c: 27, f: 1 },
    { id: "sticky_rice", g: "rice", vn: "ข้าวเหนียว", n: "ข้าวเหนียวนึ่ง", a: "sticky rice", unit: "g", per: 100, def: 150, pc: ["ห่อ", 100], k: 230, p: 4.5, c: 51, f: 0.4 },
    { id: "tom_southern", n: "ต้ม / ข้าวเหนียวนึ่งกะทิ ปักษ์ใต้ (ค่าประมาณ)", unit: "g", per: 100, def: 100, pc: ["ห่อ", 100], k: 260, p: 4, c: 45, f: 7 },
    { id: "oats", n: "ข้าวโอ๊ต (แห้ง)", a: "oat oatmeal", unit: "g", per: 100, def: 50, k: 380, p: 13, c: 66, f: 7 },
    { id: "cornflakes", n: "คอร์นเฟลกส์", a: "cereal cornflakes", unit: "g", per: 100, def: 30, k: 357, p: 7.5, c: 84, f: 0.4, na: 700 },
    { id: "granola", n: "กราโนล่า (ประมาณ)", a: "granola", unit: "g", per: 100, def: 45, k: 470, p: 10, c: 64, f: 20 },
    { id: "bread", g: "bread", vn: "ขาว", n: "ขนมปังขาว", a: "bread white", unit: "g", per: 100, def: 56, pc: ["แผ่น", 28], k: 265, p: 9, c: 49, f: 3.2 },
    // Whole-wheat sandwich loaf label: 2 slices (50 g) = 140 kcal, F2, P4, C25, fibre 2, Na210.
    { id: "bread_ww", g: "bread", vn: "โฮลวีท", n: "ขนมปังโฮลวีท (ฉลาก)", a: "bread whole wheat", unit: "g", per: 100, def: 50, pc: ["แผ่น", 25], k: 280, p: 8, c: 50, f: 4, na: 420 },
    // Mission label (Thai import, 360 g pack of 6): per 100 g 300 kcal, P8 C50 F7, sodium 940 mg.
    { id: "mission_wrap", n: "แป้งแรป Mission Original", a: "wrap tortilla", unit: "g", per: 100, def: 120, pc: ["แผ่น", 60], k: 300, p: 8, c: 50, f: 7, na: 940 },
    { id: "noodle_small", g: "noodle", vn: "เส้นเล็ก", n: "เส้นเล็ก/เส้นใหญ่ (ลวก)", a: "rice noodle", unit: "g", per: 100, def: 150, k: 109, p: 1.8, c: 25, f: 0.2 },
    { id: "egg_noodle", g: "noodle", vn: "บะหมี่", n: "บะหมี่เหลือง (ลวก)", a: "egg noodle", unit: "g", per: 100, def: 130, pc: ["ก้อน", 130], k: 138, p: 4.5, c: 25, f: 2 },
    { id: "glass_noodle", g: "noodle", vn: "วุ้นเส้น", n: "วุ้นเส้น (ลวก)", a: "glass noodle", unit: "g", per: 100, def: 100, k: 85, p: 0.1, c: 21, f: 0 },
    { id: "khanom_jeen", g: "noodle", vn: "ขนมจีน", n: "เส้นขนมจีน", a: "khanom jeen", unit: "g", per: 100, def: 150, k: 110, p: 1.8, c: 25, f: 0.1 },
    { id: "pasta", g: "noodle", vn: "พาสต้า", n: "พาสต้า/สปาเกตตี (สุก)", a: "pasta spaghetti", unit: "g", per: 100, def: 200, k: 158, p: 5.8, c: 31, f: 0.9 },
    { id: "sweet_potato", g: "tuber", vn: "มันหวาน", n: "มันหวาน (ต้ม)", a: "sweet potato", unit: "g", per: 100, def: 150, k: 86, p: 1.6, c: 20, f: 0.1 },
    { id: "potato", g: "tuber", vn: "มันฝรั่ง", n: "มันฝรั่ง (ต้ม/อบ)", a: "potato", unit: "g", per: 100, def: 150, pc: ["หัว", 150], k: 87, p: 1.9, c: 20, f: 0.1 },
    { id: "corn", g: "tuber", vn: "ข้าวโพด", n: "ข้าวโพดหวาน (ต้ม)", a: "corn", unit: "g", per: 100, def: 100, pc: ["ฝัก", 100], k: 96, p: 3.4, c: 21, f: 1.5 },
  ]),
  ...cat("meat", [
    { id: "chicken_breast", g: "chicken", vn: "อก ดิบ", n: "อกไก่ (น้ำหนักดิบ)", a: "chicken breast raw", unit: "g", per: 100, def: 200, k: 120, p: 22.5, c: 0, f: 2.6 },
    { id: "chicken_breast_ck", g: "chicken", vn: "อก สุก", n: "อกไก่ (น้ำหนักสุก ต้ม/ย่าง)", a: "chicken breast cooked", unit: "g", per: 100, def: 150, k: 165, p: 31, c: 0, f: 3.6, na: 74 },
    { id: "chicken_thigh", g: "chicken", vn: "สะโพก ไม่มีหนัง", n: "สะโพกไก่ไม่มีหนัง (ดิบ)", a: "chicken thigh skinless", unit: "g", per: 100, def: 200, k: 120, p: 19.7, c: 0, f: 4.1 },
    { id: "chicken_thigh_skin", g: "chicken", vn: "สะโพก มีหนัง", n: "สะโพกไก่มีหนัง (ดิบ)", a: "chicken thigh skin", unit: "g", per: 100, def: 200, k: 221, p: 16.5, c: 0, f: 16.6 },
    // CP tender chicken breast, 90 g pack: plain 80 kcal P17 C2 F0.5; flavoured packs run ~90 kcal.
    { id: "seven_chicken", g: "chicken", vn: "อกนุ่ม เซเว่น", n: "อกไก่นุ่ม ซีพี เซเว่น", a: "chicken 7-eleven cp", unit: "g", per: 100, def: 90, pc: ["ซอง", 90], k: 94, p: 18.9, c: 2.8, f: 0.9, na: 389 },
    { id: "pork_loin", g: "pork", vn: "สันนอก", n: "หมูสันนอก (น้ำหนักดิบ)", a: "pork loin", unit: "g", per: 100, def: 200, k: 143, p: 21.4, c: 0, f: 5.7 },
    { id: "pork_tenderloin", g: "pork", vn: "สันใน", n: "หมูสันใน (น้ำหนักดิบ)", a: "pork tenderloin", unit: "g", per: 100, def: 200, k: 120, p: 21, c: 0, f: 3.5 },
    { id: "pork_mince", g: "pork", vn: "บดไม่ติดมัน", n: "หมูบดไม่ติดมัน (น้ำหนักดิบ)", a: "pork mince lean", unit: "g", per: 100, def: 200, k: 160, p: 20, c: 0, f: 8.5 },
    { id: "pork_mince_fat", g: "pork", vn: "บดติดมัน", n: "หมูบดติดมัน (น้ำหนักดิบ)", a: "pork mince", unit: "g", per: 100, def: 150, k: 263, p: 16.9, c: 0, f: 21.2, na: 56 },
    { id: "pork_neck", g: "pork", vn: "สันคอ", n: "หมูสันคอ (น้ำหนักดิบ)", a: "pork neck collar", unit: "g", per: 100, def: 150, k: 250, p: 16, c: 0, f: 21 },
    { id: "pork_belly", g: "pork", vn: "สามชั้น", n: "หมูสามชั้น (น้ำหนักดิบ)", a: "pork belly", unit: "g", per: 100, def: 100, k: 518, p: 9.3, c: 0, f: 53 },
    // Thai crispy pork belly (cooked weight); fat varies a lot by cut, estimate.
    { id: "moo_krob", g: "pork", vn: "หมูกรอบ", n: "หมูกรอบ (น้ำหนักสุก, ประมาณ)", a: "crispy pork", unit: "g", per: 100, def: 100, k: 520, p: 20, c: 1, f: 48, na: 700 },
    { id: "beef_lean", g: "beef", vn: "ไม่ติดมัน", n: "เนื้อวัวไม่ติดมัน (น้ำหนักดิบ)", a: "beef lean", unit: "g", per: 100, def: 150, k: 140, p: 21.5, c: 0, f: 5.5 },
    { id: "beef_mince", g: "beef", vn: "บด", n: "เนื้อวัวบด 80/20 (น้ำหนักดิบ)", a: "beef mince ground", unit: "g", per: 100, def: 150, k: 254, p: 17.2, c: 0, f: 20 },
    { id: "beef_belly", g: "beef", vn: "สามชั้น", n: "เนื้อวัวสามชั้น / belly cut (น้ำหนักดิบ)", a: "beef belly", unit: "g", per: 100, def: 100, k: 330, p: 15, c: 0, f: 30 },
    { id: "shrimp_boiled", g: "sea", vn: "กุ้ง", n: "กุ้งต้ม (เนื้อล้วน แกะเปลือก)", a: "shrimp prawn", unit: "g", per: 100, def: 100, k: 99, p: 24, c: 0.2, f: 0.3, na: 111 },
    { id: "squid", g: "sea", vn: "ปลาหมึก", n: "ปลาหมึก (ดิบ)", a: "squid", unit: "g", per: 100, def: 150, k: 92, p: 15.6, c: 3.1, f: 1.4, na: 44 },
    { id: "salmon", g: "sea", vn: "แซลมอน", n: "แซลมอน (ดิบ)", a: "salmon", unit: "g", per: 100, def: 150, k: 208, p: 20, c: 0, f: 13, na: 59 },
    { id: "tilapia", g: "sea", vn: "ปลานิล", n: "ปลานิล/ปลาเนื้อขาว (ดิบ)", a: "tilapia fish", unit: "g", per: 100, def: 150, k: 96, p: 20, c: 0, f: 1.7, na: 52 },
    { id: "pla_too", g: "sea", vn: "ปลาทู", n: "ปลาทูนึ่ง (เนื้อ)", a: "mackerel", unit: "g", per: 100, def: 60, pc: ["ตัว", 60], k: 160, p: 21, c: 0, f: 8, na: 600 },
    { id: "tuna_can", g: "sea", vn: "ทูน่ากระป๋อง", n: "ทูน่ากระป๋องในน้ำแร่ (สะเด็ดน้ำ)", a: "tuna can", unit: "g", per: 100, def: 120, pc: ["กระป๋อง", 120], k: 116, p: 25.5, c: 0, f: 0.8, na: 340 },
    { id: "meatball", g: "proc", vn: "ลูกชิ้น", n: "ลูกชิ้นหมู/ไก่ (ประมาณ)", a: "meatball", unit: "g", per: 100, def: 100, pc: ["ลูก", 10], k: 150, p: 11, c: 10, f: 8, na: 900 },
    { id: "sausage", g: "proc", vn: "ไส้กรอก", n: "ไส้กรอกไก่/หมู (ประมาณ)", a: "sausage hotdog", unit: "g", per: 100, def: 60, pc: ["ชิ้น", 30], k: 250, p: 11, c: 8, f: 19, na: 900 },
    { id: "moo_yor", g: "proc", vn: "หมูยอ", n: "หมูยอ (ประมาณ)", a: "pork roll", unit: "g", per: 100, def: 100, k: 210, p: 15, c: 5, f: 14, na: 900 },
    { id: "tofu_firm", g: "tofu", vn: "แข็ง", n: "เต้าหู้แข็ง", a: "tofu firm", unit: "g", per: 100, def: 150, k: 144, p: 15.8, c: 2.8, f: 8.7, na: 14 },
    { id: "tofu_egg", g: "tofu", vn: "ไข่", n: "เต้าหู้ไข่", a: "egg tofu", unit: "g", per: 100, def: 120, pc: ["หลอด", 120], k: 70, p: 6, c: 3, f: 4, na: 300 },
  ]),
  ...cat("egg", [
    { id: "egg", g: "egg", vn: "ต้ม", n: "ไข่ไก่ ต้ม/ดิบ", a: "egg boiled", unit: "g", per: 100, def: 110, pc: ["ฟอง", 55], k: 143, p: 12.6, c: 0.7, f: 9.5 },
    { id: "omelette", g: "egg", vn: "เจียว", n: "ไข่เจียว รวมน้ำมันที่อม", a: "omelette omelet", unit: "g", per: 100, def: 165, pc: ["ฟอง", 55], k: 209, p: 11.5, c: 0.9, f: 17.3 },
    { id: "fried_egg", g: "egg", vn: "ดาว", n: "ไข่ดาว", a: "fried egg", unit: "g", per: 100, def: 55, pc: ["ฟอง", 55], k: 182, p: 11.5, c: 0.7, f: 14.5 },
    { id: "egg_white", g: "egg", vn: "ไข่ขาว", n: "ไข่ขาว", a: "egg white", unit: "g", per: 100, def: 99, pc: ["ฟอง", 33], k: 52, p: 10.9, c: 0.7, f: 0.2, na: 166 },
    { id: "whey", n: "เวย์โปรตีน", a: "whey protein", unit: "g", per: 100, def: 30, pc: ["สกู๊ป", 30], k: 400, p: 80, c: 10, f: 5 },
    { id: "milk", g: "milk", vn: "จืด", n: "นมจืด", a: "milk", unit: "ml", per: 100, def: 200, pc: ["กล่อง", 200], k: 65, p: 3.2, c: 4.8, f: 3.7 },
    { id: "milk_lowfat", g: "milk", vn: "พร่องมันเนย", n: "นมพร่องมันเนย", a: "milk low fat", unit: "ml", per: 100, def: 200, pc: ["กล่อง", 200], k: 42, p: 3.4, c: 5, f: 1 },
    { id: "milk_choc", g: "milk", vn: "ช็อกโกแลต", n: "นมช็อกโกแลต (ประมาณ)", a: "chocolate milk", unit: "ml", per: 100, def: 200, pc: ["กล่อง", 200], k: 85, p: 3, c: 12, f: 2.5 },
    { id: "soymilk", g: "milk", vn: "ถั่วเหลือง", n: "นมถั่วเหลือง หวานน้อย", a: "soy milk", unit: "ml", per: 100, def: 250, pc: ["กล่อง", 250], k: 45, p: 3.3, c: 4, f: 2 },
    // Vitamilk high-protein soy milk, label per 250 ml (half box): 120 kcal, P15 C7 F4, sodium 110 mg.
    { id: "vitamilk_hp", g: "milk", vn: "ไวตามิ้ลค์ โปรตีนสูง", n: "นมถั่วเหลืองไวตามิ้ลค์ โปรตีนสูง ชาไต้หวันบราวน์ชูการ์", a: "vitamilk soy", unit: "ml", per: 100, def: 250, pc: ["กล่อง", 500], k: 48, p: 6, c: 2.8, f: 1.6, na: 44 },
    { id: "greek_cheesebaron", g: "yogurt", vn: "กรีก Cheese Baron", n: "กรีกโยเกิร์ต The Cheese Baron รสธรรมชาติ", a: "greek yogurt", unit: "g", per: 100, def: 100, pc: ["ถ้วย", 100], k: 160, p: 9, c: 5, f: 11 },
    { id: "yogurt", g: "yogurt", vn: "ธรรมดา", n: "โยเกิร์ตรสธรรมชาติ", a: "yogurt plain", unit: "g", per: 100, def: 135, pc: ["ถ้วย", 135], k: 61, p: 3.5, c: 4.7, f: 3.3 },
    { id: "cheese_slice", n: "ชีสแผ่น", a: "cheese slice", unit: "g", per: 100, def: 20, pc: ["แผ่น", 20], k: 300, p: 18, c: 7, f: 22, na: 1200 },
  ]),
  ...cat("dish", [
    { id: "krapao", n: "ข้าวกะเพราหมูสับ + ไข่ดาว", a: "krapao basil", unit: "g", per: 100, def: 400, pc: ["จาน", 400], k: 163, p: 7.5, c: 17.5, f: 7 },
    { id: "chicken_rice", g: "kmk", vn: "ไก่ต้ม", n: "ข้าวมันไก่", a: "chicken rice", unit: "g", per: 100, def: 350, pc: ["จาน", 350], k: 171, p: 8, c: 21.4, f: 6 },
    { id: "kmk_tod", g: "kmk", vn: "ไก่ทอด", n: "ข้าวมันไก่ทอด", a: "fried chicken rice", unit: "g", per: 100, def: 300, pc: ["จาน", 300], k: 230, p: 9, c: 24, f: 11 },
    { id: "fried_rice", n: "ข้าวผัดหมู/ไก่", a: "fried rice", unit: "g", per: 100, def: 350, pc: ["จาน", 350], k: 166, p: 6, c: 22, f: 6, na: 400 },
    { id: "kai_jiao_rice", n: "ข้าวไข่เจียว (2 ฟอง)", a: "omelette rice", unit: "g", per: 100, def: 350, pc: ["จาน", 350], k: 185, p: 6.5, c: 17, f: 10 },
    { id: "khao_kha_moo", n: "ข้าวขาหมู", a: "pork leg rice", unit: "g", per: 100, def: 350, pc: ["จาน", 350], k: 197, p: 8.5, c: 20, f: 9, na: 450 },
    { id: "khao_moo_daeng", n: "ข้าวหมูแดง", a: "red pork rice", unit: "g", per: 100, def: 320, pc: ["จาน", 320], k: 169, p: 8, c: 22, f: 5.5, na: 400 },
    { id: "khao_mok_gai", n: "ข้าวหมกไก่", a: "chicken biryani", unit: "g", per: 100, def: 350, pc: ["จาน", 350], k: 170, p: 8, c: 20, f: 6 },
    { id: "pad_thai", g: "stirnoodle", vn: "ผัดไทย", n: "ผัดไทยกุ้ง", a: "pad thai", unit: "g", per: 100, def: 300, pc: ["จาน", 300], k: 190, p: 7, c: 26, f: 6.5, na: 500 },
    { id: "pad_see_ew", g: "stirnoodle", vn: "ผัดซีอิ๊ว", n: "ผัดซีอิ๊วหมู", a: "pad see ew", unit: "g", per: 100, def: 300, pc: ["จาน", 300], k: 175, p: 6.5, c: 24, f: 6, na: 600 },
    { id: "rad_na", g: "stirnoodle", vn: "ราดหน้า", n: "ราดหน้าหมู", a: "rad na", unit: "g", per: 100, def: 400, pc: ["จาน", 400], k: 100, p: 4.5, c: 14, f: 3, na: 450 },
    { id: "noodle_soup", g: "soup", vn: "ก๋วยเตี๋ยวน้ำ", n: "ก๋วยเตี๋ยวน้ำ หมู/ไก่", a: "noodle soup", unit: "g", per: 100, def: 450, pc: ["ชาม", 450], k: 78, p: 4, c: 10, f: 2.3, na: 350 },
    { id: "khao_tom", g: "soup", vn: "ข้าวต้ม", n: "ข้าวต้มหมู", a: "rice soup", unit: "g", per: 100, def: 400, pc: ["ชาม", 400], k: 70, p: 3.5, c: 10, f: 1.5, na: 300 },
    { id: "jok", g: "soup", vn: "โจ๊ก", n: "โจ๊กหมูใส่ไข่", a: "congee jok", unit: "g", per: 100, def: 400, pc: ["ชาม", 400], k: 80, p: 4, c: 10, f: 2.5, na: 300 },
    { id: "suki", g: "soup", vn: "สุกี้น้ำ", n: "สุกี้น้ำ", a: "suki", unit: "g", per: 100, def: 450, pc: ["ชาม", 450], k: 67, p: 5, c: 7, f: 2, na: 400 },
    { id: "tom_yum", g: "soup", vn: "ต้มยำ", n: "ต้มยำกุ้ง น้ำใส (ไม่รวมข้าว)", a: "tom yum", unit: "g", per: 100, def: 350, pc: ["ชาม", 350], k: 45, p: 5, c: 3, f: 1.5, na: 500 },
    { id: "green_curry", n: "แกงเขียวหวานไก่ (ไม่รวมข้าว)", a: "green curry", unit: "g", per: 100, def: 250, pc: ["ถ้วย", 250], k: 120, p: 7, c: 3, f: 9, na: 450 },
    { id: "som_tam", n: "ส้มตำไทย", a: "papaya salad somtam", unit: "g", per: 100, def: 200, pc: ["จาน", 200], k: 50, p: 1.5, c: 10, f: 0.5, na: 900 },
    { id: "larb", n: "ลาบหมู", a: "larb laab", unit: "g", per: 100, def: 200, pc: ["จาน", 200], k: 150, p: 16, c: 3, f: 8, na: 600 },
    { id: "gai_yang", n: "ไก่ย่าง (มีหนัง, สุก)", a: "grilled chicken", unit: "g", per: 100, def: 150, pc: ["ชิ้น", 150], k: 215, p: 25, c: 1, f: 12, na: 400 },
    { id: "gai_tod", n: "ไก่ทอด (ชุบแป้ง)", a: "fried chicken", unit: "g", per: 100, def: 100, pc: ["ชิ้น", 100], k: 280, p: 20, c: 10, f: 18, na: 500 },
    { id: "moo_ping", n: "หมูปิ้ง", a: "grilled pork skewer", unit: "g", per: 100, def: 90, pc: ["ไม้", 30], k: 260, p: 18, c: 12, f: 15, na: 600 },
  ]),
  ...cat("ready", [
    // Shumai from the CP bag label (120 g): 300 kcal, P9 C21 F20, sodium 900 mg.
    { id: "seven_shumai", n: "ขนมจีบ เซเว่น", a: "shumai 7-eleven", unit: "g", per: 100, def: 120, pc: ["ถุง", 120], k: 250, p: 7.5, c: 17.5, f: 16.7, na: 750 },
    // No label yet; estimated from typical minced pork rolls (~25 g a piece).
    { id: "seven_seaweed_pork", n: "หมูห่อสาหร่าย เซเว่น (ค่าประมาณ)", a: "seaweed pork 7-eleven", unit: "g", per: 100, def: 125, pc: ["ชิ้น", 25], k: 200, p: 14, c: 8, f: 12 },
    { id: "onigiri", n: "ข้าวปั้นโอนิกิริ ทูน่ามายองเนส (ประมาณ)", a: "onigiri rice ball", unit: "g", per: 100, def: 100, pc: ["ชิ้น", 100], k: 180, p: 4.5, c: 33, f: 3.5, na: 450 },
    { id: "mama", g: "mama", vn: "ซองเล็ก 60 g", n: "มาม่า รวมเครื่องปรุง", a: "mama instant noodle", unit: "g", per: 100, def: 60, pc: ["ซอง", 60], k: 467, p: 10, c: 63.3, f: 18.3, na: 2500 },
    // Mama OK orange pack label: 85 g = 390 kcal, F16, P7, C55, Na1910.
    { id: "mama_tomyum", g: "mama", vn: "OK ซองส้ม 85 g", n: "มาม่า OK ซองส้ม 85 g (ฉลาก)", a: "mama ok instant noodle", unit: "g", per: 100, def: 85, pc: ["ซอง", 85], k: 459, p: 8.2, c: 64.7, f: 18.8, na: 2247 },
  ]),
  ...cat("veg", [
    { id: "broccoli", n: "บร็อคโคลี่ (ดิบ/ลวก)", a: "broccoli", unit: "g", per: 100, def: 100, k: 34, p: 2.8, c: 6.6, f: 0.4, na: 33 },
    { id: "napa_cabbage", g: "cabbage", vn: "ผักกาดขาว", n: "ผักกาดขาว", a: "napa cabbage", unit: "g", per: 100, def: 100, k: 16, p: 1.2, c: 3.2, f: 0.2, na: 9 },
    { id: "cabbage", g: "cabbage", vn: "กะหล่ำปลี", n: "กะหล่ำปลี", a: "cabbage", unit: "g", per: 100, def: 100, k: 25, p: 1.3, c: 5.8, f: 0.1, na: 18 },
    { id: "lettuce", g: "cabbage", vn: "ผักกาดหอม", n: "ผักกาดหอม / ผักสลัด", a: "lettuce salad", unit: "g", per: 100, def: 50, k: 15, p: 1.4, c: 2.9, f: 0.2, na: 28 },
    { id: "kana", n: "คะน้า", a: "chinese kale", unit: "g", per: 100, def: 100, k: 22, p: 1.1, c: 3.8, f: 0.7, na: 7 },
    { id: "morning_glory", n: "ผักบุ้ง", a: "morning glory", unit: "g", per: 100, def: 100, k: 19, p: 2.6, c: 3.1, f: 0.2, na: 113 },
    { id: "long_bean", n: "ถั่วฝักยาว", a: "long bean", unit: "g", per: 100, def: 50, k: 47, p: 2.8, c: 8.4, f: 0.4, na: 4 },
    { id: "cucumber", n: "แตงกวา", a: "cucumber", unit: "g", per: 100, def: 100, pc: ["ลูก", 100], k: 15, p: 0.7, c: 3.6, f: 0.1, na: 2 },
    { id: "tomato", n: "มะเขือเทศ", a: "tomato", unit: "g", per: 100, def: 100, pc: ["ลูก", 100], k: 18, p: 0.9, c: 3.9, f: 0.2, na: 5 },
    { id: "carrot", n: "แครอท", a: "carrot", unit: "g", per: 100, def: 60, pc: ["หัว", 60], k: 41, p: 0.9, c: 9.6, f: 0.2, na: 69 },
    { id: "mushroom", n: "เห็ด (นางฟ้า/ฟาง/เข็มทอง)", a: "mushroom", unit: "g", per: 100, def: 100, k: 22, p: 3.1, c: 3.3, f: 0.3, na: 5 },
    { id: "onion", n: "หอมใหญ่", a: "onion", unit: "g", per: 100, def: 50, pc: ["หัว", 150], k: 40, p: 1.1, c: 9.3, f: 0.1, na: 4 },
    { id: "kimchi", n: "กิมจิผักกาด (เค็ม)", a: "kimchi", unit: "g", per: 100, def: 100, k: 20, p: 1.1, c: 3, f: 0.5, na: 500 },
  ]),
  ...cat("fruit", [
    { id: "banana", g: "banana", vn: "หอม", n: "กล้วยหอม", a: "banana", unit: "g", per: 100, def: 120, pc: ["ลูก", 120], k: 89, p: 1.1, c: 22.8, f: 0.3 },
    { id: "banana_namwa", g: "banana", vn: "น้ำว้า", n: "กล้วยน้ำว้า", a: "banana", unit: "g", per: 100, def: 60, pc: ["ลูก", 60], k: 115, p: 1.2, c: 27, f: 0.3 },
    { id: "apple", n: "แอปเปิล", a: "apple", unit: "g", per: 100, def: 180, pc: ["ลูก", 180], k: 52, p: 0.3, c: 14, f: 0.2 },
    { id: "orange", n: "ส้ม", a: "orange", unit: "g", per: 100, def: 130, pc: ["ลูก", 130], k: 47, p: 0.9, c: 12, f: 0.1 },
    { id: "mango", n: "มะม่วงสุก", a: "mango", unit: "g", per: 100, def: 200, pc: ["ลูก", 200], k: 60, p: 0.8, c: 15, f: 0.4 },
    { id: "papaya", n: "มะละกอสุก", a: "papaya", unit: "g", per: 100, def: 150, k: 43, p: 0.5, c: 11, f: 0.3 },
    { id: "pineapple", n: "สับปะรด", a: "pineapple", unit: "g", per: 100, def: 150, k: 50, p: 0.5, c: 13, f: 0.1 },
    { id: "watermelon", n: "แตงโม", a: "watermelon", unit: "g", per: 100, def: 200, k: 30, p: 0.6, c: 7.6, f: 0.2 },
    { id: "guava", n: "ฝรั่ง", a: "guava", unit: "g", per: 100, def: 150, pc: ["ลูก", 200], k: 68, p: 2.6, c: 14, f: 1 },
    { id: "dragon_fruit", n: "แก้วมังกร", a: "dragon fruit", unit: "g", per: 100, def: 150, k: 60, p: 1.2, c: 13, f: 0 },
    { id: "grapes", n: "องุ่น", a: "grapes", unit: "g", per: 100, def: 100, k: 69, p: 0.7, c: 18, f: 0.2 },
    { id: "durian", n: "ทุเรียน", a: "durian", unit: "g", per: 100, def: 100, pc: ["พู", 50], k: 147, p: 1.5, c: 27, f: 5.3 },
    { id: "avocado", n: "อะโวคาโด", a: "avocado", unit: "g", per: 100, def: 70, pc: ["ลูก", 140], k: 160, p: 2, c: 8.5, f: 14.7 },
  ]),
  ...cat("snack", [
    // Skippy Super Chunk label: 1 tbsp (15 g) = 100 kcal, F8, P3, C4, Na70.
    { id: "skippy", n: "เนยถั่ว Skippy ซุปเปอร์ชังค์ (ฉลาก)", a: "peanut butter", unit: "g", per: 100, def: 15, pc: ["ช้อนโต๊ะ", 15], k: 667, p: 20, c: 26.7, f: 53.3, na: 467 },
    { id: "almonds", g: "nuts", vn: "อัลมอนด์", n: "อัลมอนด์", a: "almond nuts", unit: "g", per: 100, def: 28, pc: ["กำมือ", 28], k: 579, p: 21, c: 22, f: 50 },
    { id: "cashew", g: "nuts", vn: "มะม่วงหิมพานต์", n: "เม็ดมะม่วงหิมพานต์", a: "cashew nuts", unit: "g", per: 100, def: 28, pc: ["กำมือ", 28], k: 553, p: 18, c: 30, f: 44 },
    { id: "peanuts", g: "nuts", vn: "ถั่วลิสง", n: "ถั่วลิสงอบ", a: "peanuts nuts", unit: "g", per: 100, def: 28, pc: ["กำมือ", 28], k: 585, p: 24, c: 21, f: 50 },
    { id: "dark_choc", n: "ดาร์กช็อกโกแลต 70%", a: "dark chocolate", unit: "g", per: 100, def: 20, pc: ["แถว", 10], k: 600, p: 7.8, c: 46, f: 43 },
    { id: "protein_bar", n: "โปรตีนบาร์ (ประมาณ)", a: "protein bar", unit: "g", per: 100, def: 60, pc: ["แท่ง", 60], k: 360, p: 33, c: 35, f: 12 },
    { id: "chips", n: "มันฝรั่งทอดกรอบ", a: "potato chips crisps lays", unit: "g", per: 100, def: 50, pc: ["ซอง", 50], k: 536, p: 7, c: 53, f: 35, na: 525 },
    // Calbee Bun Bun label per 31 g: 150 kcal, P5 C17 F7, sodium 160 mg; a bag is about 3 servings.
    { id: "bunbun", n: "คาลบี้ บันบัน", a: "calbee", unit: "g", per: 100, def: 31, pc: ["ซอง", 93], k: 484, p: 16.1, c: 54.8, f: 22.6, na: 516 },
  ]),
  ...cat("drink", [
    { id: "coffee_black", g: "coffee", vn: "ดำ", n: "กาแฟดำ/อเมริกาโน่ ไม่หวาน", a: "coffee americano black", unit: "ml", per: 100, def: 250, pc: ["แก้ว", 250], k: 2, p: 0.1, c: 0, f: 0 },
    { id: "latte", g: "coffee", vn: "ลาเต้เย็น", n: "ลาเต้เย็น (ร้านทั่วไป, ประมาณ)", a: "latte coffee", unit: "ml", per: 100, def: 450, pc: ["แก้ว", 450], k: 45, p: 2, c: 5, f: 1.8 },
    { id: "thai_tea", g: "coffee", vn: "ชาไทยเย็น", n: "ชาไทยเย็น (ประมาณ)", a: "thai tea", unit: "ml", per: 100, def: 450, pc: ["แก้ว", 450], k: 67, p: 1, c: 11, f: 2 },
    { id: "cola", g: "cola", vn: "ปกติ", n: "โค้ก/น้ำอัดลม", a: "coke cola soda", unit: "ml", per: 100, def: 325, pc: ["กระป๋อง", 325], k: 42, p: 0, c: 10.6, f: 0, na: 4 },
    { id: "cola_zero", g: "cola", vn: "ไม่มีน้ำตาล", n: "โค้กซีโร่/น้ำอัดลมไม่มีน้ำตาล", a: "coke zero diet", unit: "ml", per: 100, def: 325, pc: ["กระป๋อง", 325], k: 0, p: 0, c: 0, f: 0, na: 4 },
    { id: "orange_juice", n: "น้ำส้ม 100%", a: "orange juice", unit: "ml", per: 100, def: 250, pc: ["แก้ว", 250], k: 45, p: 0.7, c: 10.4, f: 0.2 },
    { id: "coconut_water", n: "น้ำมะพร้าว", a: "coconut water", unit: "ml", per: 100, def: 300, pc: ["ลูก", 300], k: 19, p: 0.7, c: 3.7, f: 0.2, na: 105 },
    { id: "isotonic", n: "เครื่องดื่มเกลือแร่", a: "isotonic sponsor gatorade", unit: "ml", per: 100, def: 500, pc: ["ขวด", 500], k: 25, p: 0, c: 6, f: 0, na: 45 },
    { id: "beer", n: "เบียร์", a: "beer", unit: "ml", per: 100, def: 330, pc: ["กระป๋อง", 330], k: 43, p: 0.5, c: 3.6, f: 0 },
  ]),
  ...cat("fat", [
    { id: "oil", g: "oil", vn: "พืช", n: "น้ำมันพืช", a: "vegetable oil", unit: "g", per: 100, def: 14, pc: ["ช้อนโต๊ะ", 14], k: 884, p: 0, c: 0, f: 100 },
    { id: "olive_oil", g: "oil", vn: "มะกอก", n: "น้ำมันมะกอก", a: "olive oil", unit: "g", per: 100, def: 14, pc: ["ช้อนโต๊ะ", 14], k: 884, p: 0, c: 0, f: 100 },
    { id: "sesame_oil", g: "oil", vn: "งา", n: "น้ำมันงา", a: "sesame oil", unit: "g", per: 100, def: 5, pc: ["ช้อนชา", 4.5], k: 884, p: 0, c: 0, f: 100 },
    { id: "butter", g: "oil", vn: "เนย", n: "เนยสด", a: "butter", unit: "g", per: 100, def: 10, pc: ["ช้อนชา", 5], k: 717, p: 0.9, c: 0.1, f: 81, na: 640 },
    { id: "coconut_milk", n: "กะทิ", a: "coconut milk", unit: "g", per: 100, def: 30, pc: ["ช้อนโต๊ะ", 15], k: 230, p: 2.3, c: 6, f: 24, na: 15 },
    // Heinz low-fat / light mayo: estimate from typical light-mayo labels, check the jar.
    { id: "heinz_mayo_lf", n: "มายองเนส ไฮนซ์ โลว์แฟต (ประมาณ)", a: "mayo mayonnaise heinz", unit: "g", per: 100, def: 15, pc: ["ช้อนโต๊ะ", 15], k: 300, p: 0.8, c: 8, f: 29, na: 800 },
    // Takumi shoyu: estimate from typical Japanese-style soy sauce, check the bottle.
    { id: "takumi_shoyu", g: "sauce", vn: "โชยุ", n: "ทาคูมิ โชยุ (ประมาณ)", a: "soy sauce shoyu", unit: "g", per: 100, def: 15, pc: ["ช้อนโต๊ะ", 16], k: 60, p: 6, c: 8, f: 0, na: 5700 },
    { id: "fish_sauce", g: "sauce", vn: "น้ำปลา", n: "น้ำปลา", a: "fish sauce", unit: "g", per: 100, def: 18, pc: ["ช้อนโต๊ะ", 18], k: 35, p: 5, c: 3.6, f: 0, na: 7700 },
    { id: "oyster_sauce", g: "sauce", vn: "ซอสหอยนางรม", n: "ซอสหอยนางรม", a: "oyster sauce", unit: "g", per: 100, def: 18, pc: ["ช้อนโต๊ะ", 18], k: 51, p: 1.4, c: 11, f: 0.3, na: 2700 },
    { id: "ketchup", g: "sauce", vn: "ซอสมะเขือเทศ", n: "ซอสมะเขือเทศ", a: "ketchup", unit: "g", per: 100, def: 17, pc: ["ช้อนโต๊ะ", 17], k: 112, p: 1.2, c: 26, f: 0.1, na: 900 },
    { id: "sriracha", g: "sauce", vn: "ซอสพริก", n: "ซอสพริก", a: "chilli sauce sriracha", unit: "g", per: 100, def: 15, pc: ["ช้อนโต๊ะ", 15], k: 93, p: 1.9, c: 19, f: 0.9, na: 2100 },
    // Homemade chilli paste, no label: estimated for an oil-based nam prik pao without sugar.
    { id: "namprik_pla", n: "พริกเผาปลาย่าง คุณเพ็ญศรี (ค่าประมาณ)", a: "chilli paste", unit: "g", per: 100, def: 15, pc: ["ช้อนโต๊ะ", 15], k: 320, p: 8, c: 14, f: 26, na: 1500 },
    { id: "honey", g: "sweet", vn: "น้ำผึ้ง", n: "น้ำผึ้ง", a: "honey", unit: "g", per: 100, def: 21, pc: ["ช้อนโต๊ะ", 21], k: 304, p: 0.3, c: 82.4, f: 0 },
    { id: "sugar", g: "sweet", vn: "น้ำตาล", n: "น้ำตาลทราย", a: "sugar", unit: "g", per: 100, def: 8, pc: ["ช้อนชา", 4], k: 400, p: 0, c: 100, f: 0 },
  ]),
];

export const foodById = (id) => FOODS.find((f) => f.id === id);

// Other forms of the same food (raw/cooked, boiled/fried...), including the food itself.
export const variantsOf = (food) => (food?.g ? FOODS.filter((f) => f.g === food.g) : []);

// Every space-separated word must appear in the name, variant label, search words or category.
// Names that start with the first word rank first, then names containing it, then the rest.
export function searchFoods(list, q) {
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  const catName = Object.fromEntries(CATS);
  const hay = (f) => `${f.n} ${f.vn || ""} ${f.a || ""} ${catName[f.cat] || ""}`.toLowerCase();
  const rank = (f) => { const n = f.n.toLowerCase(); return n.startsWith(words[0]) ? 0 : n.includes(words[0]) ? 1 : 2; };
  return list.filter((f) => words.every((w) => hay(f).includes(w)))
    .map((f, i) => [rank(f), i, f]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
}

// pc = [unit name, grams per unit] for foods that also come in pieces (ฟอง, ซอง, ถ้วย...).
// `qty` in "pc" mode counts pieces; this turns it into the food's base unit for `portion`.
export const baseQty = (food, qty, mode) => (mode === "pc" && food.pc ? qty * food.pc[1] : qty);

// Nutrients for `qty` units of a food, rounded for display and storage.
export function portion(food, qty) {
  const m = qty / food.per;
  const r1 = (x) => Math.round(x * m * 10) / 10;
  const out = { kcal: Math.round(food.k * m), p: r1(food.p), c: r1(food.c), f: r1(food.f) };
  if (food.na != null) out.na = Math.round(food.na * m);
  return out;
}
