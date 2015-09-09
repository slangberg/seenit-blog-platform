var app = angular.module('reddi-app', ['infinite-scroll']);

app.controller('MainCtrl', ['$scope','$rootScope', function($scope,$rootScope) {
 
}]);

app.directive('blogroll', function() {
  return {
    restrict: 'AE',
    controller:'blogRollCtrl'
  };//end return
});

app.directive('setup', function() {
  return {
    restrict: 'AE',
    controller:'setupCtrl'
  };//end return
});


app.directive('account', function() {
  return {
    restrict: 'AE',
    controller:'accountCtrl'
  };//end return
});




app.controller('blogRollCtrl',['$scope','$element','$http', function($scope,$element,$http) {
  
  $http.get('/json').success(function(data) {
    $scope.allposts = data;
    $scope.postsData = $scope.allposts.slice(0, 10);
  })

  var cutindex = 10;

  $scope.getNextSet = function(){
    var nextset = $scope.allposts.slice(cutindex, cutindex+11);
    $scope.postsData = _.union( $scope.postsData,nextset);
    cutindex=cutindex+10;
  }
}]);


app.controller('setupCtrl',['$scope','$element','$http','$window',function($scope,$element,$http,$window) {
  $scope.blog = {
    title:"",
    tagline:"",
    url:""
  }

  $scope.$watch('blog.url', function() {
    if($scope.blog.url && $scope.blog.url){
      console.log("blog url is "+$scope.blog.url)
      var str = $scope.blog.url.toLowerCase().replace(/\s+/g,'-');
      $scope.blog.url = str.replace(/[^\w\s\-]/gi, '')
      $scope.checkUrl($scope.blog.url)
    }
  });


  $scope.checkUrl = function(url){
    $http.post('/checkurl', {url:url}).success(function(data) {
     $scope.notavailble = data.notavailble
    })
    .error(function(data, status) {
      $scope.errormsg = "Sonmthing Went Wrong"
    })
  }

  $scope.isBlank = function(data){
    if(data != ""){return false}
    else {return "has-error"}
  }

  $scope.setupUser = function(blog){

    console.log(blog)
  
    if(!blog.title || !blog.url){
      $scope.errormsg = "Need Name and Need Url"
    }

    else{
      $http.post('/setupuser', {blogdata:blog}).success(function(data) {
        $window.location.href = "/account";
      })
      .error(function(data, status) {
        $scope.errormsg = "Sonmthing Went Wrong"
      })
    }
  
  }
}]);

app.controller('accountCtrl',['$scope','$element','$http','$window',function($scope,$element,$http,$window) {
    $http.get('/currentuser').success(function(data) {
      $scope.userdata = data;
      console.log($scope.userdata);
    }).error(function(data, status) {
      console.error('userdata fail');
    })


    $scope.removeAccount = function(){
      if (confirm("Are You Sure? You will lose all saved data") == true) {
        $http.post('/removeuser', {}).success(function(data) {
          $window.location.reload();
        }).error(function(data, status) {
          $scope.errormsg = "Something Went Wrong"
        })
      }
    }

    $scope.updatePosts = function(){
        $http.post('/addposts', {}).success(function(data) {
          console.log("in");
          console.log(data)
          $scope.userdata.posts = data.posts;
        }).error(function(data, status) {
          $scope.errormsg = "Something Went Wrong"
        })
    }
}]);



app.filter('sanitizeUrl', function () {
  return function (text) {
      var str = text.replace(/\s+/g, '-');
      str = str.replace(/[^\w\s\-]/gi, '')
      return str;
  };
})
