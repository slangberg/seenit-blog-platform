


// var setUp = function(app){
// var mongoose = require('mongoose');
//   mongoose.connect('mongodb://localhost/test');
//   var db = mongoose.connection;
//   db.on('error', console.error.bind(console, 'connection error:'));
//   db.once('open', function (callback) {
//     var blogSchema = mongoose.Schema({
//       title:  String,
//       tagline: String,
//       url:   String,
//       redditdata:  {
//         username:String,
//         id:String,
//       },
//       lastupdate: { type: Date, default: Date.now },
//       posts:[{
//           id: String,
//           sourceurl: String,
//           imgurl: String,
//           permalink: String,
//           title: String,
//           cat: String,
//         }]
//     });

//     var Blog = mongoose.model('Blog', blogSchema);
//     app.locals.blogObj = Blog;
//   });
// }

var test = function(){
  console.log("test");
}


module.exports.test = test;
