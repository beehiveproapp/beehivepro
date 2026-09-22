// ==========================================
// المواسم والنجوم (Star Seasons)
// ==========================================

import { getElement } from '../core/utils.js';

const starSeasons = [
    { star: "الشبط", start: "01-28", end: "02-20", name: "التشتية (البرد القارس)", desc: "يتوقف النشاط، وتنكمش الحضنة، ويجب التأكد من وجود المخزون الكافي.", tips: ["عدم فتح الخلايا أبداً إلا للحالات الطارئة جداً.", "التأكد من أن مدخل الخلية ضيق جداً لحفظ الدفء.", "عزل الخلايا خارجياً وتفقد المخزون من الخارج (وزن الخلية) للتأكد من كفايته."] },
    { star: "العقارب", start: "02-21", end: "06-04", name: "بدء التوسعة الربيعية", desc: "يبدأ النحل بالتوسع، تنطلق الأزهار البرية، ويكون الشغل الشاغل هو تجديد الشمع وتقوية الخلايا.", tips: ["البدء بإضافة إطارات شمع أساس لتجديد الشمع فور بدء التوسع.", "مراقبة النحل لتفادي التطريد بزيادة الإطارات أو التقسيم.", "توفير مصدر ماء نقي قريب من المنحل."] },
    { star: "الثريا", start: "06-05", end: "08-23", name: "الصيف والفيض الرئيسي", desc: "أشد فترة ارتفاع درجات حرارة، وبعضها يطلق عليه فترة سكون، ويجب العناية بالتهوية والماء.", tips: ["زيادة تهوية الخلايا ورفع الغطاء الخارجي قليلاً لتخفيف الحرارة.", "توفير مياه باردة ونظيفة باستمرار بالقرب من المنحل.", "الاستعداد لقطف العسل (الفيض الرئيسي) ومراقبة مؤشرات النضج."] },
    { star: "سهيل", start: "08-24", end: "10-15", name: "تجهيز الشتاء", desc: "يبدأ نشاط النحل بالازدياد وبناء الأقراص، مع بدء خروج جيل الشتاء.", tips: ["البدء ببرنامج تغذية سكرية لتوسيع الحضنة وإعداد النحل الشتوي.", "مراجعة سجلات الخلايا الضعيفة والتخطيط لضمها أو تقويتها.", "التأكد من سلامة الخلية وإحكام إغلاقها ضد الحشرات."] },
    { star: "الوسم", start: "10-16", end: "01-27", name: "التوسع الخريفي", desc: "أهم نجم لدخول الخريف، يكثر فيه النحل مع بدء التغذية وتغيير الملكات، وهو أهم فترة لمكافحة الفاروا.", tips: ["مكافحة الفاروا مكثفة لإنتاج جيل شتوي سليم.", "استبدال الملكات القديمة بملكات شابة لزيادة قوة الطوائف.", "توفير التغذية البروتينية (العجائن) لتشجيع الملكة على وضع البيض."] }
];

export function getCurrentStarSeason() {
    const now = new Date();
    const dateCode = (now.getMonth() + 1) * 100 + now.getDate();
    return starSeasons.find(season => {
        const startCode = (s => Number(s.split('-')[0]) * 100 + Number(s.split('-')[1]))(season.start);
        const endCode = (s => Number(s.split('-')[0]) * 100 + Number(s.split('-')[1]))(season.end);
        if (startCode > endCode) { // يمتد عبر السنة الجديدة
            return dateCode >= startCode || dateCode <= endCode;
        }
        return dateCode >= startCode && dateCode <= endCode;
    });
}

export function updateStarCalculator() {
    const contentDiv = getElement("star-calculator-content");
    const currentSeason = getCurrentStarSeason();
    let html = "";

    if (currentSeason) {
        html += `<div class="star-season-card">
                    <h3><i class="fas fa-satellite-dish"></i> الموسم الحالي: ${currentSeason.name} (نجم ${currentSeason.star})</h3>
                    <p class="date-range">من ${currentSeason.start.split('-').reverse().join('/')} إلى ${currentSeason.end.split('-').reverse().join('/')}</p>
                    <p>${currentSeason.desc}</p>
                    <h4><i class="fas fa-bee"></i> نصائح للنحال:</h4>
                    <ul class="tips-list">${currentSeason.tips.map(t => `<li>${t}</li>`).join('')}</ul>
                 </div>`;
    } else {
        html = '<p class="star-season-card">لا يوجد موسم فلكي محدد حالياً.</p>';
    }

    html += '<h3><i class="fas fa-forward"></i> المواسم القادمة</h3><div class="upcoming-seasons-grid">';
    
    let currentIndex = starSeasons.findIndex(s => s === currentSeason);
    for (let i = 1; i <= 4; i++) {
        const nextSeason = starSeasons[(currentIndex + i) % starSeasons.length];
        html += `<div class="upcoming-card">
                    <h4>${nextSeason.name} (نجم ${nextSeason.star})</h4>
                    <p>يبدأ تقريباً في: ${nextSeason.start.split('-').reverse().join('/')}</p>
                 </div>`;
    }
    html += "</div>";
    contentDiv.innerHTML = html;
}
