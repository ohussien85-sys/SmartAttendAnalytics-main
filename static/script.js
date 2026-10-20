/* الوظائف العامة للواجهة: الوضع اللوني وفحص حالة الخادم عند وجود عناصره. */
(() => {
    "use strict";

    const THEME_KEY = "theme"; // الحفاظ على مفتاح التخزين المستخدم سابقًا
    const root = document.documentElement;

    function applyTheme(theme) {
        const normalizedTheme = theme === "dark" ? "dark" : "light";
        root.setAttribute("data-theme", normalizedTheme);

        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            const isDark = normalizedTheme === "dark";
            button.setAttribute("aria-pressed", String(isDark));
            button.setAttribute(
                "aria-label",
                isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"
            );

            const icon = button.querySelector(".theme-toggle-icon");
            const label = button.querySelector(".theme-toggle-label");
            if (icon) icon.textContent = isDark ? "☀️" : "🌙";
            if (label) label.textContent = isDark ? "الوضع الفاتح" : "الوضع الداكن";

            // دعم زر صفحة تسجيل الدخول القديم أثناء الانتقال بين القوالب.
            if (!icon && !label) {
                button.textContent = isDark ? "☀️" : "🌙";
            }
        });
    }

    function readSavedTheme() {
        try {
            const savedTheme = window.localStorage.getItem(THEME_KEY);
            return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
        } catch (_error) {
            return "light";
        }
    }

    function saveTheme(theme) {
        try {
            window.localStorage.setItem(THEME_KEY, theme);
        } catch (_error) {
            // يظل تغيير المظهر متاحًا للجلسة الحالية إذا تعذر التخزين.
        }
    }

    // تطبيق الوضع قبل تفاعل المستخدم، وتحديث أي زر موجود في الصفحة.
    applyTheme(readSavedTheme());

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-theme-toggle], #darkModeToggle");
        if (!button) return;

        const currentTheme = root.getAttribute("data-theme");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
        saveTheme(nextTheme);
    });

    // عناصر فحص الواجهة موجودة في الصفحة الرئيسية فقط؛ لا تفترض وجودها بكل الصفحات.
    const testButton = document.getElementById("test-button");
    const message = document.getElementById("message");
    if (testButton && message) {
        testButton.addEventListener("click", () => {
            message.textContent = "الواجهة تعمل بنجاح!";
        });
    }

    const serverStatus = document.getElementById("server-status");
    if (serverStatus) {
        fetch("/health")
            .then((response) => {
                if (!response.ok) throw new Error("Server error");
                return response.json();
            })
            .then((data) => {
                serverStatus.textContent = data.status === "running"
                    ? "الخادم متصل بنجاح ✅"
                    : "الخادم غير جاهز";
            })
            .catch(() => {
                serverStatus.textContent = "تعذر الاتصال بالخادم";
            });
    }
})();

document.addEventListener("DOMContentLoaded", function() {
    // 1. طلب إذن الإشعارات تلقائياً لو مش متحقق
    if ("Notification" in window) {
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }
    }

    // 2. فحص حالة المحاضرة النشطة كل 5 ثواني لتفعيل الإشعار فوراً
    if (window.location.pathname.includes('/student_dashboard')) {
        setInterval(function() {
            fetch('/api/check-active-lecture')
                .then(response => response.json())
                .then(data => {
                    // لو الداتا أثبتت إن المحاضرة بدأت، والصفحة مش مسجلة تنبيه قديم
                    if (data.lecture_started) {
                        // إظهار تنبيه مرئي داخل صفحة الطالب (تنبيه قوي لا يمكن تفويته)
                        let alertBox = document.getElementById('lecture-alert-banner');
                        if (!alertBox) {
                            alertBox = document.createElement('div');
                            alertBox.id = 'lecture-alert-banner';
                            alertBox.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; background-color: #dc3545; color: white; text-align: center; padding: 15px; font-size: 18px; z-index: 9999; font-weight: bold; box-shadow: 0px 4px 6px rgba(0,0,0,0.3);";
                            alertBox.innerHTML = `⚠️ تنبيه هام: المحاضرة (${data.lecture_title}) قد بدأت الآن! <a href="/student_dashboard" style="color: #ffeb3b; text-decoration: underline; margin-right: 15px;">دخول الآن</a>`;
                            document.body.prepend(alertBox);
                        }

                        // إظهار إشعار متصفح لو متاح
                        if (Notification.permission === "granted") {
                            // منع تكرار ظهور نفس الإشعار لو ظهر قبل كده
                            if (!window.lastNotifiedLecture || window.lastNotifiedLecture !== data.lecture_id) {
                                new Notification("بدء المحاضرة!", {
                                    body: "المحاضرة " + data.lecture_title + " بدأت دلوقتي يا بطل.",
                                    icon: "/static/logo.png"
                                });
                                window.lastNotifiedLecture = data.lecture_id;
                            }
                        }
                    }
                })
                .catch(err => console.error("خطأ في جلب حالة المحاضرة:", err));
        }, 5000); // الفحص يتم كل 5 ثواني لتكون استجابة فورية
    }
});

function submitAttendanceViaQR(qrCodeData) {
    // جلب موقع الطالب في الخلفية تلقائياً بدون أزارير
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            let studentLat = position.coords.latitude;
            let studentLon = position.coords.longitude;
            
            // إرسال كود الـ QR وإحداثيات الطالب للسيرفر معاً
            fetch('/verify_qr_with_location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qr_data: qrCodeData,
                    latitude: studentLat,
                    longitude: studentLon
                })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                if(data.success) location.reload();
            });

        }, function(error) {
            alert("يجب تفعيل الـ GPS لتسجيل الحضور بالسكان!");
        }, { enableHighAccuracy: true });
    } else {
        alert("متصفحك لا يدعم تحديد الموقع.");
    }
}