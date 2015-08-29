var app = angular.module('reddi-app', []);

app.controller('MainCtrl', ['$scope','$rootScope', function($scope,$rootScope) {
 
}]);

app.directive('blogroll', function() {
  return {
    restrict: 'AE',
    controller:'blogRollCtrl'
  };//end return
});

app.directive('signin', function() {
  return {
    restrict: 'AE',
    controller:'signUpCtrl'
  };//end return
});



app.controller('blogRollCtrl',['$scope','$element','$http', function($scope,$element,$http) {
  $http.get(window.location.href+'json').success(function(data) {
      $scope.postsData = data.posts;
    })
}]);

app.controller('signUpCtrl',['$scope','$element','$http', '$window',function($scope,$element,$http,$window) {
  $scope.submitUserName = function(user){
    if(!user){
      $scope.errormsg = "missing value"
    }
    else {
      $scope.errormsg = "";
    
      $http.post('/checkuser', {data:user}).success(function(data) {
        $window.location.href= "/account";
      })
      .error(function(data, status) {
        $scope.errormsg = "Not Valid Login"
      })
    }
  }
}]);