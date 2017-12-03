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

const debug = require('debug')('FileBrowser:Routes/index');
const config = require('config');
const HandleRender = require('../ui/handlebar-renderer');
const multer = require('multer');
const moment = require('moment');

const fs = require('fs');
const path = require('path');
const UPLOAD_DIR = config.get('server.upload.destination');

const router = require('express').Router();

let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.get('server.upload.destination'))
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
let upload = multer({
    storage: storage,
    limits: { fileSize: config.get('server.upload.limit') }
}).single('uploadFile');

router.get('/', (req, res, next) => {
    debug(`Requested from ${req.ip}`);
    HandleRender.render(res, 'index', 'Home');
});

router.get('/upload', (req, res) => {
    HandleRender.render(res, 'upload', 'Upload');
});
router.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.json({ ok: false, uploadedFile: null, error: err });
        } else {
            res.json({ ok: true, uploadedFile: '' });
        }
    });
    //let uploadPath = path.join(UPLOAD_DIR, req.files.uploadFile.name);
    //fs.writeFile(uploadPath, req.files.uploadFile.data, 'binary', (err) => {
    //    if (err) {
    //        res.json({ ok: false, uploadedFile: uploadPath, error: err });
    //    } else {
    //        res.json({ ok: true, uploadedFile: uploadPath });
    //    }
    //});
});

module.exports = router;
