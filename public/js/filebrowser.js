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

const FileBrowser = {
    settings: {
        renderTarget: '#renderTarget',
        templates: {
            file: '#fileTemplate',
            folder: '#folderTemplate',
            emptyDir: '#emptyTemplate',
            inaccessible: '#inaccessibleTemplate'
        },
        showErrorItems: false,
        api: {
            url: '/api/filebrowser',
            method: 'get',
            dataPathArgument: 'path'
        }
    },
    currentPath: '/',
    navigateTo: function(path) {
        FileBrowser._ajax(path);
    },
    navigateBack: function() {
        var pathArr = FileBrowser.currentPath.split('/').filter(function(v) { return !!v; });
        if (pathArr.length === 0) { return; }
        else { pathArr.pop(); }
        FileBrowser.navigateTo('/' + pathArr.join('/'));
    },
    cleanupPath: function(path) {
        return '/' + path.split('/').filter(function(v) { return !!v; }).join('/');
    },
    setPath: function(path) {
        FileBrowser.currentPath = FileBrowser.cleanupPath(path);
        $(FileBrowser.settings.filePathTarget).text(FileBrowser.currentPath);
        window.location.hash = '#' + FileBrowser.currentPath;

        $('.brand-logo').text(FileBrowser.currentPath);
        $('.brand-logo-small').text(FileBrowser.currentPath.split('/').slice(-1).pop() || '/');
    },
    _ajax: function(path) {
        LoadingIndicator.show();
        let data = {};
        data[FileBrowser.settings.api.dataPathArgument] = path;
        simpleAjax(
            FileBrowser.settings.api.url,
            FileBrowser.settings.api.method,
            data,
            function(res) {
                FileBrowser._render(path, res);
                LoadingIndicator.hide();
            }, function(e) {
                LoadingIndicator.hide();
            }
        )
    },
    _render: function(path, res) {
        var renderTarget = $(FileBrowser.settings.renderTarget);
        var templates = {
            file: $(FileBrowser.settings.templates.file),
            folder: $(FileBrowser.settings.templates.folder),
            emptyDir: $(FileBrowser.settings.templates.emptyDir),
            inaccessible: $(FileBrowser.settings.templates.inaccessible)
        };
        renderTarget.empty();
        var keys = Object.keys(res.files).sort();
        for (var i in keys) {
            var filename = keys[i];
            var file = res.files[filename];
            var item = file.errno ?
                templates.inaccessible.clone() :
                (file.isDir ? templates.folder.clone() : templates.file.clone());
            $('.title', item).text(filename);
            if (file.errno) {
                // => Is Error
                if (!FileBrowser.settings.showErrorItems) {
                    continue;
                }
                $('.meta', item).text(file.code);
            } else if (file.isDir) {
                // => Is Dir
            } else {
                // => Is File
                $('.meta', item).text(filesize(file.size || 0));
            }

            var fileIcon = $('.file-icon', item);
            fileIcon.click(FileBrowser.onFileIconClick);
            fileIcon.data('file-name', filename);
            fileIcon.data('file', file);

            item.appendTo(renderTarget);
        }

        FileBrowser.setPath(path);

        // Scroll up
        window.scroll({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    },
    init: function() {
        var browserPath = window.location.hash;
        if (browserPath && browserPath.substr(1) && !browserPath.startsWith('#!')) {
            FileBrowser.navigateTo(FileBrowser.cleanupPath(browserPath.substr(1)));
        } else {
            FileBrowser.navigateTo('/');
        }
    },
    onFileIconClick: function(e) {
        var link = $(e.currentTarget);
        var fileName = link.data('file-name');
        var fileInfo = link.data('file');
        var completePath = FileBrowser.cleanupPath(FileBrowser.currentPath + '/' + fileName);
        if (fileInfo.isDir) {
            FileBrowser.navigateTo(completePath);
        } else {
            alert(completePath);
        }
    },
    onFileClick: function(e) {
    },
    onFolderClick: function(e) {
    }
};

$(document).ready(function() {
    $('.navigate-back-button').click(function(e) {
        FileBrowser.navigateBack();
        $('.button-collapse').sideNav('hide');
    });
    $('.reload-button').click(function(e) {
        FileBrowser.navigateTo(FileBrowser.currentPath);
        $('.button-collapse').sideNav('hide');
    });
    $('.nav-to-root-button').click(function(e) {
        FileBrowser.navigateTo('/');
        $('.button-collapse').sideNav('hide');
    });
    FileBrowser.init();
});
