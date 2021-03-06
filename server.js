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
var MongoStore = require('connect-mongo')(session);


console.log(process.env.MONGOLAB_URI);

//this sets the local database also stuff for herkcu
if(_.isUndefined(process.env.MONGOLAB_URI)){
  mongourl = 'mongodb://localhost/test';
}

else {
  mongourl = process.env.MONGOLAB_URI;
}


mongoose.connect(mongourl);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  // this sets up the stucutre  of  a single blog this is the docuemnt in mongo
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


 //using mongopos this sets up an object you read from and write to
  var Blog = mongoose.model('Blog', blogSchema);
  //sores it in app locals a constant
  app.locals.blogObj = Blog;
});


//this is is a method to read from mongo and return result into a call back
var findRecord = function (username,callback){
  console.log('find for username: '+username);
  //looks for blog docuemnts that match username
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


//this is is a method to write to mongo and return result into a call back


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
  secret: 'keyboard cat',
  //this sets up a session store in mongo, i know this is probably very wrong
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));

app.listen(8080);
app.locals.tempposts = [];


//this is setup to get subpages to link to assets do to a werid pathing thing, also prob wrong
app.use(function (req, res, next) {
  req.sourceurl = req.protocol + '://' + req.get('host');
  next();
});


//this get a users post from sessionsn, i think as a way to prevent non signed in users acesssing end point
app.get("/json",function(req,res){
  if(req.session.posts){
    res.json(req.session.posts);
  }

  else {
    res.status(400).json({ error: 'no posts' })
  }
});
-

//point to routes for each blog
app.get("/b/:url/",findByUrl,function(req,res){
  if(req.blog){
    req.session.username = req.blog.redditdata.username;
    req.session.posts = req.blog.posts
    res.render('blog', { //this adds locals including the asset path
      title: req.blog.title,
      data: req.blog,
      url: req.sourceurl,
    })
  }

  else{
    res.render('404', {
      url: req.sourceurl,
    })
  }
});


//go to a post page

app.get("/b/:url/:posturl",function(req,res){
  findBlog('url',req.params.url,function(blog){
    if(blog){
      req.session.username = blog.redditdata.username;
      req.session.posts = blog.posts
      var post = _.find(req.session.posts, function(post){ return post.url == req.params.posturl});

      res.render('post', {
        title: blog.title,
        data: post,
        blogurl:req.sourceurl+"/b/"+blog.url,
        url: req.sourceurl,
      })
    }

    else{
      res.render('404', {
        url: req.sourceurl,
      })
    }
  });
});


//this checks to see if a user submitted blog url is avaible
app.post('/checkurl', isAuthJson, function (req, res) {
  var url = req.body.url
  findBlog('url',url,function(status){
    if(status){
      res.json({notavailble:true})
    }

    else{
      res.json({notavailble:false})
    }
  });
});

//this is the delete route
app.post('/removeuser', isAuthJson, function (req, res) {
  //this log url chian is cause the passsport user app was not persisting data off keys
  removeRecord(req.session.passport.user.name);
  res.json({removed:true})
});

//this fuction adds posts
app.post('/addposts', isAuthJson,findByUsername, function (req, res) {
  getLatest(req.session.passport.user.name,function(data){
    var newposts = returnRole(data.data.children);
    var oldposts = req.blog.posts

    //this will only save new posts
    _.each(newposts,  function(newpost) {
     if(!_.find(oldposts, function(post){ return post.id == newpost.id })){
        req.blog.posts.unshift(newpost)
     }
    });

    req.blog.save(function (err, blog) {
      if (err) return console.error(err);
      console.log("saved");
      res.json(blog)
    });
  });
});
//this will create a new doucment in the store
app.post('/setupuser', isAuthJson, function (req, res) {
  blogdata = req.body.blogdata
  app.locals.currblog = new app.locals.blogObj({
    title:  blogdata.title,
    tagline: blogdata.tagline,
    url: blogdata.url,
    redditdata:  {
      username:req.session.passport.user.name,
    },
  });

  getCollection(req.session.passport.user.name,{},function(data){
    app.locals.currblog.posts = data;
    saveRecord(app.locals.currblog);
    res.json({data:app.locals.currblog});
  });
});

//for acount page
app.get("/account",isAuthHtml,findByUsername, function(req,res){
  if(!req.blog){
    res.render('setupaccount', {
      title: "Setup Account For "+req.session.passport.user.name,
      username: req.session.passport.user.name,
      url: req.sourceurl,
    })
  }

  else {
    res.render('account', {
      title: "Account For "+req.session.passport.user.name,
      username: req.session.passport.user.name,
      url: req.sourceurl,
    })
  }
});


// gets the current usersn blog
app.get("/currentuser",isAuthJson,findByUsername, function(req,res){
  if(req.blog){
   res.json(req.blog);
  }

  else{
    res.status(400).json({ error: 'Database Error' });
  }
});

app.get("/login",function(req,res){
  res.render('signin', {
    title: "Sign In",
    url: req.sourceurl
  })
});

app.get("/",function(req,res){
  res.render('index', {
    title: "Blog",
    url: req.sourceurl}
  );
});

app.get('/auth/reddit', passport.authenticate('reddit'));

app.get('/auth/reddit/callback', passport.authenticate('reddit', {
  successRedirect: '/account',
  failureRedirect: '/login'
}));

app.get('/logout', function(req, res){
  req.logout();
  delete req.session.passport;
  res.redirect('/login');
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

//pasport is a oauth tokens  manamge
passport.use(new RedditStrategy({
    clientID: keys.keys.id,
    clientSecret: keys.keys.secret,
    callbackURL: "http://127.0.0.1:8080/auth/reddit/callback",
    state: true
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

function isAuthHtml(req, res, next) {
  if(_.isUndefined(req.session.passport)){
    res.redirect('/login');
  }
  else{ return next(); }
}

function isAuthJson(req, res, next) {
  if(_.isUndefined(req.session.passport)){
    res.status(400).json({ error: 'Not Logged In' })
  }
  else{ return next(); }
}

function findByUsername(req, res, next) {
  findBlog('username',req.session.passport.user.name,function(blog){
    if(blog){
      req.blog = blog;
    }

    else {
      blog = false;
    }
    next();
  });
}

function findByUrl(req, res, next) {
  findBlog('url',req.params.url,function(blog){
    if(blog){
      req.blog = blog;
    }

    else {
      blog = false;
    }
    next();
  });
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

var getCollection = function(username,options,callback){
  if(!options.after){
    url = '/user/'+username+'/submitted.json?limit=100';
  }

  else {
    url = '/user/'+username+'/submitted.json?limit=100&after='+options.after;
  }

  reddit.get(url, function(err, response) {
    if(err) console.log(err);
    options.after = response.data.after;
    console.log(options.after+": "+response.data.children.length);
    app.locals.tempposts.push(returnRole(response.data.children));
    if(options.after){
      getCollection(username,options,callback);
    }

    else {
      app.locals.tempposts = _.flatten(app.locals.tempposts);
      callback(app.locals.tempposts);
      app.locals.tempposts = [];
    }
  });
}

var getLatest = function(username,callback){
  reddit.get('/user/'+username+'/submitted.json?limit=25', function(err, response) {
    if(err) console.log(err);
    else{
      callback(response);
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
