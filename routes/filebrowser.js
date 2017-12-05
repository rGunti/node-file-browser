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
const multer = require('multer');

const fs = require('fs');
const path = require('path');
const async = require('async');

const router = require('express').Router();
const ROOT = config.get('app.filebrowser.basePath');

function sendFileBrowserResponse(res, path, files, err, statusCode) {
    res.status((!err) ? statusCode || 200 : statusCode || 500);
    res.json({
        ok: (!err),
        error: err,
        fileCount: Object.keys(files).length,
        files: files,
        path: path
    })
}

function sendSimpleAnswer(res, err, data) {
    res.json({
        ok: (!err),
        error: err,
        data: data
    });
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

router.post('/create-dir', (req, res) => {
    if (!req.body.newDirName) {
        return sendSimpleAnswer(res, { code: 'EPERM' });
    }
    let scanDir = ROOT;
    if (req.body.path) {
        let queryPath = req.body.path;
        let pathArr = queryPath.split('/').filter((i) => { return !!i && i !== '..'; });
        scanDir = path.join(ROOT, pathArr.join('/'));
    }
    let createDir = path.join(scanDir, req.body.newDirName.split('/')[0]);
    fs.stat(createDir, (err, stats) => {
        if (err && err.code === 'ENOENT') {
            fs.mkdir(createDir, (err) => {
                sendSimpleAnswer(res, err);
            });
        } else {
            sendSimpleAnswer(res, { code: 'EEXIST' });
        }
    });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadDir = ROOT;
        if (req.query.path) {
            let queryPath = req.query.path;
            let pathArr = queryPath.split('/').filter((i) => { return !!i && i !== '..'; });
            uploadDir = path.join(ROOT, pathArr.join('/'));
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => { cb(null, file.originalname) }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: config.get('server.upload.limit') }
}).single('uploadFile');

router.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        sendSimpleAnswer(res, err);
    });
});

router.get('/download', (req, res) => {
    if (req.query.path) {
        let filePath = path.join(ROOT, req.query.path);
        fs.stat(filePath, (err, stats) => {
            if (err) {
                sendSimpleAnswer(res, { code: 'ENOENT', message: 'File not found' }, null, 404);
            } else {
                res.cookie('fileDownload', true, { maxAge: 900000, path: '/' });
                res.download(filePath);
            }
        });
    } else {
        sendSimpleAnswer(res, { code: 'EPERM', message: 'No file specified' })
    }
});

module.exports = router;
