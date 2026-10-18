// Common foods, values per `per` units of `unit`. Approximate figures from standard food tables
// (USDA / Thai food composition); cooked dishes vary with oil, so treat them as estimates.
// k = kcal, p/c/f = protein/carb/fat grams.

export const FOODS = [
  { id: "rice", n: "ข้าวสวย (สุก)", unit: "g", per: 100, def: 150, k: 130, p: 2.7, c: 28, f: 0.3 },
  { id: "rice_bowl", n: "ข้าวสวย ถ้วย (~150 g)", unit: "ถ้วย", per: 1, def: 2, k: 195, p: 4, c: 42, f: 0.5 },
  { id: "sticky_rice", n: "ข้าวเหนียวนึ่ง", unit: "g", per: 100, def: 150, k: 230, p: 4.5, c: 51, f: 0.4 },
  { id: "rice_brown", n: "ข้าวกล้อง (สุก)", unit: "g", per: 100, def: 150, k: 123, p: 2.7, c: 26, f: 1 },
  { id: "egg", n: "ไข่ไก่ ต้ม/ดิบ", unit: "ฟอง", per: 1, def: 2, k: 72, p: 6.3, c: 0.4, f: 4.8 },
  { id: "omelette", n: "ไข่เจียว (รวมน้ำมันที่อม)", unit: "ฟอง", per: 1, def: 3, k: 115, p: 6.3, c: 0.5, f: 9.5 },
  { id: "fried_egg", n: "ไข่ดาว", unit: "ฟอง", per: 1, def: 1, k: 100, p: 6.3, c: 0.4, f: 8 },
  { id: "pork_loin", n: "หมูสันนอก (น้ำหนักดิบ)", unit: "g", per: 100, def: 200, k: 143, p: 21.4, c: 0, f: 5.7 },
  { id: "pork_mince", n: "หมูบดไม่ติดมัน (น้ำหนักดิบ)", unit: "g", per: 100, def: 200, k: 160, p: 20, c: 0, f: 8.5 },
  { id: "chicken_breast", n: "อกไก่ (น้ำหนักดิบ)", unit: "g", per: 100, def: 200, k: 120, p: 22.5, c: 0, f: 2.6 },
  { id: "beef_belly", n: "เนื้อวัวสามชั้น / belly cut (น้ำหนักดิบ)", unit: "g", per: 100, def: 100, k: 330, p: 15, c: 0, f: 30 },
  { id: "pork_belly", n: "หมูสามชั้น (น้ำหนักดิบ)", unit: "g", per: 100, def: 100, k: 518, p: 9.3, c: 0, f: 53 },
  { id: "kimchi", n: "กิมจิผักกาด (เค็ม: โซเดียม ~500 mg/100 g)", unit: "g", per: 100, def: 100, k: 20, p: 1.1, c: 3, f: 0.5 },
  { id: "mama", n: "มาม่า 1 ซอง (รวมเครื่องปรุง)", unit: "ซอง", per: 1, def: 1, k: 280, p: 6, c: 38, f: 11 },
  { id: "banana", n: "กล้วยหอม", unit: "ลูก", per: 1, def: 1, k: 105, p: 1.3, c: 27, f: 0.4 },
  { id: "oats", n: "ข้าวโอ๊ต (แห้ง)", unit: "g", per: 100, def: 50, k: 380, p: 13, c: 66, f: 7 },
  { id: "bread", n: "ขนมปังขาว", unit: "แผ่น", per: 1, def: 2, k: 75, p: 2.5, c: 14, f: 1 },
  // Mission label (Thai import, 360 g pack of 6): per 100 g 300 kcal, P8 C50 F7, sodium 940 mg.
  { id: "mission_wrap", n: "แป้งแรป Mission Original (แผ่นละ ~60 g)", unit: "แผ่น", per: 1, def: 2, k: 180, p: 4.8, c: 30, f: 4.2 },
  { id: "sweet_potato", n: "มันหวาน (ต้ม)", unit: "g", per: 100, def: 150, k: 86, p: 1.6, c: 20, f: 0.1 },
  { id: "milk", n: "นมจืด 200 ml", unit: "กล่อง", per: 1, def: 1, k: 130, p: 6.4, c: 9.6, f: 7.4 },
  { id: "greek_cheesebaron", n: "กรีกโยเกิร์ต The Cheese Baron รสธรรมชาติ", unit: "g", per: 100, def: 100, k: 160, p: 9, c: 5, f: 11 },
  { id: "whey", n: "เวย์โปรตีน 1 สกู๊ป (30 g)", unit: "สกู๊ป", per: 1, def: 1, k: 120, p: 24, c: 3, f: 1.5 },
  { id: "oil", n: "น้ำมันพืช", unit: "ช้อนโต๊ะ", per: 1, def: 1, k: 120, p: 0, c: 0, f: 14 },
  // Shumai from the CP bag label (120 g): 300 kcal, P9 C21 F20, sodium 900 mg.
  // The seaweed pork roll has no label yet; estimated from typical minced pork rolls.
  { id: "seven_shumai", n: "ขนมจีบ เซเว่น (ถุง 120 g)", unit: "ถุง", per: 1, def: 1, k: 300, p: 9, c: 21, f: 20 },
  { id: "seven_seaweed_pork", n: "หมูห่อสาหร่าย เซเว่น (ค่าประมาณ)", unit: "ชิ้น", per: 1, def: 5, k: 50, p: 3.5, c: 2, f: 3 },
  { id: "krapao", n: "ข้าวกะเพราหมูสับ + ไข่ดาว", unit: "จาน", per: 1, def: 1, k: 650, p: 30, c: 70, f: 28 },
  { id: "chicken_rice", n: "ข้าวมันไก่", unit: "จาน", per: 1, def: 1, k: 600, p: 28, c: 75, f: 21 },
];

export const foodById = (id) => FOODS.find((f) => f.id === id);

// Nutrients for `qty` units of a food, rounded for display and storage.
export function portion(food, qty) {
  const m = qty / food.per;
  const r1 = (x) => Math.round(x * m * 10) / 10;
  return { kcal: Math.round(food.k * m), p: r1(food.p), c: r1(food.c), f: r1(food.f) };
}
