app.controller('AuthController', function($scope, $http, $location, AuthService) {
    $scope.credentials = { username: '', password: '' };
    $scope.loading = false;
    $scope.errorMessage = '';

    $scope.login = function() {
        $scope.errorMessage = '';
        $scope.loading = true;

        $http.post('api/auth.php?action=login', $scope.credentials).then(function(res) {
            $scope.loading = false;
            if (res.data.status === 'success') {
                AuthService.setLoginData(res.data);
                $location.path('/dashboard');
            } else {
                $scope.errorMessage = res.data.message || 'Login failed.';
            }
        }, function(err) {
            $scope.loading = false;
            $scope.errorMessage = (err.data && err.data.message) ? err.data.message : 'Unable to connect to server.';
        });
    };
});