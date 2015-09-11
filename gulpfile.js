var gulp = require('gulp');
var gulpwatch = require('gulp-watch');

gulp.task('default', ['foo','watch'],function() {
  console.log("im here");
});

gulp.task('watch', function() {
  var jsfolder = "*.js"
  gulp.watch(jsfolder,function(){
  	console.log("iwassaved")
  });
});

gulp.task('foo', function() {
  console.log("bar");
});

//mongodb://heroku_71s3r4fg:ajsmgk3917b19t0jksj5rbk1gu@ds039421.mongolab.com:39421/heroku_71s3r4fg