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



var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  var blogSchema = mongoose.Schema({
    title:  String,
    tagline: String,
    url:   String,
    redditdata:  {
      username:String,
      id:String,
    },
    lastupdate: { type: Date, default: Date.now },
    posts:Array
  });

  blogSchema.methods.testMeth = function () {
    console.log(this.title);
  }

  var Blog = mongoose.model('Blog', blogSchema);
  app.locals.blogObj = Blog;
});


var app = express();
app.use(bodyParser.json());
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/public',  express.static(__dirname + '/public'));
app.set('view engine', 'jade');
app.listen(8080);

app.locals.loggedin = false;
app.locals.tempposts = [];


app.get("/json",function(req,res){

});


app.get("/show",function(req,res){
  app.locals.blogObj.find(function (err, blogs) {
    if (err) return console.error(err);
    res.json(blogs);
  });
});

app.get("/clear",function(req,res){
  app.locals.blogObj.find().remove().exec();
  app.locals.blogObj.find(function (err, blogs) {
    if (err) return console.error(err);
    res.json(blogs);
  });
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

app.post('/setupuser', function (req, res) {
  if(app.locals.loggedin) {
    blogdata = req.body.blogdata
    app.locals.currblog = new app.locals.blogObj({
      title:  blogdata.name,
      tagline: blogdata.tagline,
      url:   String,
      redditdata:  {
        username:app.locals.userdata.name,
        id:app.locals.userdata.id,
      },
    });

    getCollection({callobj:app.locals.redditClient},function(data){
      app.locals.currblog.posts = data;
      saveRecord(app.locals.currblog);
      res.json({data:app.locals.currblog});
    });
  }
  else {
    res.status(400).json({ error: 'Not Logged In' })
  }
});

app.get("/account",function(req,res){

  if(app.locals.loggedin) {
    findRecord(app.locals.userdata.name,function(blog){
      if(!blog){
        res.render('setupaccount', { 
          title: "Setup Account For "+app.locals.userdata.name, 
          username: app.locals.userdata.name, 
        })
      }

      else {
        res.render('account', { 
          title: "Account For "+app.locals.userdata.name, 
          username: app.locals.userdata.name, 
        })
      }
    });
  }
  else {
    res.redirect('/signin');
  }

});

app.get("/currentuser",function(req,res){
  if(app.locals.loggedin) {
    findRecord(app.locals.userdata.name,function(blog){
      
      if(blog){
       res.json(blog);
      }

      else{
        res.status(400).json({ error: 'Database Error' });
      }

    });
  }
  else {
    res.status(400).json({ error: 'Not Logged In' })
  }
});


app.get("/signin",function(req,res){
  res.render('signin', { title: "Sign In"})
});


app.get("/",function(req,res){
  res.render('index', { title: "Blog"})
});


var checkuser = function(userdata,callback){
    reddit({ username: userdata.name, password: userdata.pass}, function(err, authorized) {
      if(err) {
        console.log(err);
        callback(false);
      }

      else {
        authorized.get('/api/me.json', function(err, response) {
          app.locals.userdata = {
            name: response.data.name,
            id: response.data.id
          }
          callback(authorized);
        });
      }       
    });
}

var getCollection = function(options,callback){
  if(!options.after){
    url = '/user/'+app.locals.userdata.name+'/submitted.json?limit=100';
  }

  else {
    url = '/user/'+app.locals.userdata.name+'/submitted.json?limit=100&after='+options.after;
  }

  options.callobj.get(url, function(err, response) {
    if(err) console.log(err);
    options.after = response.data.after;
    console.log(options.after+": "+response.data.children.length);
    app.locals.tempposts.push(returnRole(response.data.children));
    if(options.after){
      getCollection(options,callback);
    }

    else {
      app.locals.tempposts = _.flatten(app.locals.tempposts);
      callback(app.locals.tempposts);
      app.locals.tempposts = [];
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

var findRecord = function (username,callback){
  console.log('find for username: '+username);
  app.locals.blogObj.findOne({ 'redditdata.username': username }).exec(function (err, blog) {
    if (err) return handleError(err);
    if(!blog){
      callback(false);
    }

    else {
      callback(blog);
    }
  })
}

var saveRecord = function(blogObj){
  blogObj.save(function (err, blog) {
    if (err) return console.error(err);
    console.log("blog saved");
    console.log(blog);
  });
}




