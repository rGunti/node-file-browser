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

function simpleAjax(url, method, data, callback, errorCallback) {
    method = method || 'get';
    $.ajax({ method: method, url: url, data: data }).done(function(res) {
        if (!res.ok) {
            console.error(res, url, method);
            if (errorCallback) errorCallback({
                url: url,
                method: method,
                data: data,
                response: res
            });
            else {
                Materialize.toast('Uncaught Error while trying to ' + method + ' ' + url, 10000);
            }
        } else if (callback) {
            callback(res);
        }
    }).fail(function(res) {
        if (errorCallback) errorCallback({
            url: url,
            method: method,
            data: null,
            response: res
        });
        else {
            Materialize.toast('Uncaught Error while trying to ' + method + ' ' + url, 10000);
        }
    });
}

function uploadAjaxFile(url, method, fileElementId, onProgress, onError, onFinish, beforeSend) {
    var formData = new FormData();
    var file = document.getElementById(fileElementId).files[0];
    formData.append(fileElementId, file);

    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.upload.onprogress = onProgress;
    xhr.onerror = onError;
    xhr.onload = onFinish;

    if (beforeSend) formData = beforeSend(formData);
    xhr.send(formData);
    return xhr;
}
