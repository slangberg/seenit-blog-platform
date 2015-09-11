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
