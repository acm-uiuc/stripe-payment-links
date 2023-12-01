const hogan = require('hogan-express');
const express = require('express');
const session = require('cookie-session');
const favicon = require('serve-favicon');
const passport = require('passport')
const Joi = require('joi'); 
const fetch = require('node-fetch')
var OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
var cookieParser = require('cookie-parser');

const config = require('./config');

require('dotenv').config()
const { BASE_PROTO } = process.env;
const baseURL = process.env.BASE_URL;

if (!baseURL || !BASE_PROTO) {
  console.error("ERROR: Cannot find base URL or protocol, exiting...");
  return;
} else {
  console.log(`Running at ${BASE_PROTO}://${baseURL}`)
}

console.log("Node env: ", process.env.NODE_ENV)


var app = express();
var server = app.listen(9215, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Listening on port %s', port);
});
app.set('view engine', 'html');
app.set('views', require('path').join(__dirname, '/view'));
app.engine('html', hogan);
const partials = {
  smallNavbar: 'components/smallNavbar',
  fullNavbar: 'components/fullNavbar',
  footer: 'components/footer',
}

// Create a session-store to be used by both the express-session
// middleware and the keycloak middleware.

function getRandomURL() {
  const length = 6;
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
const secret = process.env.COOKIE_KEY || "secret";
app.use(session({
  secret: secret,
}));


//-----------------------------------------------------------------------------
// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session.  Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.
//-----------------------------------------------------------------------------
passport.serializeUser(function (user, done) {
  done(null, user.oid);
});

passport.deserializeUser(function (oid, done) {
  findByOid(oid, function (err, user) {
    done(err, user);
  });
});

// array to hold logged in users
var users = [];

var findByOid = function (oid, fn) {
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
      let groups;
      let cleanGroups;
      try {
        groups = result.value;
        cleanGroups = groups.map(x => x["displayName"])
        return cleanGroups
      } catch (e) {
        console.error(e);
        return [];
      }

    })
    .catch(error => console.log('error', error));
}

var gat = "";
passport.use(new OIDCStrategy(config.creds,
  function (iss, sub, profile, accessToken, refreshToken, done) {
    if (!profile.oid) {
      return done(new Error("No oid found"), null);
    }
    // asynchronous verification, for effect...
    process.nextTick(function () {
      findByOid(profile.oid, async function (err, user) {
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
app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(passport.initialize());
app.use(passport.session());
app.use(favicon(__dirname + '/public/img/favicon.ico'));
app.use('/static', express.static('public'))

async function ensureAuthenticated(req, res, next) {
  if (!req.user) { return res.redirect('/login'); }
  req.user._json.groups = await getUserGroups(req.user.oid, gat);
  const intserect = validateArray(config.groups_permitted, req.user._json.groups);
  if (!intserect && !intersect2) {
    return res.status(401).redirect("/unauthorized");
  }
  next();
};


const stripe = require('stripe')(config.STRIPE_KEY)

app.get('/login',
  function (req, res, next) {
    passport.authenticate('azuread-openidconnect',
      {
        response: res,                      // required
        resourceURL: config.resourceURL,    // optional. Provide a value if you want to specify the resource.
        customState: 'my_state',            // optional. Provide a value if you want to provide custom state value.
        failureRedirect: '/error',
        domain_hint: config.branding.domainHint
      }
    )(req, res, next);
  },
  function (req, res) {
    res.redirect('/');
  });
app.get('/error', (req, res) => {
  res.status(500).send("An error occurred.")
});
app.get('/unauthorized', (req, res) => {
  return res.status(401).render('unauthorized.html', { partials, productName: config.branding.title, logoPath: config.branding.logoPath, copyrightOwner: config.branding.copyrightOwner, statusURL: config.branding.statusURL, orgHome: config.branding.orgHome, groups: config.groups_permitted.toString().replaceAll(",", "<br />") });
});
// 'GET returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// query (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
app.get('/auth/openid/return',
  function (req, res, next) {
    passport.authenticate('azuread-openidconnect',
      {
        response: res,    // required
        failureRedirect: '/error'
      }
    )(req, res, next);
  },
  function (req, res) {
    res.redirect('/create');
  });

// 'POST returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// body (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
app.post('/auth/openid/return',
  function (req, res, next) {
    passport.authenticate('azuread-openidconnect',
      {
        response: res,    // required
        failureRedirect: '/'
      }
    )(req, res, next);
  },
  function (req, res) {
    res.redirect('/create');
  });

// 'logout' route, logout from passport, and destroy the session with AAD.
app.get('/logout', function (req, res) {
  res.clearCookie('connect.sid', { path: '/' });
  res.clearCookie('session', { path: '/' });
  res.clearCookie('session.sig', { path: '/' });
  req.session = null;
  res.redirect('/');
});

function validateArray(userGroups, accessGroups) {
  for (const item of userGroups) {
    if (accessGroups.includes(item)) {
      return true;
    }
  }
  return false;
}

app.get('/', async function (req, res) {
  if (req.isAuthenticated()) { return res.redirect('/create') }
  res.render('home.html', { partials, productName: config.branding.title, logoPath: config.branding.logoPath, copyrightOwner: config.branding.copyrightOwner, statusURL: config.branding.statusURL, orgHome: config.branding.orgHome, loginProvider: config.branding.loginProvider });
})

app.get('/create', ensureAuthenticated, async function (req, res) {
  res.render('index.html', { 
    partials,
    productName: config.branding.title,
    logoPath: config.branding.logoPath,
    copyrightOwner: config.branding.copyrightOwner,
    statusURL: config.branding.statusURL,
    orgHome: config.branding.orgHome,
    email: req.user._json.preferred_username,
    name: req.user.displayName,
    baseURL,
    userGroups: req.user._json.groups !== undefined ? req.user._json.groups.map((item) => { return { group: item } }) : {},
  })
})

app.post('/paylink', ensureAuthenticated, async function (req, res) {
  const schema = Joi.object().keys({
    amnt: Joi.number().greater(0.5).required(),
    invoice: Joi.string().required(),
    contactName: Joi.string().required(),
    contactEmail: Joi.string().email().required()
  })
  const { body } = req;
  const {error} = schema.validate(body);
  const valid = error === null;
  if (!valid) {
    return res.status(422).json({
      success: false,
      message: error.details[0].message
    })
  }
  try {
    const email = req.user._json.preferred_username;
    const { amnt, invoice, contactName, contactEmail } = req.body
    const description = `Payment for Invoice ID ${invoice} \nContact Name: ${contactName}\nContact Email: ${contactEmail}\nCreated By: ${email}`
    const product = await stripe.products.create({
      name: `Payment for Invoice: ${invoice}`,
      description
    });
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: amnt * 100,
      product: product.id
    })
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
    });
    console.log(paymentLink.url)
    return res.json({
      success: true,
      message: paymentLink.url
    })
  } catch {
    return res.status(500).json({
      success: false,
      message: "Could not create link."
    })
  }

});

