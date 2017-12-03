/*
 * Copyright 2017 Raphael Guntersweiler
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

const debug = require('debug')('FileBrowser:App');
const config = require('config');

const express = require('express');
const hbs = require('express-hbs');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const multer = require('multer');
const HandleRender = require('./ui/handlebar-renderer');
const HandleHelpers = require('./ui/handlebar-helpers');

debug('Creating Express app...');
let app = express();

debug('Configuring Express app...');
app.set('views', path.join(__dirname, config.get('internals.dirs.views')));

debug('Configuring Handlebars and Handlebars Helpers...');
let hbsEngine = hbs.express4({
    defaultLayout: path.join(__dirname, config.get('internals.dirs.hbs.defaultLayout')),
    partialsDir: path.join(__dirname, config.get('internals.dirs.hbs.partials')),
    layoutsDir: path.join(__dirname, config.get('internals.dirs.hbs.layouts'))
});
require('handlebars-helpers')({ handlebars: hbs.handlebars });
HandleHelpers.registerHelperMethods(hbs.handlebars);

app.engine('hbs', hbsEngine);
app.set('view engine', 'hbs');

debug('Configuring middleware...');
app.use(logger('dev'));
app.use(bodyParser.json({ limit: config.get('server.upload.limit') }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.enable('trust proxy');

debug('Configuring static resource routes...');
const staticRoutes = require(path.join(__dirname, config.get('internals.dirs.staticRoutes')));
for (let source in staticRoutes) {
    let route = staticRoutes[source];
    debug(` - Mounting route for ${source} to ${route}`);
    app.use(route, express.static(path.join(__dirname, source)));
}

debug('Configuring routes...');
const routes = require(path.join(__dirname, config.get('internals.dirs.routes')));
for (let source in routes) {
    let route = routes[source];
    debug(` - Mounting route for ${source} to ${route}`);
    app.use(route, require(path.join(__dirname, source)));
}

debug('Configuring Error Handler...');
// 404 Handler
// TODO: Make it better, don't use the default error handler for this
app.use((req, res, next) => {
    let err = new Error('not found');
    err.status = 404;
    next(err);
});

// Default Error Handler
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'dev' ? err : {};
    res.locals.config = config;
    res.locals.title = '!!! PANIC !!!';

    res.status(err.status || 500);
    HandleRender.render(res, 'error', 'Error');
});

module.exports = app;
