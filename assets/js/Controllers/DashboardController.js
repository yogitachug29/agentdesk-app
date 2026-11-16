app.controller('DashboardController', function($scope, $http) {
    $scope.loading = true;
    $scope.data = {
        total_customers: 0,
        todays_birthdays: [],
        tomorrow_birthdays: [],
        due_renewals: [],
        all_pending_renewals: [],
        upload_alert: { show: false },
        recent_customers: [],
        today_date: ''
    };
    $scope.notificationPermission = ('Notification' in window) ? Notification.permission : 'unsupported';

    // Use api.whatsapp.com on Android/iOS phones, web.whatsapp.com on Windows/Mac desktop
    const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !/Windows|Macintosh/i.test(navigator.userAgent);
    const whatsappBaseUrl = isPhone
        ? 'https://api.whatsapp.com/send?phone='
        : 'https://web.whatsapp.com/send?phone=';

    // Clean single-codepoint emojis (avoids \uFE0F variation selector corruption)
    const EMOJI = {
        balloon: String.fromCodePoint(0x1F388), // 🎈
        party: String.fromCodePoint(0x1F389),   // 🎉
        heart: String.fromCodePoint(0x2764),    // ❤
        cake: String.fromCodePoint(0x1F382),    // 🎂
        pray: String.fromCodePoint(0x1F64F)     // 🙏
    };

    function formatIndianPhone(rawNumber) {
        let digits = String(rawNumber || '').replace(/\D/g, '');
        if (digits.startsWith('0') && digits.length === 11) {
            digits = digits.substring(1);
        }
        if (digits.length === 10) {
            return '91' + digits;
        }
        return digits;
    }

    $scope.getBirthdayWhatsAppUrl = function(customer, isToday) {
        const phone = formatIndianPhone(customer.mobile_number);
        const msg = isToday
            ? `Happy Birthday ${customer.full_name}! ${EMOJI.balloon}${EMOJI.party} Wishing you good health, happiness, and prosperity in the year ahead ${EMOJI.heart}${EMOJI.cake}\nWarm regards,\nChug.`
            : `Hello ${customer.full_name}, ${EMOJI.balloon}\nsending warm advance birthday wishes for tomorrow! ${EMOJI.cake}\nWishing you health and happiness always ${EMOJI.heart}\nWarm regards,\nChug.`;
        return whatsappBaseUrl + phone + '&text=' + encodeURIComponent(msg);
    };

    $scope.getRenewalWhatsAppUrl = function(policy) {
        const phone = formatIndianPhone(policy.mobile_number);
        const dayText = policy.days_until == 1 ? 'tomorrow' : `in ${policy.days_until} days`;
        const msg = `Dear ${policy.customer_name} ${EMOJI.pray}, gentle reminder that your ${policy.policy_type} (Policy No: ${policy.policy_number}) is due for renewal ${dayText} on ${policy.renewal_date}. Please let us know when to collect the cheque or if you need assistance completing your renewal.\nRegards,\nChug`;
        return whatsappBaseUrl + phone + '&text=' + encodeURIComponent(msg);
    };

    $scope.requestNotificationPermission = function() {
        if (!('Notification' in window)) return;
        Notification.requestPermission().then(function(permission) {
            $scope.$apply(function() {
                $scope.notificationPermission = permission;
                if (permission === 'granted') {
                    $scope.triggerDailyNotification();
                }
            });
        });
    };

    $scope.triggerDailyNotification = function() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const bCount = $scope.data.todays_birthdays.length + $scope.data.tomorrow_birthdays.length;
        const rCount = $scope.data.due_renewals.length;
        if (bCount === 0 && rCount === 0) return;

        const storageKey = 'agentdesk_notified_' + $scope.data.today_date;
        if (localStorage.getItem(storageKey) === 'true') return;

        new Notification('AgentDesk Daily Reminders', {
            body: `Today's alerts: ${bCount} Birthday reminder(s) & ${rCount} Policy Renewal reminder(s).`
        });

        localStorage.setItem(storageKey, 'true');
    };

    $scope.loadDashboard = function() {
        $scope.loading = true;
        $http.get('api/dashboard.php').then(function(res) {
            $scope.loading = false;
            if (res.data.status === 'success') {
                $scope.data = res.data;
                $scope.triggerDailyNotification();
            }
        }, function() {
            $scope.loading = false;
        });
    };

    $scope.$on('policyRenewalUpdated', function() {
        $scope.loadDashboard();
    });

    $scope.loadDashboard();
});