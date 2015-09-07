var url = require('url');
var express = require('express');
var download = require('simpledownload');
var fs = require("fs");
var imgsizer = require('lwip')
var reddit = require('redditor');
var _ = require('underscore');
var bodyParser = require('body-parser')
var passport = require('passport')
var RedditStrategy = require('passport-reddit').Strategy;
var session = require('express-session')
var keys = require('./redditkeys.js')


// database ==================================
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

var removeRecord = function(username){
 app.locals.blogObj.findOne({ 'redditdata.username': username }).remove().exec();
}


// express ==================================
var app = express();

app.set('view engine', 'jade');
app.use('/bower_components',  express.static('bower_components'));
app.use('/public',  express.static('public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'keyboard cat'
}));


app.listen(8080);

app.locals.loggedin = false;
app.locals.tempposts = [];
app.locals.user = {};

app.get("/json",function(req,res){
  if(req.session.posts){
    res.json(req.session.posts);
  }
  
  else {
    res.status(400).json({ error: 'no posts' })
  }
});


app.get("/b/:url/",function(req,res){
  findBlog('url',req.params.url,function(blog){ 
    if(blog){
      req.session.username = blog.redditdata.username;
      req.session.posts = blog.posts
      res.render('blog', {
        title: blog.title,
        data: blog,
        url: req.get('host'),
      })
    }

    else{
      res.render('404', { 
        url: req.get('host'), 
      })
    }
  });
});


app.get("/b/:url/:posturl",function(req,res){
  findBlog('url',req.params.url,function(blog){ 
    if(blog){
      req.session.username = blog.redditdata.username;
      req.session.posts = blog.posts

      var post = _.find(req.session.posts, function(post){ return post.url == req.params.posturl});

      res.render('post', {
        title: post.title,
        data: post,
        url: req.get('host'),
      })
    }

    else{
      res.render('404', { 
        url: req.get('host'), 
      })
    }
  });
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

app.post('/checkurl', function (req, res) {
  if(app.locals.loggedin) {
    var url = req.body.url
    findBlog('url',url,function(status){ 
      if(status){
        res.json({notavailble:true})
      }

      else{
        res.json({notavailble:false})
      }
    });
  }
  else {
    res.status(400).json({ error: 'Not Logged In' })
  }
});



app.post('/removeuser', function (req, res) {
  if(app.locals.loggedin) {
    removeRecord(app.locals.user.name);
    res.json({removed:true})
  }
  else {
    res.status(400).json({ error: 'Not Logged In' })
  }
});


app.post('/setupuser', function (req, res) {
  if(app.locals.loggedin) {
    blogdata = req.body.blogdata
    app.locals.currblog = new app.locals.blogObj({
      title:  blogdata.title,
      tagline: blogdata.tagline,
      url: blogdata.url,
      redditdata:  {
        username:app.locals.user.name,
        id:app.locals.user.id,
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

app.get("/account",ensureAuthenticated, function(req,res){
  findRecord(app.locals.user.name,function(blog){
    if(!blog){
      res.render('setupaccount', { 
        title: "Setup Account For "+app.locals.user.name, 
        username: app.locals.user.name,
        url: req.get('host'),
      })
    }

    else {
      res.render('account', { 
        title: "Account For "+app.locals.user.name, 
        username: app.locals.user.name,
        url: req.get('host'), 
      })
    }
  });
});

app.get("/currentuser",function(req,res){
  if(app.locals.loggedin) {

    findRecord(app.locals.user.name,function(blog){

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


app.get("/login",function(req,res){
  res.render('signin', { 
    title: "Sign In",
    url: req.get('host')
  })
});


app.get("/",function(req,res){
  res.render('index', { 
    title: "Blog",
    url: req.get('host')}
  );
});

app.get('/auth/reddit', passport.authenticate('reddit'));

app.get('/auth/reddit/callback', passport.authenticate('reddit', {
  successRedirect: '/account',
  failureRedirect: '/login'
}));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


// passport ==================================

passport.serializeUser(function(user, done) {
  var userdata = {
    id: user.id,
    name: user.name
  }
  done(null, userdata);
});

passport.deserializeUser(function(obj, done) {
  app.locals.loggedin = false;
  app.locals.user = {}
  done(null, obj);
});

passport.use(new RedditStrategy({
    clientID: keys.id,
    clientSecret: keys.secret,
    callbackURL: "http://127.0.0.1:8080/auth/reddit/callback",
    state: true
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      console.log("passport function process")
      app.locals.loggedin = true;
      app.locals.user.name = profile.name;
      app.locals.user.id = profile.id;

      return done(null, profile);
    });
  }
));

function ensureAuthenticated(req, res, next) {
  if(typeof req.session.passport == 'undefined'){
    res.redirect('/login');
  }
  else{ return next(); }
}

// functions ==================================



var findBlog = function(prop,data,callback){
  var searchkey = {
    username: { 'redditdata.username': data },
    url: { 'url': data }
  }
    app.locals.blogObj.findOne(searchkey[prop]).exec(function (err, blogdata) {
      if (err) return handleError(err);
      if(blogdata){
        callback(blogdata);
      }

      else {
        callback(false);
      }
    })
}

var getCollection = function(options,callback){
  if(!options.after){
    url = '/user/'+app.locals.user.name+'/submitted.json?limit=100';
  }

  else {
    url = '/user/'+app.locals.user.name+'/submitted.json?limit=100&after='+options.after;
  }

  reddit.get(url, function(err, response) {
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

    if(!_.isUndefined(post.preview) && !_.isUndefined(post.preview.images[0])){
      var imgurl = post.preview.images[0].source.url;

      var str = post.title.toLowerCase().replace(/\s+/g,'-');
      var url = str.replace(/[^\w\s\-]/gi, '');

      var blogObj = {
        id: post.id,
        sourceurl: post.url,
        imgurl: imgurl,
        permalink: "http://reddit.com"+post.permalink,
        title: post.title,
        thumbnail: post.thumbnail,
        url: url,
        cat: post.subreddit
      }


      cleaned.push(blogObj);
    }

    else {
      return false;
    }

    
  });

  //downloadImgs(cleaned);
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



