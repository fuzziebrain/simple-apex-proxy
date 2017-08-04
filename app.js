const
  express = require('express'),
  proxy = require('http-proxy-middleware'),
  https = require('https'),
  fs = require('fs'),
  config = require('./config/settings.json')
;

var app = express();

var sslOptions, sslEnabled = config.app.sslEnabled;

if(sslEnabled) {
  sslOptions = {
    key: fs.readFileSync(config.app.keyFilePath),
    cert: fs.readFileSync(config.app.certFilePath)
  };
}

var targetUrl = config.app.targetUrl;

app.get('/', function (req, res, next) {
  res.redirect(config.app.targetPath);
});

app.use(config.app.proxiedPaths, proxy(
  {
    target: targetUrl,
    changeOrigin: true,
    autoRewrite: true,
    xfwd: true,
    protocolRewrite: sslEnabled ? 'https' : 'http',
    onProxyReq: function (proxyReq, req, res) {
      proxyReq.setHeader('origin', targetUrl);
    },
    onProxyRes: function (proxyRes, req, res) {
      if (!req.connection.encrypted && proxyRes.headers['set-cookie']) {
        var cookies = [];
        proxyRes.headers['set-cookie'].forEach(function (element) {
          element = element.replace(' secure;', '');
          cookies.push(element);
        });
        proxyRes.headers['set-cookie'] = cookies;
      }
    }
  }
));

if (sslEnabled) {
  https.createServer(sslOptions, app).listen(process.env.PORT || config.app.serverPort);
} else {
  app.listen(process.env.PORT || config.app.serverPort);
} 