// ==========================================
// نظام الجولة التعريفية (Onboarding Tutorial)
// ==========================================

import { DBHelper } from '../core/db-helper.js';
import { FirebaseHelper } from '../services/firebase-helper.js';

let currentTutorialStep = 0;
let tutorialSteps = [];

function initTutorialSteps() {
    const isMobile = window.innerWidth <= 768;
    
    tutorialSteps = [
        {
            target: null, 
            title: "أهلاً بك في عالمك الخاص 🍯",
            text: "تربية النحل ليست مجرد مهنة، بل شغف يرافقه الكثير من التعب. صممنا هذا المساعد الذكي ليحمل عنك عبء الحسابات والتذكر، ويترك لك متعة العمل الصافي مع النحل. دعنا نكتشف كيف سنجعل يومك في المنحل أسهل!"
        },
        {
            target: isMobile ? document.querySelector('.bottom-nav-btn i.fa-tachometer-alt')?.parentElement : document.querySelector('.tab-button i.fa-tachometer-alt')?.parentElement,
            title: "نبض منحلك في مكان واحد 📊",
            text: "تخيل أن تطمئن على صحة كل خلاياك بنظرة واحدة! هنا ستجد ملخصاً ذكياً يخبرك فوراً أين يجب أن تركز جهدك اليوم، وتوصيات آلية تنبهك بالخلايا التي تحتاج لتدخلك العاجل لإنقاذها."
        },
        {
            target: isMobile ? document.querySelector('.bottom-nav-btn i.fa-edit')?.parentElement : document.querySelector('.tab-button i.fa-edit')?.parentElement,
            title: "سجل النحال الرقمي 📝",
            text: "وداعاً للدفاتر الورقية التي تضيع أو تتلف بآثار العسل! وأنت واقف أمام الخلية، يمكنك تدوين حالتها، قوة ملكتها، ومخزونها في ثوانٍ معدودة لتكوّن تاريخاً دقيقاً لكل طائفة."
        },
        {
            target: document.getElementById('quick-actions-btn'),
            title: "عصاك السحرية لتوفير الوقت ⚡",
            text: "لأن وقتك ثمين بين الخلايا. هل قمت بإضافة شمع أساس أو تغذية لـ 20 خلية معاً؟ بضغطة واحدة هنا يمكنك تسجيل هذا الإجراء لكل تلك الخلايا دفعة واحدة دون الحاجة لفتح سجل كل خلية على حدة."
        },
        {
            target: isMobile ? document.querySelector('.bottom-nav-btn i.fa-star')?.parentElement : document.querySelector('.tab-button i.fa-star')?.parentElement,
            title: "حكمة الأجداد مدمجة بالتقنية 🌟",
            text: "النحال الماهر يعرف مواسمه. لقد دمجنا لك حركة النجوم (كالوسم وسهيل) بحالة النحل، لنوفر لك نصائح استباقية تخبرك متى تتوقع التطريد، أو متى تجهز طوائفك لقطفة العسل الكبرى."
        },
        {
            target: isMobile ? document.querySelector('.bottom-nav-btn i.fa-chart-line')?.parentElement : document.querySelector('.tab-button i.fa-chart-line')?.parentElement,
            title: "مستشارك الخاص للتطوير 📈",
            text: "البيانات هنا تتحول إلى قرارات ناجحة. راقب كيف تتأثر قوة الخلية بعمر الملكة بمرور الزمن من خلال رسومات واضحة. هذه التحليلات ستساعدك على استبعاد الملكات الضعيفة ومضاعفة إنتاجك للموسم القادم."
        }
    ];

    tutorialSteps = tutorialSteps.filter(step => step.target !== null || step.title.includes("عالمك"));
}

export async function startTutorial() {
    // التحقق السريع من التخزين المحلي القوي لمنع التكرار المزعج
    if (localStorage.getItem("hasSeenTutorial") === "true") return;
    
    const hasSeen = (await DBHelper.get("settings", "hasSeenTutorial"))?.value;
    if (hasSeen) {
        localStorage.setItem("hasSeenTutorial", "true");
        return;
    }

    initTutorialSteps();
    currentTutorialStep = 0;
    
    // إخفاء القوائم الجانبية لو كانت مفتوحة لتجنب التداخل
    const sidebar = document.getElementById('main-sidebar');
    if(sidebar && window.innerWidth <= 768) sidebar.classList.remove('open');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if(overlay) overlay.classList.remove('active');

    document.getElementById('tutorial-overlay').classList.add('active');
    showTutorialStep();
}

function showTutorialStep() {
    if (currentTutorialStep >= tutorialSteps.length) {
        endTutorial();
        return;
    }

    const step = tutorialSteps[currentTutorialStep];
    const dialog = document.getElementById('tutorial-dialog');

    // إزالة التظليل عن العنصر السابق
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

    // تعبئة البيانات
    document.getElementById('tutorial-title').innerHTML = step.title;
    document.getElementById('tutorial-text').textContent = step.text;
    document.getElementById('tutorial-progress').textContent = `${currentTutorialStep + 1} / ${tutorialSteps.length}`;

    dialog.classList.add('active');

    // تظليل العنصر المستهدف والتمرير إليه
    if (step.target) {
        step.target.classList.add('tutorial-highlight');
        step.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // تغيير زر التالي في الخطوة الأخيرة
    if (currentTutorialStep === tutorialSteps.length - 1) {
        document.getElementById('tutorial-next').innerHTML = 'ابدأ العمل! <i class="fas fa-check"></i>';
        document.getElementById('tutorial-next').style.backgroundColor = 'var(--success-color)';
    } else {
        document.getElementById('tutorial-next').innerHTML = 'التالي <i class="fas fa-chevron-left"></i>';
        document.getElementById('tutorial-next').style.backgroundColor = 'var(--header-alt-color)';
    }
}

export function nextTutorialStep() {
    currentTutorialStep++;
    showTutorialStep();
}

export async function endTutorial() {
    document.getElementById('tutorial-overlay').classList.remove('active');
    document.getElementById('tutorial-dialog').classList.remove('active');
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    
    // حفظ قوي جداً في المتصفح لعدم الإزعاج مرة أخرى
    localStorage.setItem("hasSeenTutorial", "true");
    await DBHelper.put("settings", { key: "hasSeenTutorial", value: true });
    
    if (typeof FirebaseHelper !== 'undefined' && FirebaseHelper.currentUser) {
        FirebaseHelper.saveItem("settings", "hasSeenTutorial", { key: "hasSeenTutorial", value: true });
    }
}
