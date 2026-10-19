// Common foods, all per 100 g (or 100 ml for drinks); `pc` lets the user log in pieces instead.
// Values per `per` units of `unit`. Approximate figures from standard food tables
// (USDA / Thai food composition); cooked dishes vary with oil, so treat them as estimates.
// k = kcal, p/c/f = protein/carb/fat grams, na = sodium mg where a label or table gives it.

export const FOODS = [
  { id: "rice", n: "ข้าวสวย (สุก)", unit: "g", per: 100, def: 150, pc: ["ถ้วย", 150], k: 130, p: 2.7, c: 28, f: 0.3 },
  { id: "sticky_rice", n: "ข้าวเหนียวนึ่ง", unit: "g", per: 100, def: 150, pc: ["ห่อ", 100], k: 230, p: 4.5, c: 51, f: 0.4 },
  { id: "tom_southern", n: "ต้ม / ข้าวเหนียวนึ่งกะทิ ปักษ์ใต้ (ค่าประมาณ)", unit: "g", per: 100, def: 100, pc: ["ห่อ", 100], k: 260, p: 4, c: 45, f: 7 },
  { id: "rice_brown", n: "ข้าวกล้อง (สุก)", unit: "g", per: 100, def: 150, pc: ["ถ้วย", 150], k: 123, p: 2.7, c: 26, f: 1 },
  { id: "oats", n: "ข้าวโอ๊ต (แห้ง)", unit: "g", per: 100, def: 50, k: 380, p: 13, c: 66, f: 7 },
  { id: "bread", n: "ขนมปังขาว", unit: "g", per: 100, def: 56, pc: ["แผ่น", 28], k: 265, p: 9, c: 49, f: 3.2 },
  // Mission label (Thai import, 360 g pack of 6): per 100 g 300 kcal, P8 C50 F7, sodium 940 mg.
  { id: "mission_wrap", n: "แป้งแรป Mission Original", unit: "g", per: 100, def: 120, pc: ["แผ่น", 60], k: 300, p: 8, c: 50, f: 7, na: 940 },
  { id: "sweet_potato", n: "มันหวาน (ต้ม)", unit: "g", per: 100, def: 150, k: 86, p: 1.6, c: 20, f: 0.1 },
  { id: "banana", n: "กล้วยหอม", unit: "g", per: 100, def: 120, pc: ["ลูก", 120], k: 89, p: 1.1, c: 22.8, f: 0.3 },
  { id: "honey", n: "น้ำผึ้ง", unit: "g", per: 100, def: 21, pc: ["ช้อนโต๊ะ", 21], k: 304, p: 0.3, c: 82.4, f: 0 },
  { id: "egg", n: "ไข่ไก่ ต้ม/ดิบ", unit: "g", per: 100, def: 110, pc: ["ฟอง", 55], k: 143, p: 12.6, c: 0.7, f: 9.5 },
  { id: "omelette", n: "ไข่เจียว รวมน้ำมันที่อม", unit: "g", per: 100, def: 165, pc: ["ฟอง", 55], k: 209, p: 11.5, c: 0.9, f: 17.3 },
  { id: "fried_egg", n: "ไข่ดาว", unit: "g", per: 100, def: 55, pc: ["ฟอง", 55], k: 182, p: 11.5, c: 0.7, f: 14.5 },
  { id: "pork_loin", n: "หมูสันนอก (น้ำหนักดิบ)", unit: "g", per: 100, def: 200, k: 143, p: 21.4, c: 0, f: 5.7 },
  { id: "pork_mince", n: "หมูบดไม่ติดมัน (น้ำหนักดิบ)", unit: "g", per: 100, def: 200, k: 160, p: 20, c: 0, f: 8.5 },
  { id: "chicken_breast", n: "อกไก่ (น้ำหนักดิบ)", unit: "g", per: 100, def: 200, k: 120, p: 22.5, c: 0, f: 2.6 },
  { id: "beef_belly", n: "เนื้อวัวสามชั้น / belly cut (น้ำหนักดิบ)", unit: "g", per: 100, def: 100, k: 330, p: 15, c: 0, f: 30 },
  { id: "pork_belly", n: "หมูสามชั้น (น้ำหนักดิบ)", unit: "g", per: 100, def: 100, k: 518, p: 9.3, c: 0, f: 53 },
  // CP tender chicken breast, 90 g pack: plain 80 kcal P17 C2 F0.5; flavoured packs run ~90 kcal.
  { id: "seven_chicken", n: "อกไก่นุ่ม ซีพี เซเว่น", unit: "g", per: 100, def: 90, pc: ["ซอง", 90], k: 94, p: 18.9, c: 2.8, f: 0.9, na: 389 },
  // Shumai from the CP bag label (120 g): 300 kcal, P9 C21 F20, sodium 900 mg.
  { id: "seven_shumai", n: "ขนมจีบ เซเว่น", unit: "g", per: 100, def: 120, pc: ["ถุง", 120], k: 250, p: 7.5, c: 17.5, f: 16.7, na: 750 },
  // No label yet; estimated from typical minced pork rolls (~25 g a piece).
  { id: "seven_seaweed_pork", n: "หมูห่อสาหร่าย เซเว่น (ค่าประมาณ)", unit: "g", per: 100, def: 125, pc: ["ชิ้น", 25], k: 200, p: 14, c: 8, f: 12 },
  { id: "kimchi", n: "กิมจิผักกาด (เค็ม)", unit: "g", per: 100, def: 100, k: 20, p: 1.1, c: 3, f: 0.5, na: 500 },
  { id: "greek_cheesebaron", n: "กรีกโยเกิร์ต The Cheese Baron รสธรรมชาติ", unit: "g", per: 100, def: 100, pc: ["ถ้วย", 100], k: 160, p: 9, c: 5, f: 11 },
  { id: "whey", n: "เวย์โปรตีน", unit: "g", per: 100, def: 30, pc: ["สกู๊ป", 30], k: 400, p: 80, c: 10, f: 5 },
  { id: "milk", n: "นมจืด", unit: "ml", per: 100, def: 200, pc: ["กล่อง", 200], k: 65, p: 3.2, c: 4.8, f: 3.7 },
  // Vitamilk high-protein soy milk, label per 250 ml (half box): 120 kcal, P15 C7 F4, sodium 110 mg.
  { id: "vitamilk_hp", n: "นมถั่วเหลืองไวตามิ้ลค์ โปรตีนสูง ชาไต้หวันบราวน์ชูการ์", unit: "ml", per: 100, def: 250, pc: ["กล่อง", 500], k: 48, p: 6, c: 2.8, f: 1.6, na: 44 },
  // Calbee Bun Bun label per 31 g: 150 kcal, P5 C17 F7, sodium 160 mg; a bag is about 3 servings.
  { id: "bunbun", n: "คาลบี้ บันบัน", unit: "g", per: 100, def: 31, pc: ["ซอง", 93], k: 484, p: 16.1, c: 54.8, f: 22.6, na: 516 },
  // Homemade chilli paste, no label: estimated for an oil-based nam prik pao without sugar.
  { id: "namprik_pla", n: "พริกเผาปลาย่าง คุณเพ็ญศรี (ค่าประมาณ)", unit: "g", per: 100, def: 15, pc: ["ช้อนโต๊ะ", 15], k: 320, p: 8, c: 14, f: 26, na: 1500 },
  { id: "mama", n: "มาม่า รวมเครื่องปรุง", unit: "g", per: 100, def: 60, pc: ["ซอง", 60], k: 467, p: 10, c: 63.3, f: 18.3, na: 2500 },
  { id: "oil", n: "น้ำมันพืช", unit: "g", per: 100, def: 14, pc: ["ช้อนโต๊ะ", 14], k: 884, p: 0, c: 0, f: 100 },
  { id: "krapao", n: "ข้าวกะเพราหมูสับ + ไข่ดาว", unit: "g", per: 100, def: 400, pc: ["จาน", 400], k: 163, p: 7.5, c: 17.5, f: 7 },
  { id: "chicken_rice", n: "ข้าวมันไก่", unit: "g", per: 100, def: 350, pc: ["จาน", 350], k: 171, p: 8, c: 21.4, f: 6 },
];

export const foodById = (id) => FOODS.find((f) => f.id === id);

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
