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

const debug = require('debug')('FileBrowser:Routes/FileBrowser');
const config = require('config');
const HandleRender = require('../ui/handlebar-renderer');

const fs = require('fs');
const path = require('path');
const async = require('async');

const router = require('express').Router();
const ROOT = config.get('app.filebrowser.basePath');

function sendFileBrowserResponse(res, path, files, err) {
    res.json({
        ok: (!err),
        error: err,
        fileCount: Object.keys(files).length,
        files: files,
        path: path
    })
}

router.get('/', (req, res) => {
    let scanDir = ROOT;
    if (req.query.path) {
        let queryPath = req.query.path;
        let pathArr = queryPath.split('/').filter((i) => { return !!i && i !== '..'; });
        scanDir = path.join(ROOT, pathArr.join('/'));
    }
    fs.readdir(scanDir, (err, files) => {
        let collection = {};
        if (err) {
            sendFileBrowserResponse(res, scanDir, collection, err);
        } else {
            async.eachLimit(files, 10, (item, callback) => {
                fs.stat(path.join(scanDir, item), (err, stats) => {
                    if (err) {
                        collection[item] = err;
                    } else {
                        stats.isDir = stats.isDirectory();
                        collection[item] = stats;
                    }
                    callback();
                });
            }, (err) => {
                sendFileBrowserResponse(res, scanDir, collection, err);
            });
        }
    });
});

module.exports = router;
