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
            url: {
                index: ['/api/filebrowser', 'get'],
                createDir: ['/api/filebrowser/create-dir', 'post'],
                upload: ['/api/filebrowser/upload', 'post'],
                download: ['/api/filebrowser/download', 'get'],
                delete: ['/api/filebrowser/delete', 'delete'],
                rename: ['/api/filebrowser/rename', 'post']
            },
            args: {
                path: 'path',
                newDirName: 'newDirName',
                renameOldName: 'oldName',
                renameNewName: 'newName'
            }
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
        window.location.hash = '#' + FileBrowser.currentPath;

        $('.brand-logo').text(FileBrowser.currentPath);
        $('.brand-logo-small').text((FileBrowser.currentPath.split('/').slice(-1).pop() || '/').substr(0, 15));
    },
    _ajax: function(path) {
        LoadingIndicator.show();
        let data = {};
        data[FileBrowser.settings.api.args.path] = path;
        simpleAjax(
            FileBrowser.settings.api.url.index[0],
            FileBrowser.settings.api.url.index[1],
            data,
            function(res) {
                FileBrowser._render(path, res);
                LoadingIndicator.hide();
            }, function(e) {
                LoadingIndicator.hide();
                Materialize.toast('Folder could not be loaded. Maybe it doesn\'t exist anymore?', 2500);
                FileBrowser._render(path, (e.response && e.response.responseJSON) ? e.response.responseJSON : {
                    fileCount: 0,
                    files: {},
                    path: path,
                    ok: false,
                    error: null
                });
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

        if (res.fileCount >= 1) {
            var keys = Object.keys(res.files).sort(function(a,b) { return a.toLowerCase().localeCompare(b.toLowerCase()) });
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

                //var fileIcon = $('.file-icon', item);
                //fileIcon.click(FileBrowser.onFileIconClick);
                //fileIcon.data('file-name', filename);
                //fileIcon.data('file', file);

                var actionsLink = $('.action-link', item);
                actionsLink.click(FileBrowser.onActionsClick);
                actionsLink.data('file-name', filename);
                actionsLink.data('file', file);

                if (item.hasClass('nav-link')) {
                    item.attr('href', '#' + FileBrowser.cleanupPath(path + '/' + filename));
                    item.click(file.isDir ? FileBrowser.onFileIconClick : FileBrowser.onActionsClick);
                    item.data('file-name', filename);
                    item.data('file', file);
                } else {
                    var navLink = $('.nav-link', item);
                    navLink.attr('href', '#' + FileBrowser.cleanupPath(path + '/' + filename));
                    navLink.click(file.isDir ? FileBrowser.onFileIconClick : FileBrowser.onActionsClick);
                    navLink.data('file-name', filename);
                    navLink.data('file', file);
                }
                item.appendTo(renderTarget);
            }
        } else {
            var emptyItem = $('#emptyTemplate').clone();
            emptyItem.appendTo(renderTarget);
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
            FileBrowser.downloadFile(completePath);
        }
    },
    onActionsClick: function(e) {
        var aboutActionsModal = $('#fileActionsModal');

        var link = $(e.currentTarget);
        var fileName = link.data('file-name');
        var fileInfo = link.data('file');

        if (fileInfo.isDir) {
            $('.hidden-on-folder', aboutActionsModal).hide();
        } else {
            $('.hidden-on-folder', aboutActionsModal).show();
        }

        $('.file-name').text(fileName);
        $('.file-size').text(filesize(fileInfo.size));
        $('.file-birthdate').text(moment(fileInfo.birthtimeMs).format('LLL'));
        $('.file-mdate').text(moment(fileInfo.mtimeMs).format('LLL'));

        var links = $('.file-advanced-action');
        links.data('file-name', fileName);
        links.data('file', fileInfo);

        aboutActionsModal.modal('open');
    },
    onModalActionClick: function(e) {
        var aboutActionsModal = $('#fileActionsModal');

        var link = $(e.currentTarget);
        var fileName = link.data('file-name');
        var fileInfo = link.data('file');
        var completePath = FileBrowser.cleanupPath(FileBrowser.currentPath + '/' + fileName);

        var actionType = link.data('action');

        switch (actionType) {
            case 'file-download':
                FileBrowser.downloadFile(completePath);
                aboutActionsModal.modal('close');
                break;
            case 'file-rename':
                var renameModal = $('#fileRenameModal');
                $('.file-name', renameModal).text(fileName);
                $('#fileRenameOldName').val(fileName);
                $('#fileRenameNewName').val(fileName);
                renameModal.modal('open');
                $('#fileRenameNewName').focus();
                break;
            case 'file-delete':
                var deleteModal = $('#fileDeleteModal');
                $('.file-name', deleteModal).text(fileName);
                $('#fileDeletePath', deleteModal).val(completePath);

                if (fileInfo.isDir) {
                    $('.show-on-folder', deleteModal).show();
                } else {
                    $('.show-on-folder', deleteModal).hide();
                }

                deleteModal.modal('open');
                break;
            default:
                Materialize.toast('Action ' + actionType + ' not implemented', 2500);
                break;
        }
    },
    createDirectory: function(dirname) {
        LoadingIndicator.show();
        let data = {};
        data[FileBrowser.settings.api.args.path] = FileBrowser.currentPath;
        data[FileBrowser.settings.api.args.newDirName] = dirname;
        simpleAjax(
            FileBrowser.settings.api.url.createDir[0],
            FileBrowser.settings.api.url.createDir[1],
            data,
            function(res) {
                $('#createFolderName').val('');
                $('#createFolderModal').modal('close');
                FileBrowser.navigateTo(FileBrowser.currentPath);
            },
            function(e) {
                LoadingIndicator.hide();
                if (e.response && e.response.error) {
                    Materialize.toast('Could not create directory! It might already exist.', 2500);
                }
            }
        );
    },
    uploadFile: function() {
        var modal = $('#uploadProgressModal');
        var lastBytes = null;
        var lastTime = null;
        var xhr = uploadAjaxFile(
            FileBrowser.settings.api.url.upload[0] + '?path=' + encodeURIComponent(FileBrowser.currentPath),
            FileBrowser.settings.api.url.upload[1],
            'uploadFile',
            function(e) {
                // On Progress
                if (e.lengthComputable) {
                    var percentage = (e.loaded / e.total) * 100;
                    var remaining = e.total - e.loaded;
                    var speed = 0;
                    var eta = 0;
                    if (lastBytes) {
                        var timeDelta = Math.max(1, new Date() - lastTime);
                        var byteDelta = e.loaded - lastBytes;
                        speed = (byteDelta / timeDelta) * 1000;
                        eta = remaining / speed;
                    }
                    lastTime = new Date();
                    lastBytes = e.loaded;
                    FileBrowser.setUploadState(
                        percentage,
                        remaining,
                        speed,
                        eta
                    );
                }
            },
            function(e) {
                // On Error
                console.log(e);
                Materialize.toast('An unexpected error occurred while uploading your file.', 5000);
                modal.modal('close');
            },
            function(e) {
                // On Finish
                try {
                    var d = JSON.parse(this.responseText);
                    if (d.ok) {
                        Materialize.toast('Upload completed.', 2500);
                    } else if (d.error) {
                        var error = 'Upload failed';
                        switch (d.error.code) {
                            case 'LIMIT_FILE_SIZE':
                                error = 'File could not be saved, file too large';
                                break;
                        }
                        Materialize.toast(error, 2500);
                    } else {
                        Materialize.toast('Upload failed!', 2500);
                    }
                } catch (err) {
                    console.log(err);
                    Materialize.toast('Upload failed!', 2500);
                }
                modal.modal('close');
                FileBrowser.navigateTo(FileBrowser.currentPath);
            },
            function(formData) {
                // Before Send
                modal.modal('open');
                $('button', modal).off().click(function() {
                    xhr.abort();
                    Materialize.toast('Upload aborted', 2500);
                    modal.modal('close');
                    setTimeout(function() {
                        FileBrowser.deleteFile(
                            FileBrowser.cleanupPath(FileBrowser.currentPath + '/' + formData.get('uploadFile').name),
                            true);
                    }, 1000);
                });
                return formData;
            }
        );
    },
    setUploadState: function(percentage, bytesRemain, speed, eta) {
        var modal = $('#uploadProgressModal');
        $('.determinate', modal).width(percentage + '%');
        $('.upload-remain-data', modal).text(filesize(bytesRemain, {round: 1}));
        $('.upload-speed', modal).text(filesize(speed, {round: 1}));
        $('.upload-percentage', modal).text(Math.floor(percentage));
        $('.upload-eta', modal).text(moment.duration(Math.ceil(eta / 10) * 10, 'seconds').format('m [min] s [sec]'));
    },
    getDownloadUrl: function(path) {
        return FileBrowser.settings.api.url.download[0] + '?' +
            FileBrowser.settings.api.args.path + '=' +
            encodeURIComponent(path);
    },
    downloadFile: function(path) {
        var progressModal = $('#downloadProgressModal');
        progressModal.modal('open');
        setTimeout(function() {
            var downloadUrl = FileBrowser.getDownloadUrl(path);
            if (isiOS) {
                var linkModal = $('#downloadLinkModal');
                $('.download-link-target', linkModal).attr('href', downloadUrl);
                linkModal.modal('open');
                //window.location.href = downloadUrl;
            } else {
                window.open(downloadUrl);
            }
            progressModal.modal('close');
        }, 1000);
    },
    deleteFile: function(path, silent) {
        let data = {};
        data[FileBrowser.settings.api.args.path] = path;
        simpleAjax(
            FileBrowser.settings.api.url.delete[0],
            FileBrowser.settings.api.url.delete[1],
            data,
            function(res) {
                if (silent) return;
                FileBrowser.navigateTo(FileBrowser.currentPath);
                Materialize.toast('File deleted.', 2500);
                $('#processingModal').modal('close');
            }, function(e) {
                if (silent) return;
                var d = e.response;
                if (d) {
                    if (d.ok) {
                        Materialize.toast('File deleted.', 2500);
                    } else if (d.error) {
                        var error = 'File could not be deleted.';
                        switch (d.error.code) {
                            case 'EPERM':
                                error = 'Deleting is not permitted.';
                                break;
                        }
                        Materialize.toast(error, 2500);
                    } else {
                        Materialize.toast('The file could not be deleted!', 2500);
                    }
                } else {
                    Materialize.toast('The file could not be deleted!', 2500);
                }
                $('#processingModal').modal('close');
            }
        );
    },
    renameFile: function(oldName, newName) {
        let data = {};
        data[FileBrowser.settings.api.args.path] = FileBrowser.currentPath;
        data[FileBrowser.settings.api.args.renameOldName] = oldName;
        data[FileBrowser.settings.api.args.renameNewName] = newName;
        simpleAjax(
            FileBrowser.settings.api.url.rename[0],
            FileBrowser.settings.api.url.rename[1],
            data,
            function(res) {
                FileBrowser.navigateTo(FileBrowser.currentPath);
                Materialize.toast('File renamed.', 2500);
                $('#processingModal').modal('close');
            }, function(e) {
                var d = e.response;
                if (d) {
                    if (d.ok) {
                        Materialize.toast('File renamed.', 2500);
                    } else if (d.error) {
                        var error = 'File could not be renamed.';
                        switch (d.error.code) {
                            case 'EPERM':
                                error = 'Renaming is not permitted.';
                                break;
                        }
                        Materialize.toast(error, 2500);
                    } else {
                        Materialize.toast('The file could not be renamed!', 2500);
                    }
                } else {
                    Materialize.toast('The file could not be renamed!', 2500);
                }
                $('#processingModal').modal('close');
            }
        );
    }
};

$(document).ready(function() {
    const FILENAME_VALID = /^[0-9a-zA-Z\^\&\'\@\{\}\[\]\,\$\=\!\-\#\(\)\.\%\+\~\_ ]+$/;

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
    $('#createFolderForm').submit(function(e) {
        e.preventDefault();
        var newDirName = $('#createFolderName').val();
        if (newDirName && newDirName.match(FILENAME_VALID)) {
            FileBrowser.createDirectory(newDirName);
        } else {
            Materialize.toast('Please enter a valid name.', 2500);
        }
    });
    $('#uploadFileForm').submit(function(e) {
        e.preventDefault();
        $('#uploadFileModal').modal('close');
        FileBrowser.uploadFile();
    });
    $('.file-advanced-action').click(FileBrowser.onModalActionClick);
    $('#fileDeleteForm').submit(function(e) {
        e.preventDefault();
        $('#fileActionsModal').modal('close');
        $('#fileDeleteModal').modal('close');
        $('#processingModal').modal('open');
        setTimeout(function() {
            FileBrowser.deleteFile($('#fileDeletePath').val());
        }, 500);
    });
    $('#fileRenameForm').submit(function(e) {
        e.preventDefault();
        var oldName = $('#fileRenameOldName').val();
        var newName = $('#fileRenameNewName').val();

        if (oldName && newName) {
            if (oldName === newName) {
                Materialize.toast('New name must not match old name!', 2500);
                $('#fileRenameNewName').focus();
                return;
            } else if (!newName.match(FILENAME_VALID)) {
                Materialize.toast('New name is not valid!', 2500);
                $('#fileRenameNewName').focus();
                return;
            }
        } else {
            Materialize.toast('Please enter a file name to continue.', 2500);
            $('#fileRenameNewName').focus();
            return;
        }

        $('#fileActionsModal').modal('close');
        $('#fileRenameModal').modal('close');
        $('#processingModal').modal('open');
        setTimeout(function() {
            FileBrowser.renameFile(oldName, newName);
        }, 500);
    });
    FileBrowser.init();
});
