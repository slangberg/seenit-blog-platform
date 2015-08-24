var app = angular.module('reddi-app', []);

app.controller('MainCtrl', ['$scope','$rootScope', function($scope,$rootScope) {
 
}]);

app.directive('blogroll', function() {
  return {
    restrict: 'AE',
    controller:'blogRollCtrl'
  };//end return
});


app.controller('blogRollCtrl',['$scope','$element','$http', function($scope,$element,$http) {
	$http.get(window.location.href+'json').success(function(data) {
    	$scope.postsData = data.posts;
  	})
}]);