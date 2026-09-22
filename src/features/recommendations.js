// ==========================================
// 🧠 نظام المستشار الذكي المتقدم جداً (إصدار 2026)
// ==========================================

import { getElement } from '../core/utils.js';
import { getCurrentStarSeason } from './star-seasons.js';

export function generateHiveRecommendations(manager, history) {
    const listDiv = getElement("recommendations-list");
    listDiv.innerHTML = "";
    
    if (history.length === 0) {
        return listDiv.innerHTML = '<div class="recommendation-card info" style="text-align:center;"><i class="fas fa-robot fa-2x" style="color:var(--info-color); margin-bottom:10px;"></i><br>أحتاج لبعض السجلات لأبدأ التحليل السحري لهذه الخلية.</div>';
    }

    const recommendations = [];
    const latest = history[history.length - 1];
    const health = manager.calculateHealthScore(latest);
    const { frames, honeyFrames = 0, pollenFrames = 0, queenYear, queenStatus, notes = "" } = latest;
    const currentSeason = getCurrentStarSeason();
    
    // --- 1. محرك تحليل كفاءة الملكة (Queen Performance AI) ---
    let queenScore = 100;
    const qAge = queenYear ? (new Date().getFullYear() - parseInt(queenYear)) : 0;
    if (qAge >= 2) queenScore -= 30; // خصم للعمر
    if (frames < 4) queenScore -= 20; // خصم لضعف الحضنة
    if (history.length >= 2) {
        const prev = history[history.length - 2];
        const growth = frames - prev.frames;
        if (growth > 1) queenScore = Math.min(100, queenScore + 20); // مكافأة للنمو السريع
        else if (growth < 0) queenScore -= 15; // خصم للتراجع
    }
    if (queenStatus !== "ملكة") queenScore = 0;

    // --- 2. محرك قراءة النصوص والسلوك (NLP Engine) ---
    const textAnalysis = notes.toLowerCase();
    const isAggressive = textAnalysis.includes("شرس") || textAnalysis.includes("هجوم");
    const isCalm = textAnalysis.includes("هادئ");
    const hasDiseases = textAnalysis.includes("فاروا") || textAnalysis.includes("مرض") || textAnalysis.includes("تكلس");

    // بناء التوصيات بناءً على الأولويات (Critical, High, Strategic, Info)

    // 🔴 الحالات الحرجة (تدخل فوري اليوم)
    if (queenStatus === "مكذبة") {
        recommendations.push({ type: "danger", icon: "fa-skull-crossbones", title: "توقف! خلية مكذبة", text: "النظام يرفض استمرار هذه الخلية. انفض النحل بعيداً لمسافة 50 متراً وأنقذ الصناديق والإطارات فوراً." });
    } else if (queenStatus === "بدون ملكة") {
        recommendations.push({ type: "danger", icon: "fa-exclamation-triangle", title: "طوارئ: طائفة يتيمة", text: "كل يوم يمر يقربها من التكذيب. أضف ملكة ملقحة أو ضمها لأقرب خلية قوية لإنقاذ جيش الشغالات." });
    }
    if (honeyFrames === 0 && frames > 2) {
        recommendations.push({ type: "danger", icon: "fa-bone", title: "مجاعة حتمية", text: "الخلية تستنزف آخر قطرة طاقة. قدم محلول سكري مركز (1:1) أو عجينة فوندان اليوم وإلا ستموت." });
    }
    if (hasDiseases) {
         recommendations.push({ type: "danger", icon: "fa-bug", title: "رصد وباء", text: "تم تسجيل إصابة مرضية/فاروا. استخدم العلاج المناسب فوراً وركز على الإطارات المفتوحة." });
    }

    // 🟠 التحذيرات والتوقعات (تدخل خلال أسبوع)
    if (history.length >= 3 && queenStatus === "ملكة") {
         const prev1 = history[history.length - 2];
         const prev2 = history[history.length - 3];
         if (frames < prev1.frames && prev1.frames < prev2.frames) {
             recommendations.push({ type: "warning", icon: "fa-chart-line-down", title: "انهيار تدريجي مرصود", text: "المنحنى في هبوط لـ 3 فحوصات متتالية! تأكد من عدم وجود (دبور، سرقة، أو ملكة فاشلة)." });
         }
    }
    if (currentSeason && currentSeason.name.includes("بدء التوسعة") && frames >= 7 && qAge > 0) {
         const honeyPressure = honeyFrames > 4 ? "، ويوجد ضغط عسل يضيق على الملكة" : "";
         recommendations.push({ type: "warning", icon: "fa-wind", title: "خوارزمية التطريد تطلق إنذاراً", text: `الخلية قوية والملكة ليست جديدة${honeyPressure}. نسبة التطريد تتجاوز 80%. قم بالتقسيم أو رفع عاسلة فوراً.` });
    }

    // 🔵 توجيهات استراتيجية واقتصادية (إدارة ذكية)
    if (queenStatus === "ملكة") {
        let qHtml = `أداء الملكة مقدر بـ <b>${queenScore}%</b>. `;
        if (queenScore >= 80) {
             qHtml += "هذه الملكة (نخبة)، فكر في التربية منها وأخذ يرقات لإنتاج ملكات جديدة للمنحل.";
             recommendations.push({ type: "info", icon: "fa-crown", title: "جينات ممتازة مرصودة", text: qHtml });
        } else if (queenScore < 50) {
             qHtml += "ملكة غير منتجة وتستهلك موارد المنحل عبثاً. ضعها في جدول (الاستبدال أو الإعدام) للموسم القادم.";
             recommendations.push({ type: "warning", icon: "fa-sync-alt", title: "قرار استبدال استراتيجي", text: qHtml });
        }
    }

    if (frames >= 8 && honeyFrames >= 5 && pollenFrames >= 2) {
         recommendations.push({ type: "success", icon: "fa-medal", title: "جاهزية اقتصادية قصوى", text: "توازن مثالي بين الجيش والمؤونة. الخلية جاهزة تماماً لقطفة العسل القادمة. ركز فقط على التوسعة الرأسية (إضافة طوابق)." });
    }
    
    if (isAggressive) recommendations.push({ type: "info", icon: "fa-shield-alt", title: "سلوك عدواني", text: "الذكاء الاصطناعي لاحظ تسجيلك لطباع شرسة. هذه الجينات مزعجة في الإدارة، فكر بتغيير السلالة تدريجياً." });

    if (recommendations.length === 0) {
        recommendations.push({ type: "success", icon: "fa-check-double", title: "انسجام تام", text: "معادلة الخلية (حضنة/عسل/عمر الملكة) في أفضل حالاتها الممكنة حالياً." });
    }

    // طباعة النتائج بتصميم 2026 المبهر
    recommendations.forEach(rec => {
        // تصميم شريط التقدم لو كان هناك تقييم للملكة
        let extraHTML = "";
        if (rec.title.includes("جينات") || rec.title.includes("استبدال")) {
             extraHTML = `<div style="background: rgba(0,0,0,0.1); border-radius:10px; height:6px; margin-top:8px; overflow:hidden;"><div style="width:${queenScore}%; background:var(--header-color); height:100%;"></div></div>`;
        }

        listDiv.innerHTML += `
        <div class="recommendation-card ${rec.type}" style="position:relative; padding-right: 45px; overflow:hidden;">
            <div style="position:absolute; right:10px; top:15px; font-size:1.5rem; opacity:0.8;"><i class="fas ${rec.icon}"></i></div>
            <h4 style="margin-bottom:5px;">${rec.title}</h4>
            <p style="font-size:0.9rem; margin:0; line-height:1.5;">${rec.text}</p>
            ${extraHTML}
        </div>`;
    });
}

export async function generateSiteRecommendations(manager) {
    const listDiv = getElement("site-recommendations-list");
    listDiv.innerHTML = "";
    const hives = await manager.loadHives();
    const allHistory = await manager.loadHistory();
    
    if (hives.length === 0) return listDiv.innerHTML = '<p class="recommendation-card info">بانتظار بيانات الموقع لإنشاء الخرائط التحليلية.</p>';

    const recommendations = [];
    const count = hives.length;
    
    // --- محرك تحليل الموقع الذكي (Site-wide AI) ---
    
    // 1. حساب مؤشر قوة الموقع العام (Site Vigor Index)
    let totalScore = 0;
    let totalHoney = 0;
    let strongHives = [], weakHives = [];
    
    hives.forEach(h => {
        totalScore += manager.calculateHealthScore(h);
        totalHoney += (h.honeyFrames || 0);
        if (h.frames >= 7) strongHives.push(h.hiveId);
        if (h.frames <= 3) weakHives.push(h.hiveId);
    });
    
    const avgHealth = Math.round(totalScore / count);
    const avgHoney = (totalHoney / count).toFixed(1);

    // 2. خوارزمية التوزيع الذكي للموارد (Resource Balancing)
    if (strongHives.length >= 2 && weakHives.length >= 2) {
         recommendations.push({ 
             type: "info", icon: "fa-random", 
             title: "⚖️ خطة توازن (Cross-Balance)", 
             text: `يوجد تفاوت كبير. الذكاء الاصطناعي يقترح: اسحب إطار حضنة مغلق من الخلايا (${strongHives.slice(0,3).join(',')}) وادعم بها الخلايا الضعيفة (${weakHives.slice(0,3).join(',')}) لرفع إنتاجية المنحل ككل بنسبة 30%.` 
         });
    }

    // 3. تحليل الانتشار الوبائي المكاني (Epidemic Radar)
    const recentRecords = allHistory.filter(r => (new Date() - new Date(r.date)) <= 14 * 24 * 60 * 60 * 1000);
    let varroaInfected = new Set();
    recentRecords.forEach(r => {
        if (r.notes && (r.notes.includes('فاروا') || r.notes.includes('مرض'))) varroaInfected.add(r.hiveId);
    });

    if (varroaInfected.size >= 3) {
        recommendations.push({ 
            type: "danger", icon: "fa-biohazard", 
            title: "🔴 رادار الأوبئة: خطر تفشي", 
            text: `تحذير: تم رصد (أمراض/فاروا) في ${varroaInfected.size} خلايا خلال الأسبوعين الماضيين. هذا مؤشر لانتشار وبائي قادم، ابدأ مكافحة جماعية للمنحل بأكمله الليلة.` 
        });
    }

    // 4. تقييم الأمن الغذائي للموقع (Food Security)
    if (avgHoney < 1.5) {
         recommendations.push({ 
             type: "deficit", icon: "fa-leaf", 
             title: "🍂 إعلان حالة جفاف رعوي", 
             text: `متوسط العسل (${avgHoney} إطار/خلية). الموقع لا يوفر رحيقاً كافياً لدعم هذا العدد من الخلايا. فكر جدياً في (الترحيل) لمكان آخر أو ابدأ بالتغذية السكرية المفتوحة.` 
         });
    } else if (avgHoney > 4) {
         recommendations.push({ 
             type: "excess", icon: "fa-tint", 
             title: "🍯 فيض رحيقي ممتاز", 
             text: `المرعى حول الموقع غزير جداً (متوسط المخزون ${avgHoney}). استغل الفرصة وركب العاسلات (الطوابق) لجمع أكبر قدر من العسل.` 
         });
    }

    // 5. تقرير صحة الموقع الشامل
    let healthColor = avgHealth > 75 ? "var(--success-color)" : (avgHealth > 50 ? "var(--warning-color)" : "var(--danger-color)");
    let healthIcon = avgHealth > 75 ? "fa-heartbeat" : "fa-heart-broken";
    
    listDiv.innerHTML += `
        <div style="background: rgba(0,0,0,0.03); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; margin-bottom: 15px; display:flex; align-items:center; justify-content:space-between;">
            <div>
                <h4 style="margin:0 0 5px 0;"><i class="fas fa-satellite"></i> تقييم ذكاء الموقع</h4>
                <p style="margin:0; font-size:0.85rem; color:#7f8c8d;">مؤشر الحيوية العام</p>
            </div>
            <div style="font-size:2rem; font-weight:bold; color:${healthColor};">
                ${avgHealth}% <i class="fas ${healthIcon}" style="font-size:1.5rem;"></i>
            </div>
        </div>
    `;

    if (recommendations.length === 0) {
         recommendations.push({ type: "success", icon: "fa-robot", title: "منظومة مثالية", text: "لم يرصد الرادار أي تهديدات. إدارة الموقع تسير بكفاءة تشغيلية ممتازة." });
    }

    recommendations.forEach(rec => {
        listDiv.innerHTML += `
        <div class="recommendation-card ${rec.type}" style="position:relative; padding-right: 45px; overflow:hidden;">
            <div style="position:absolute; right:10px; top:15px; font-size:1.5rem; opacity:0.8;"><i class="fas ${rec.icon}"></i></div>
            <h4 style="margin-bottom:5px;">${rec.title}</h4>
            <p style="font-size:0.9rem; margin:0; line-height:1.5;">${rec.text}</p>
        </div>`;
    });
}
