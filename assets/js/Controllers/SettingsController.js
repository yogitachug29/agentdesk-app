app.controller('SettingsController', function($scope, $http) {
    $scope.pwd = { current_password: '', new_password: '' };
    $scope.saving = false;
    $scope.successMsg = '';
    $scope.errorMsg = '';

    $scope.updatePassword = function() {
        $scope.saving = true;
        $scope.successMsg = '';
        $scope.errorMsg = '';

        $http.post('api/export.php?action=change_password', $scope.pwd).then(function(res) {
            $scope.saving = false;
            if (res.data.status === 'success') {
                $scope.successMsg = res.data.message;
                $scope.pwd = { current_password: '', new_password: '' };
            } else {
                $scope.errorMsg = res.data.message || 'Unable to update password.';
            }
        }, function(err) {
            $scope.saving = false;
            $scope.errorMsg = (err.data && err.data.message) ? err.data.message : 'Server error.';
        });
    };
});