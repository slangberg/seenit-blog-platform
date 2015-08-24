var url = require('url');
var request = require('request');
var express = require('express');
var download = require('simpledownload');
var fs = require("fs");
var imgsizer = require('lwip')
var _ = require('underscore');


var app = express();
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/public',  express.static(__dirname + '/public'));

var submitted = {
  protocol: "http:",
  host: "reddit.com",
  pathname: '/user/qizzer/submitted.json',
};


var blogData = {
  posts: {},
  after_post: null,
  before_post:null,
  after_comments:null,
  before_comments:null,
}


app.get("/json",function(req,res){
  var submittedURL = url.format(submitted);
  
  request(submittedURL, function(error, response, body) {
    var posts = JSON.parse(body);
    blogData.after_posts = posts.data.after;
    blogData.before_posts = posts.data.before;
    returnRole(posts.data.children);
    res.send(blogData);
  });


  
});


app.get("/",function(req,res){
  res.sendFile(__dirname + "/index.html");
});


var returnRole = function(posts,comments){
  var cleaned = _.map(posts, function(post){
    post = post.data;

    if(post.preview){
      var imgurl = post.preview.images[0].source.url;
    }

    else {
      var imgurl = post.url;
    }

    var blogObj = {
      id: post.id,
      sourceurl: post.url,
      imgurl: imgurl,
      permalink: "http://reddit.com"+post.permalink,
      title: post.title,
      cat: post.subreddit
    }


    return blogObj;
  });


 
  var downed = downloadImgs(cleaned);
  blogData.posts = downed;

}


var downloadImgs = function(posts){
  _.each(posts, function(post){
    var type = post.imgurl.split('.').pop();
    type = type.split('?')[0];
    var name = post.title.replace(" ", "-");
    var url = '/public/images/'+name+"."+type;

    fs.open(__dirname + url, "r+", function(error, fd){
      if(error){
        download(post.imgurl, __dirname + url, function (err) {
          if (err){
            console.log("download")
            console.log(err);
            post.localimgurl = post.url;
            return;
          } 
    
          imgsizer.open(__dirname + url, function(err, image){
            if (err){
              console.log("sizer open");
              console.log(err);
              return;
            } 

            if(image.width() > 980){
              var shrinkval = image.width() - 980;
              image.resize(980, image.height() - shrinkval, function(err,image){
                image.writeFile(__dirname + url, function(err){
                  if (err){
                    console.log("sizer write");
                    console.log(err);
                    return;
                  } 
                });
              });
            }
          });
        });
      }

      else{
        imgsizer.open(__dirname + url, function(err, image){
          console.log(image.width());
        });
      }
    });

    post.localimgurl = url;
  });


  return posts;
}


app.listen(8080);


