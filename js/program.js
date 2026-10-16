// Program data: phases of the 8-week block and the 7-day split.
// sets s, rep range lo–hi, rest in seconds, inc = load step (kg), start = hint shown before the first log.

export const PHASES = {
  1: { name: "Re-entry · สัปดาห์ 1", desc: "หลังขลิบ: น้ำหนัก 60–70% ของเดิม · RIR 3–4 · ห้ามเบ่ง", rir: "3–4", mod: "reentry" },
  2: { name: "Re-entry · สัปดาห์ 2", desc: "เพิ่มเป็น 75–80% ถ้าแผลไม่มีอาการ · RIR 3", rir: "3", mod: "reentry" },
  3: { name: "Build · สัปดาห์ 3", desc: "เริ่ม double progression เต็มรูปแบบ · RIR 2", rir: "2", mod: "build" },
  4: { name: "Build · สัปดาห์ 4", desc: "RIR 2 · เพิ่มน้ำหนักเมื่อแตะเพดานครั้ง", rir: "2", mod: "build" },
  5: { name: "Build · สัปดาห์ 5", desc: "RIR 1–2 · เซ็ตสุดท้ายของท่าแยกส่วนเล่นจนเกือบหมดแรง", rir: "1–2", mod: "build" },
  6: { name: "Build · สัปดาห์ 6", desc: "RIR 1–2", rir: "1–2", mod: "build" },
  7: { name: "Peak · สัปดาห์ 7", desc: "RIR 0–1 · ท่าแยกส่วนเซ็ตสุดท้ายจนล้มเหลว ท่าหนักยังเหลือ 1", rir: "0–1", mod: "build" },
  8: { name: "Deload · สัปดาห์ 8", desc: "เซ็ตลดครึ่ง น้ำหนักเท่าเดิม RIR 4 · จากนั้นเริ่มบล็อกใหม่ที่สัปดาห์ 3", rir: "4", mod: "deload" },
};

export const DAYS = [
  { dow: 1, code: "A", th: "จ.", title: "Chest + Back A", sub: "อก + หลัง · หนัก 6–10 ครั้ง", pc: "--p-red", ex: [
    { id: "incl_mach", n: "Incline Machine / Smith Press", s: 3, lo: 6, hi: 10, rest: 150, inc: 2.5, note: "องศาเบาะ 30° ศอกทำมุมราว 45° กับลำตัว ไม่กางศอกสุด เพื่อถนอมไหล่ขวาที่เคย out of groove", start: "สัปดาห์ 1 เริ่ม ~30–35 kg (Smith ไม่รวมบาร์)" },
    { id: "cs_row", n: "Chest-Supported Row (T-bar / Machine)", s: 3, lo: 8, hi: 10, rest: 120, inc: 2.5, note: "อกแนบเบาะตลอด ไม่ต้องเกร็งหลังล่าง เหมาะกับช่วงหลังขลิบ ดึงศอกไปหาสะโพก" },
    { id: "flat_mach", n: "Flat Machine Press", s: 2, lo: 8, hi: 12, rest: 120, inc: 2.5, note: "ลงช้า 2 วินาที ดันขึ้นไม่ล็อกศอกเต็ม" },
    { id: "lat_pd", n: "Lat Pulldown (Neutral grip)", s: 3, lo: 8, hi: 12, rest: 120, inc: 2.5, note: "ยืดสะบักขึ้นสุดก่อนดึง ดึงลงถึงคาง ปล่อยคืน 2 วินาที" },
    { id: "cable_fly_hl", n: "High-to-Low Cable Fly", s: 2, lo: 12, hi: 15, rest: 75, inc: 2.5, note: "บีบค้าง 1 วินาที ไม่ยืดไหล่ไปหลังลำตัว" },
    { id: "str_arm", n: "Straight-Arm Cable Pulldown", s: 2, lo: 12, hi: 15, rest: 60, inc: 2.5, note: "แขนตึงเกือบตรง ใช้ปีกล้วนๆ" },
  ] },
  { dow: 2, code: "A", th: "อ.", title: "Legs A", sub: "ขา เน้นหน้าขา + น่อง + core", pc: "--p-blue", ex: [
    { id: "squat", n: "Hack Squat / Barbell Squat", s: 3, lo: 6, hi: 10, rest: 180, inc: 5, note: "สัปดาห์ 1–2 ใช้ Hack squat หรือ Leg press เท่านั้น ไม่ใช้ Barbell squat ไม่กลั้นหายใจเบ่ง หายใจออกตอนดันขึ้น", start: "Barbell squat เดิม 40 kg · หลังสัปดาห์ 3 ไต่ขึ้นทีละ 5 kg ได้เร็ว" },
    { id: "leg_press", n: "Leg Press", s: 3, lo: 10, hi: 12, rest: 120, inc: 10, note: "เท้ากลางแป้น ลงลึกจนสะโพกยังไม่ม้วน" },
    { id: "leg_ext", n: "Leg Extension", s: 3, lo: 12, hi: 15, rest: 75, inc: 5, note: "ค้างบนสุด 1 วินาที", start: "สถิติเดิม 65 kg · สัปดาห์ 1 เริ่ม ~40–45 kg" },
    { id: "leg_curl_s", n: "Seated Leg Curl", s: 3, lo: 10, hi: 12, rest: 75, inc: 5, note: "เอนตัวไปหน้าเล็กน้อยเพื่อยืดหลังขามากขึ้น" },
    { id: "calf_stand", n: "Standing Calf Raise", s: 4, lo: 10, hi: 15, rest: 60, inc: 5, note: "ค้างล่างสุด 2 วินาที ห้ามเด้ง" },
    { id: "cable_crunch", n: "Cable Crunch", s: 3, lo: 12, hi: 15, rest: 60, inc: 2.5, note: "ม้วนซี่โครงเข้าหาสะโพก ไม่ใช่ก้มจากสะโพก" },
  ] },
  { dow: 3, code: "A", th: "พ.", title: "Shoulders + Arms", sub: "ไหล่ + แขน · ไหล่ขวาวอร์มก่อนเสมอ", pc: "--p-yellow", ex: [
    { id: "db_ohp", n: "Seated DB Shoulder Press", s: 3, lo: 8, hi: 10, rest: 120, inc: 2, note: "ฝ่ามือหันเข้าหากันครึ่งทาง (semi-neutral) ลดแรงที่ไหล่ขวา หลังแนบเบาะ" },
    { id: "lat_raise_c", n: "Cable Lateral Raise", s: 4, lo: 12, hi: 20, rest: 60, inc: 1.25, note: "ยกถึงระดับไหล่ ลงช้า ไม่เหวี่ยง" },
    { id: "rear_delt", n: "Rear Delt Machine", s: 3, lo: 15, hi: 20, rest: 60, inc: 2.5, note: "แขนกว้าง ใช้ไหล่หลัง ไม่บีบสะบักแรง" },
    { id: "incl_curl", n: "Incline DB Curl", s: 3, lo: 8, hi: 12, rest: 75, inc: 1, note: "แขนห้อยหลังลำตัว ยืดหน้าแขนเต็มที่" },
    { id: "oh_tri", n: "Overhead Cable Triceps Extension", s: 3, lo: 10, hi: 12, rest: 75, inc: 2.5, note: "เน้นหัวยาวของหลังแขน ศอกชี้ไปหน้า" },
    { id: "ss_hammer_pd", n: "Superset: Hammer Curl + Rope Pushdown", s: 2, lo: 12, hi: 15, rest: 60, inc: 1, note: "จบ hammer ไปกดต่อทันที พัก 60 วินาทีหลังจบคู่ บันทึกน้ำหนัก hammer" },
    { id: "hang_knee", n: "Hanging Knee Raise", s: 3, lo: 10, hi: 15, rest: 60, inc: 0, note: "ม้วนสะโพกขึ้น ไม่แกว่ง น้ำหนักตัว ใส่ 0 ได้" },
  ] },
  { dow: 4, code: "R", th: "พฤ.", title: "Recovery + Core", sub: "Zone 2 + mobility + core เบา", pc: "--p-green", ex: [
    { id: "z2", n: "Incline Walk Zone 2", s: 1, lo: 30, hi: 40, rest: 0, inc: 0, time: true, log: false, note: "30–40 นาที ชันราว 8–12% ยังพูดเป็นประโยคได้ ไม่วิ่ง" },
    { id: "mob", n: "Mobility: ไหล่ + สะโพก", s: 1, lo: 10, hi: 10, rest: 0, inc: 0, time: true, log: false, note: "Band dislocate, Thoracic rotation, 90/90 hip, Couch stretch ท่าละ 2 นาที" },
    { id: "deadbug", n: "Dead Bug", s: 3, lo: 8, hi: 12, rest: 45, inc: 0, note: "ข้างละ 8–12 หลังล่างแนบพื้นตลอด" },
    { id: "pallof", n: "Pallof Press", s: 3, lo: 10, hi: 12, rest: 45, inc: 2.5, note: "ข้างละ 10–12 ต้านการบิดตัว" },
    { id: "side_plank", n: "Side Plank (วินาที)", s: 2, lo: 30, hi: 45, rest: 45, inc: 0, note: "ข้างละ 30–45 วินาที กรอกวินาทีในช่องครั้ง" },
  ] },
  { dow: 5, code: "B", th: "ศ.", title: "Chest + Back B", sub: "อก + หลัง · ปริมาณ 8–15 ครั้ง", pc: "--p-red", ex: [
    { id: "pullup", n: "Pull-up / Assisted Pull-up", s: 3, lo: 6, hi: 10, rest: 150, inc: 2.5, note: "ใช้เครื่องช่วยถ้ายังไม่ถึง 6 ครั้ง กรอกน้ำหนักช่วยเป็นค่าลบ เช่น -20" },
    { id: "flat_db", n: "Flat DB Press (Neutral grip)", s: 3, lo: 8, hi: 12, rest: 120, inc: 2, note: "ดัมเบลหันฝ่ามือเข้าหากัน ไหล่ปลอดภัยกว่าบาร์ ลงถึงระดับอก", start: "เดิม Bench 50–60 kg × 12 · สัปดาห์ 1 เริ่มดัมเบล ~16–18 kg/ข้าง" },
    { id: "one_arm_row", n: "One-Arm Cable Row", s: 3, lo: 10, hi: 12, rest: 75, inc: 2.5, note: "ทีละข้าง ยืดไปหน้าเต็มที่แล้วดึงศอกไปหลัง", start: "สถิติเดิม 20 kg" },
    { id: "pec_deck", n: "Pec Deck / Machine Fly", s: 3, lo: 12, hi: 15, rest: 75, inc: 2.5, note: "บีบกลางอกค้าง 1 วินาที" },
    { id: "wide_row", n: "Wide-Grip Seated Cable Row", s: 2, lo: 10, hi: 12, rest: 90, inc: 2.5, note: "ศอกกาง ดึงเข้าหาอกบน เน้นหลังบนและไหล่หลัง" },
    { id: "lat_raise_db", n: "DB Lateral Raise", s: 3, lo: 15, hi: 20, rest: 60, inc: 1, note: "ไหล่ข้างครั้งที่ 2 ของสัปดาห์" },
  ] },
  { dow: 6, code: "B", th: "ส.", title: "Legs B + Arms", sub: "หลังขา ก้น + แขน pump", pc: "--p-blue", ex: [
    { id: "rdl", n: "Romanian Deadlift", s: 3, lo: 8, hi: 10, rest: 150, inc: 5, note: "สัปดาห์ 1–2 ใช้ 45° Back Extension แทน ดันสะโพกไปหลัง หลังตรง บาร์ชิดขา" },
    { id: "bss", n: "Bulgarian Split Squat", s: 3, lo: 8, hi: 12, rest: 90, inc: 2, note: "ข้างละ 8–12 น้ำหนักดัมเบลต่อข้าง สัปดาห์ 1–2 ใช้ walking lunge เบาๆ แทน", start: "Walking lunge เดิม 10–15 kg/ข้าง" },
    { id: "leg_curl_l", n: "Lying Leg Curl", s: 3, lo: 10, hi: 12, rest: 75, inc: 5, note: "ไม่ยกสะโพกขึ้นจากเบาะ" },
    { id: "calf_seat", n: "Seated Calf Raise", s: 3, lo: 12, hi: 20, rest: 60, inc: 5, note: "น่องส่วนล่าง (soleus)" },
    { id: "ss_curl_pd", n: "Superset: Bayesian Cable Curl + Pushdown", s: 3, lo: 10, hi: 15, rest: 60, inc: 2.5, note: "แขนครั้งที่ 2 ของสัปดาห์ บันทึกน้ำหนัก curl" },
    { id: "ss_core", n: "Superset: Cable Crunch + DB Side Bend", s: 2, lo: 12, hi: 15, rest: 60, inc: 2.5, note: "ปิดท้ายแกนกลาง บันทึกน้ำหนัก crunch" },
  ] },
  { dow: 0, code: "—", th: "อา.", title: "Rest", sub: "พักเต็มวัน", pc: "--p-grey", ex: [],
    rest: "เดิน 6,000–8,000 ก้าว นอนให้ถึง 8 ชั่วโมง เตรียมอาหารทั้งสัปดาห์ วันนี้ไม่ยก ถ้ารู้สึกอยากซ้อม นั่นคือสัญญาณว่าโปรแกรมทำงาน" },
];
