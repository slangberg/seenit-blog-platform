var url = require('url');
var request = require('request');
var express = require('express');
var download = require('simpledownload');
var fs = require("fs");
var imgsizer = require('lwip')
var reddit = require('redditor');
var _ = require('underscore');
var bodyParser = require('body-parser')
var Store = require('data-store');
var store = new Store('blogdata', {cwd: 'sitedata'});

var app = express();
app.use(bodyParser.json());
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/public',  express.static(__dirname + '/public'));

app.locals.blogData = {
  posts: [],
}

app.locals.loggedin = false;


app.get("/json",function(req,res){
  //var submittedURL = url.format(submitted);
  // request(submittedURL, function(error, response, body) {
  //   var posts = JSON.parse(body);
  //   blogData.after_posts = posts.data.after;
  //   blogData.before_posts = posts.data.before;
  //   returnRole(posts.data.children);
  //   res.send(blogData);
  // });
    res.send(store.get('test'));
});


app.post('/checkuser', function (req, res) {
  checkuser(req.body.data,function(redditclient){
    if(!redditclient){
      res.status(400).json({ error: 'Not Valid Login' })
    }

    else {
      console.log('good');
      app.locals.redditClient = redditclient;
      app.locals.loggedin = true;
      res.json({status:"ok"});
    }
  });  
});


app.get("/account",function(req,res){
  if(app.locals.loggedin) {
    res.sendFile(__dirname + "/account.html");
  }
  else {
    res.redirect('/signin');
  }

});

app.get("/signin",function(req,res){
  res.sendFile(__dirname + "/signin.html");
});


app.get("/",function(req,res){
  store.set('test','test string');
  res.sendFile(__dirname + "/index.html");
});


var checkuser = function(userdata,callback){
    reddit({ username: userdata.name, password: userdata.pass}, function(err, authorized) {
      if(err) {
        console.log(err);
        callback(false);
      }

      else {
        callback(authorized);
      }       
    });
}

var getCollection = function(options,callback){
  if(!options.after){
    url = '/user/qizzer/submitted.json?limit=100';
  }

  else {
    url = '/user/qizzer/submitted.json?limit=100&after='+options.after;
  }

  options.callobj.get(url, function(err, response) {
    if(err) console.log(err);
    options.after = response.data.after;
    console.log(options.after+": "+response.data.children.length);
    app.locals.blogData.posts.push(returnRole(response.data.children));
    if(options.after){
      getCollection(options,callback);
    }

    else {
      app.locals.blogData.posts = _.flatten(app.locals.blogData.posts);
      callback(app.locals.blogData.posts);
    }
  });
}


var returnRole = function(posts,comments){

  var cleaned = []

  _.each(posts, function(post){
    post = post.data;

    if(post.post_hint !== "image"){
      return
    }

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


    cleaned.push(blogObj);
  });


 
  downloadImgs(cleaned);
  return cleaned;

}


var downloadImgs = function(posts){
  _.each(posts, function(post){
    var type = post.imgurl.split('.').pop();
    type = type.split('?')[0];
    var name = post.title.replace(" ", "-");
    var url = '/public/images/'+post.id+"."+type;

    fs.open(__dirname + url, "r+", function(error, fd){
      if(error){
        download(post.imgurl, __dirname + url, function (err) {
          if (err){
            console.log("download")
            console.log(err);
            return;
          } 
    
          imgsizer.open(__dirname + url, function(err, image){
            if (err){
              console.log("sizer open");
              console.log(err);
              return;
            } 

            if(image.width() > 980){
              var shrinkval = 980/image.width();
              var newheight = Math.round(image.height()*shrinkval);
              image.resize(980, newheight, function(err,image){
                image.writeFile(__dirname + url, function(err){
                  if (err){
                    console.log("sizer write");
                    console.log(err);
                    return;
                  } 

                  post.localimgurl = url;
                });
              });
            }
          });
        });
      }

      else{
        imgsizer.open(__dirname + url, function(err, image){
          post.localimgurl = url;
        });
      }
    });

    
  });


  return posts;
}


app.listen(8080);


