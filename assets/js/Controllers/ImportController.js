app.controller('ImportController', function($scope, $http) {
    $scope.importType = 'birthdays';
    $scope.targetMonth = '';
    $scope.uploading = false;
    $scope.errorMessage = '';
    $scope.importResult = null;
    $scope.logs = [];

    $scope.loadHistory = function() {
        $http.get('api/import.php').then(function(res) {
            if (res.data.status === 'success') {
                $scope.logs = res.data.logs;
            }
        });
    };

    $scope.uploadExcel = function() {
        const fileInput = document.getElementById('excelFileInput');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            $scope.errorMessage = 'Please select an Excel (.xlsx, .xls, or .csv) file first.';
            return;
        }

        const formData = new FormData();
        formData.append('excel_file', fileInput.files[0]);
        formData.append('import_type', $scope.importType);
        if ($scope.importType === 'renewals' && $scope.targetMonth) {
            formData.append('target_month', $scope.targetMonth);
        }

        $scope.uploading = true;
        $scope.errorMessage = '';
        $scope.importResult = null;

        $http.post('api/import.php', formData, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        }).then(function(res) {
            $scope.uploading = false;
            if (res.data.status === 'success') {
                $scope.importResult = res.data;
                fileInput.value = '';
                $scope.loadHistory();
            } else {
                $scope.errorMessage = res.data.message || 'Import failed.';
            }
        }, function(err) {
            $scope.uploading = false;
            $scope.errorMessage = (err.data && err.data.message) ? err.data.message : 'Server error during file upload.';
        });
    };

    $scope.loadHistory();
});