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


app.directive('setup', function() {
  return {
    restrict: 'AE',
    controller:'setupCtrl'
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
        $window.location.href = "/account";
      })
      .error(function(data, status) {
        $scope.errormsg = "Not Valid Login"
      })
    }
  }
}]);

app.controller('setupCtrl',['$scope','$element','$http',function($scope,$element,$http) {
  $scope.setupUser = function(blog){
    if(!blog.name || !blog.url){
      $scope.errormsg = "Need Name Need Url"
    }

    else{
      $http.post('/setupuser', {blogdata:blog}).success(function(data) {
        console.log(data);
      })
      .error(function(data, status) {
        $scope.errormsg = "Sonmthing Went Wrong"
      })
    }
  
  }
}]);


app.filter('sanitizeUrl', function () {
  return function (text) {
      var str = text.replace(/\s+/g, '-');
      //str = str.replace(/[^\w\s]/gi, '')
      return str;
  };
})
