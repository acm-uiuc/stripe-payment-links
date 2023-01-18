const hogan = require('hogan-express');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const baseURL = process.env.baseURL || 'go.acm.illinois.edu';
const favicon = require('serve-favicon');
const sqlite3 = require('sqlite3')
const dbVendor = process.env.DB_VENDOR;
const config = require('./config');
const passport = require('passport')
const fetch = require('node-fetch')
var OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
var cookieParser = require('cookie-parser');
const atob = require('atob');

require('dotenv').config()
console.log("Node env: ", process.env.NODE_ENV)
if (dbVendor === "postgresql") {
  console.error("SQL support not yet implemented")
  process.exit(2)
} else {
  var db = new sqlite3.Database(process.env.DB_FILE, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
  })
  var store = new SQLiteStore({'dir': process.env.SESSION_DB_FILE_LOC, 'db': process.env.SESSION_DB_FILE_NAME});
}
var app = express();
var server = app.listen(9215, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Listening on port %s', port);
});
app.set('view engine', 'html');
app.set('views', require('path').join(__dirname, '/view'));
app.engine('html', hogan);

// Create a session-store to be used by both the express-session
// middleware and the keycloak middleware.
function makeSecret() {
  const length = 64;
  let result           = '';
  const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]\;\',./<>?:"{}|';
  const charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
function getRandomURL() {
  const length = 6;
  let result           = '';
  const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
const secret = process.env.NODE_ENV === "development" ? "secret" : makeSecret()
app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: true,
  store: process.env.NODE_ENV === "development" ? undefined : store
}));

//-----------------------------------------------------------------------------
// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session.  Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.
//-----------------------------------------------------------------------------
passport.serializeUser(function(user, done) {
  done(null, user.oid);
});

passport.deserializeUser(function(oid, done) {
  findByOid(oid, function (err, user) {
    done(err, user);
  });
});

// array to hold logged in users
var users = [];

var findByOid = function(oid, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.oid === oid) {
      return fn(null, user);
    }
  }
  return fn(null, null);
};
getUserGroups = async (oid, accessToken) => {
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
  const requestOptions = {
    method: 'GET',
    headers: headers,
    redirect: 'follow'
  };
  return await fetch(`https://graph.microsoft.com/v1.0/users/${oid}/transitiveMemberOf/microsoft.graph.group?$select=displayName`, requestOptions)
  .then(response => response.json())
  .then(result => {
    const groups = result.value;
    const cleanGroups = groups.map(x => x["displayName"])
    return cleanGroups
  })
  .catch(error => console.log('error', error));
}

var gat = "";
passport.use(new OIDCStrategy(config.creds,
function(iss, sub, profile, accessToken, refreshToken, done) {
  if (!profile.oid) {
    return done(new Error("No oid found"), null);
  }
  // asynchronous verification, for effect...
  process.nextTick(function () {
    findByOid(profile.oid, async function(err, user) {
      if (err) {
        return done(err);
      }
      gat = accessToken;
      profile._json.groups = await getUserGroups(profile.oid, accessToken)
      users.push(profile);
      return done(null, profile);
    });
  });
}
));
app.use(cookieParser());
app.use(express.urlencoded({ extended : true }));
app.use(express.json())
app.use(passport.initialize());
app.use(passport.session());
app.use(favicon(__dirname + '/public/img/favicon.ico'));
app.use('/static', express.static('public'))
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
};


async function addURLToDB(name, url, email, groups) {
  return new Promise(function(resolve, reject) {
    db.serialize(function() {
      const stmt = db.prepare("INSERT INTO urlData (name, url, email, groups) VALUES (?, ?, ?, ?)");
      stmt.run([name, url, email, groups], function(err) {
        if (err) {
          reject(err)
        } else {
          resolve({name, url, email})
        }
      })
    })
  })
}
async function getDataForEmail(email) {
  return new Promise(function(resolve, reject) {
    db.serialize(function() {
      const stmt = db.prepare("SELECT * FROM urlData WHERE email=?");
      stmt.all([email], function(err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  })
}

async function getDelegatedLinks(userGroups) {
  return new Promise(function(resolve, reject) {
    db.serialize(function() {
      const stmt = db.prepare("SELECT * FROM urlData;");
      stmt.all([], function(err, allData) {
        if (err) {
          reject(err)
        } else {
          allData = allData.map(item => {
            if (item.groups === null) {
              return item;    
            }
            item.groups = item.groups.split(','); 
            return item;
          })
          const data = allData.filter(item => {
            let compareGroups = []
            if (item.groups !== null) {
              compareGroups = item.groups
            }
            const mergedArray = userGroups.filter(value => compareGroups.includes(value));
            return mergedArray.length > 0 
          })
          resolve(data)
        }
      })
    })
  })
}

async function removeURLfromDB(name) {
  return new Promise(function(resolve, reject) {
    db.serialize(function() {
      const stmt = db.prepare("DELETE FROM urlData WHERE name=?");
      stmt.run([name], function(err) {
        if (err) {
          reject(err)
        } else {
          resolve(name)
        }
      })
    })
  })
}
async function getRedirectURL(name) {
  return new Promise(function(resolve, reject) {
    db.serialize(function() {
      const stmt = db.prepare("SELECT url FROM urlData WHERE name=?");
      stmt.all([name], function(err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  })
}
async function updateRecord(name, url) {
  return new Promise(function(resolve, reject) {
    db.serialize(function() {
      const stmt = db.prepare("UPDATE urlData SET url=?, name=? WHERE name=?");
      stmt.run([url, name, name], function(err) {
        if (err) {
          reject(err)
        } else {
          resolve({name, url})
        }
      })
    })
  })
}

app.get('/login',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect', 
      { 
        response: res,                      // required
        resourceURL: config.resourceURL,    // optional. Provide a value if you want to specify the resource.
        customState: 'my_state',            // optional. Provide a value if you want to provide custom state value.
        failureRedirect: '/error',
        useCookieInsteadOfSession: true,
        domain_hint: 'acm.illinois.edu'
      }
    )(req, res, next);
  },
  function(req, res) {
    res.redirect('/');
});
app.get('/error', (req, res) => {
  res.status(500).send("An error occurred.")
}

);
// 'GET returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// query (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
app.get('/auth/openid/return',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect', 
      { 
        response: res,    // required
        failureRedirect: '/'  
      }
    )(req, res, next);
  },
  function(req, res) {
    res.redirect('/');
  });

// 'POST returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// body (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
app.post('/auth/openid/return',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect', 
      { 
        response: res,    // required
        failureRedirect: '/'  
      }
    )(req, res, next);
  },
  function(req, res) {
    res.redirect('/create');
  });

// 'logout' route, logout from passport, and destroy the session with AAD.
app.get('/logout', function(req, res){
  req.session.destroy(function(err) {
    req.logOut();
    res.redirect(config.destroySessionUrl);
  });
});
function intersect_safe(a, b)
{
  var ai=0, bi=0;
  var result = [];

  while( ai < a.length && bi < b.length )
  {
     if      (a[ai] < b[bi] ){ ai++; }
     else if (a[ai] > b[bi] ){ bi++; }
     else /* they're equal */
     {
       result.push(a[ai]);
       ai++;
       bi++;
     }
  }

  return result;
}


// group access check
app.use(async (req, res, next) => {
  console.log("Checking access");
  if (!req.user) {return next();}
  req.user._json.groups = await getUserGroups(req.user.oid, gat);
  const intserect = intersect_safe(config.groups_permitted, req.user._json.groups)
  if (intserect.length == 0){
    return res.send('You are not a member of an authorized group. You must be a member of the Azure AD group(s): ' + config.groups_permitted.toString() + ". If you believe this is in error , navigate to /logout and try again.")
  }
  next();
})

// begin business logic

app.get('/', async function (req, res) {
  if (req.isAuthenticated()) { return res.redirect('/create') }
  res.render('home.html');
  return
})

app.get('/create', ensureAuthenticated, async function (req, res) {
  res.render('index.html', { email: req.user._json.preferred_username, name: req.user.displayName, baseURL, userGroups: req.user._json.groups !== undefined ? req.user._json.groups.map((item) => {return {group: item}}) :  {}})
  return
})

app.post('/addURL', ensureAuthenticated, async function (req, res) {
  const email = req.user._json.preferred_username;
  const url = req.query.url;
  const name = req.query.name;
  const groups = req.body.groups
  if (url.indexOf(baseURL) > -1 ) {
    res.json({
      message: `The origin URL cannot be a path of ${baseURL}`
    })
    return
  }
  if (url === undefined || name === undefined) {
    res.status(400).json({
      message: "Either url or name was not provided."
    })
    return
  }
  addURLToDB(name, url, email, groups).then((obj) => {
    res.json({
      url: obj.url,
      shortURL: `https://go.epochml.org/${obj.name}`,
      email: obj.email,
      groups: groups
    });
  }).catch((err) => {
    if (err.errno == 19) {
      res.status(409).json({
        message: "This short URL has already been taken. Please try another."
      })
    } else {
      res.status(500).json({
        message: "The short URL could not be added. Please try again."
      })
    }

  })
  return

});

app.get('/mylinks', ensureAuthenticated, async function (req, res) {
  const email = req.user._json.preferred_username;
  const name = req.user.displayName;
  const userGroups =  req.user._json.groups !== undefined ? req.user._json.groups : [];
  let data = await getDataForEmail(email).catch(() => {res.status(500).render('500'); return});
  data = data.map((item) => {
    const d = item;
    d.url = atob(d.url);
    d.groups = d.groups.replace(',', "<br />")
    return d;
  })
  let delegatedLinks = await getDelegatedLinks(userGroups).catch(() => {res.status(500).render('500'); return});
  delegatedLinks = delegatedLinks.map((item) => {
    const d = item;
    d.url = atob(d.url);
    return d;
  })
  delegatedLinks = delegatedLinks.filter(word => word.email != email);
  res.render('mylinks', {
    data,
    name,
    email,
    baseURL,
    delegatedLinks
  })
})

app.delete('/deleteLink', ensureAuthenticated, async function (req, res) {
  const name = req.query.name;
  removeURLfromDB(name).then(() => {
    res.json({
      name, deleted: true
    })
    return
  }).catch(() => {
    res.status(500).json({
      message: "Could not delete the link. Please try again."
    })
    return
  })
})
app.put('/updateLink', ensureAuthenticated, async function (req, res) {
  const name = req.query.name;
  const url = req.query.url;
  if (url.indexOf(baseURL) > -1 ) {
    res.json({
      message: `The origin URL cannot be a path of ${baseURL}`
    })
    return
  }
  updateRecord(name, url).then((data) => {
    res.json(data);
    return;
  }).catch(() => {
    res.status(500).json({
      message: "Could not update the link. Please try again."
    })
    return
  })
})
app.get('/getRandomURL', ensureAuthenticated, async function (req, res) {
  let exists = true;
  let generatedURL = '';
  let i = 0;
  while(exists) {
    try {
      generatedURL = getRandomURL();
      const url = await getRedirectURL(generatedURL);
      exists = url[0] !== undefined;
      if (i > 10) {
        throw new Error("In a generation loop, must exit.")
      }
    } catch {
      res.status(500).json({success: false})
      return
    }
  }
  try {
    if (generatedURL !== '') {
      res.json({success: true, generatedURL})
      return
    }
    throw new Error("Did not actually generate a new URL.")
  } catch {
    res.status(500).json({success: false})
    return
  }
})
app.get('/:id', async function (req, res) {
  const name = req.params.id;
  const ts = Date.now();
  try {
    const url = await getRedirectURL(name)
    if (url[0] !== undefined) {
      res.redirect(atob(url[0].url))
      return
    } else {
      res.status(404).render('404')
      return
    }
  } catch {
    res.status(500).render('500')
    return
  }

})
