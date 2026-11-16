app.controller('CustomerController', function($scope, $http) {
    $scope.customers = [];
    $scope.searchQuery = '';
    $scope.showForm = false;
    $scope.form = {};
    $scope.successMessage = '';
    $scope.errorMessage = '';

    $scope.loadCustomers = function() {
        const q = encodeURIComponent($scope.searchQuery || '');
        $http.get('api/customers.php?search=' + q).then(function(res) {
            if (res.data.status === 'success') {
                $scope.customers = res.data.customers;
            }
        });
    };

    $scope.openAddForm = function() {
        $scope.form = {};
        $scope.errorMessage = '';
        $scope.successMessage = '';
        $scope.showForm = true;
    };

    $scope.editCustomer = function(c) {
        $scope.form = angular.copy(c);
        $scope.errorMessage = '';
        $scope.successMessage = '';
        $scope.showForm = true;
    };

    $scope.saveCustomer = function() {
        $scope.errorMessage = '';
        $scope.successMessage = '';
        const method = $scope.form.customer_id ? 'PUT' : 'POST';

        $http({ method: method, url: 'api/customers.php', data: $scope.form }).then(function(res) {
            if (res.data.status === 'success') {
                $scope.successMessage = res.data.message;
                $scope.showForm = false;
                $scope.form = {};
                $scope.loadCustomers();
            } else {
                $scope.errorMessage = res.data.message || 'Save failed.';
            }
        }, function(err) {
            $scope.errorMessage = (err.data && err.data.message) ? err.data.message : 'Error saving customer.';
        });
    };

    $scope.deleteCustomer = function(id) {
        if (!confirm('Delete this customer record?')) return;
        $http.delete('api/customers.php?customer_id=' + id).then(function(res) {
            if (res.data.status === 'success') {
                $scope.successMessage = res.data.message;
                $scope.loadCustomers();
            }
        });
    };

    $scope.loadCustomers();
});