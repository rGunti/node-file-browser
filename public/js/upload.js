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

function setUploadStatus(percentage, state) {
    if (percentage < 0) {
        $('.progress .indeterminate').show();
        $('.progress .determinate').hide();
    } else {
        $('.progress .indeterminate').hide();
        $('.progress .determinate').show();

        var val = Math.floor(Math.max(Math.min(percentage, 1), 0) * 100);

        $('.upload-progress-percentage').text(val);
        $('.progress .determinate').width(val + '%');
    }

    if (state) {
        $('.upload-progress-state').text(state);
    }
}

$(document).ready(function() {
    $('.progress .indeterminate').hide();
    $('#uploaderForm button[type=submit]').on('click', function(e) {
        e.preventDefault();

        var lastCalc = null;
        var lastFileSize = null;

        setUploadStatus(-1, 'Initializing Upload...');

        var formData = new FormData();
        var file = document.getElementById('uploadFile').files[0];
        formData.append('uploadFile', file);

        var xhr = new XMLHttpRequest();
        xhr.open('post', '/upload', true);
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                var percentage = (e.loaded / e.total);

                if (lastCalc) {
                    var timeDelta = new Date() - lastCalc;
                    var byteDelta = e.loaded - lastFileSize;
                    var speedBPS = (byteDelta / timeDelta) * 1000;

                    var remainingFileSize = e.total - e.loaded;
                    var eta = moment.duration((Math.floor((remainingFileSize / speedBPS) / 10) * 10) + 10, 'seconds').format('m [min] s [sec]');
                    setUploadStatus(percentage, 'Uploading at ' +
                        filesize(speedBPS, {round: 1}) + '/s (' +
                        filesize(remainingFileSize, {round: 1}) + ' remaining, ETA: ' + eta + ') ... ');
                } else {
                    setUploadStatus(percentage, 'Uploading ... ');
                }

                lastCalc = new Date();
                lastFileSize = e.loaded;
            }
        };
        xhr.onerror = function(e) {
            console.log(e);
            setUploadStatus(0, 'Failed to upload file!');
            $('#cancelButton').attr('disabled', true);
            $('#uploaderForm button[type=submit]').attr('disabled', false);
        };
        xhr.onload = function() {
            console.log(this);
            var data = JSON.parse(this.responseText);
            if (data.ok) {
                setUploadStatus(1, this.statusText);
            } else if (data.error) {
                var error = 'Upload failed';
                switch (data.error.code) {
                    case 'LIMIT_FILE_SIZE':
                        error = 'File could not be saved, file too large';
                        break;
                }
                setUploadStatus(0, error);
            } else {
                setUploadStatus(0, 'Upload failed');
            }

            $('#cancelButton').attr('disabled', true);
            $('#uploaderForm button[type=submit]').attr('disabled', false);
        };
        $('#cancelButton').attr('disabled', false);
        $('#cancelButton').off('click').click(function() {
            xhr.abort();
            setUploadStatus(0, 'Canceled');
            $('#cancelButton').attr('disabled', true);
            $('#uploaderForm button[type=submit]').attr('disabled', false);
        });

        $('#uploaderForm button[type=submit]').attr('disabled', true);
        xhr.send(formData);
    });
});
