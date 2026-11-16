const app = angular.module('agentDeskApp', ['ngRoute']);

// Automatically route API calls to InfinityFree when running on GitHub Pages
const API_BASE_URL = (window.location.hostname.indexOf('github.io') !== -1)
    ? 'https://agentdesk-chug.free.je/'
    : '';

// 1. Standalone State Container
app.value('SessionState', {
    isAuthenticated: false,
    checked: false,
    csrfToken: '',
    sessionToken: localStorage.getItem('agentdesk_session_token') || '',
    agent: null
});

// 2. Shared Authentication Service
app.factory('AuthService', function($http, SessionState) {
    return {
        state: SessionState,
        checkSession: function() {
            return $http.get('api/auth.php?action=check').then(function(res) {
                SessionState.checked = true;
                if (res.data && res.data.authenticated) {
                    SessionState.isAuthenticated = true;
                    SessionState.csrfToken = res.data.csrf_token || '';
                    SessionState.agent = res.data.agent;
                    if (res.data.session_token) {
                        SessionState.sessionToken = res.data.session_token;
                        localStorage.setItem('agentdesk_session_token', res.data.session_token);
                    }
                } else {
                    SessionState.isAuthenticated = false;
                    SessionState.csrfToken = '';
                    SessionState.agent = null;
                }
                return SessionState.isAuthenticated;
            }, function() {
                SessionState.checked = true;
                SessionState.isAuthenticated = false;
                return false;
            });
        },
        setLoginData: function(data) {
            SessionState.isAuthenticated = true;
            SessionState.checked = true;
            SessionState.csrfToken = data.csrf_token || '';
            SessionState.agent = data.agent;
            if (data.session_token) {
                SessionState.sessionToken = data.session_token;
                localStorage.setItem('agentdesk_session_token', data.session_token);
            }
        },
        clearSession: function() {
            SessionState.isAuthenticated = false;
            SessionState.csrfToken = '';
            SessionState.sessionToken = '';
            SessionState.agent = null;
            localStorage.removeItem('agentdesk_session_token');
        }
    };
});

// 3. HTTP Interceptor (Routes api/ to InfinityFree + handles InfinityFree anti-bot cookie)
app.factory('SecurityInterceptor', function($q, $location, SessionState) {
    return {
        request: function(config) {
            if (config.url && config.url.indexOf('api/') === 0) {
                config.url = API_BASE_URL + config.url;
                config.withCredentials = true;
            }
            if (SessionState.csrfToken) {
                config.headers['X-CSRF-Token'] = SessionState.csrfToken;
            }
            if (SessionState.sessionToken) {
                config.headers['Authorization'] = 'Bearer ' + SessionState.sessionToken;
            }
            return config;
        },
        response: function(res) {
            if (
                res.config &&
                res.config.url &&
                res.config.url.indexOf('agentdesk-chug.free.je/api/') !== -1 &&
                typeof res.data === 'string' &&
                res.data.indexOf('aes.js') !== -1
            ) {
                window.location.href = 'https://agentdesk-chug.free.je/?return_to=' + encodeURIComponent(window.location.href);
                return $q.reject(res);
            }
            return res;
        },
        responseError: function(rejection) {
            if (
                rejection &&
                (rejection.status === -1 || rejection.status === 0) &&
                rejection.config &&
                rejection.config.url &&
                rejection.config.url.indexOf('agentdesk-chug.free.je/api/') !== -1 &&
                !sessionStorage.getItem('if_unlocked')
            ) {
                sessionStorage.setItem('if_unlocked', '1');
                window.location.href = 'https://agentdesk-chug.free.je/?return_to=' + encodeURIComponent(window.location.href);
                return $q.reject(rejection);
            }

            if (rejection.status === 401 && $location.path() !== '/login') {
                SessionState.isAuthenticated = false;
                SessionState.csrfToken = '';
                SessionState.agent = null;
                $location.path('/login');
            }
            return $q.reject(rejection);
        }
    };
});

// 4. Routes
app.config(function($routeProvider, $httpProvider) {
    $httpProvider.interceptors.push('SecurityInterceptor');

    $routeProvider
        .when('/login', {
            templateUrl: 'views/login.html',
            controller: 'AuthController',
            publicRoute: true
        })
        .when('/dashboard', {
            templateUrl: 'views/dashboard.html',
            controller: 'DashboardController'
        })
        .when('/customers', {
            templateUrl: 'views/customers.html',
            controller: 'CustomerController'
        })
        .when('/import', {
            templateUrl: 'views/import.html',
            controller: 'ImportController'
        })
        .when('/settings', {
            templateUrl: 'views/settings.html',
            controller: 'SettingsController'
        })
        .otherwise({
            redirectTo: '/dashboard'
        });
});

// 5. Route Guard
app.run(function($rootScope, $location, AuthService, SessionState) {
    $rootScope.$on('$routeChangeStart', function(event, next) {
        if (!SessionState.checked) {
            AuthService.checkSession().then(function(isAuth) {
                if (!isAuth && (!next || !next.publicRoute)) {
                    $location.path('/login');
                } else if (isAuth && next && next.publicRoute) {
                    $location.path('/dashboard');
                }
            });
        } else {
            if (!SessionState.isAuthenticated && (!next || !next.publicRoute)) {
                event.preventDefault();
                $location.path('/login');
            } else if (SessionState.isAuthenticated && next && next.publicRoute) {
                event.preventDefault();
                $location.path('/dashboard');
            }
        }
    });
});

// 6. Global Navbar, Logout & Renewal Chatbot Controller
app.controller('MainController', function($scope, $rootScope, $http, $location, $timeout, AuthService, SessionState) {
    $scope.auth = SessionState;
    $scope.chatOpen = false;
    $scope.chatSending = false;
    $scope.chat = { text: '' };
    $scope.chatMessages = [
        {
            sender: 'bot',
            text: 'Hi! Type a Policy Number, Mobile Number, or Customer Name to view full details.\nAdd "done" (e.g., 4685111115042820 done) to mark a renewal completed.'
        }
    ];

    $scope.toggleChat = function() {
        $scope.chatOpen = !$scope.chatOpen;
    };

    $scope.handleChatKeypress = function(event) {
        if (event.which === 13 || event.keyCode === 13) {
            event.preventDefault();
            $scope.sendChatMessage();
        }
    };

    $scope.sendChatMessage = function() {
        const text = ($scope.chat.text || '').trim();
        if (!text || $scope.chatSending) return;

        $scope.chatMessages.push({ sender: 'user', text: text });
        $scope.chat.text = '';
        $scope.chatSending = true;

        $http.post('api/chatbot.php', { message: text }).then(function(res) {
            $scope.chatSending = false;
            const reply = (res.data && res.data.reply) ? res.data.reply : 'Updated.';
            $scope.chatMessages.push({ sender: 'bot', text: reply });

            if (res.data && res.data.updated) {
                $rootScope.$broadcast('policyRenewalUpdated');
            }

            $timeout(function() {
                const box = document.getElementById('agentChatScroll');
                if (box) box.scrollTop = box.scrollHeight;
            }, 50);
        }, function(err) {
            $scope.chatSending = false;
            const errMsg = (err.data && err.data.message) ? err.data.message : 'Unable to reach server. Please check your connection.';
            $scope.chatMessages.push({ sender: 'bot', text: errMsg });
        });
    };

    $scope.isActive = function(path) {
        return $location.path() === path;
    };

    $scope.closeMobileMenu = function() {
        const nav = document.getElementById('mainNavbar');
        if (nav && nav.classList.contains('show')) {
            const bsCollapse = bootstrap.Collapse.getInstance(nav);
            if (bsCollapse) bsCollapse.hide();
        }
    };

    $scope.logout = function() {
        $http.post('api/auth.php?action=logout', {}).finally(function() {
            AuthService.clearSession();
            $scope.closeMobileMenu();
            $location.path('/login');
        });
    };
});
