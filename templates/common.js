
const ARCHIVE_FILE_SUFFIX = [".tar", ".tar.xz", ".tar.gz", ".tar.gz", ".tar.bz2", ".tar.Z", ".tgz", ".zip"];
const STEAM_CONST = {
    "STEAM_COMPAT_TOOL_PATH":".local/share/Steam/compatibilitytools.d",
    "STEAM_APPMANIFEST_PATH":".local/share/Steam/steamapps",
    "STEAM_APP_PATH":".local/share/Steam/steamapps/common",
    "STEAM_APP_COMPAT_PATH":".local/share/Steam/steamapps/compatdata",
    "STEAM_SDCARD_APP_PATH":"/run/media/mmcblk0p1/steamapps/common",
    "STEAM_SDCARD_APP_COMPAT_PATH":"/run/media/mmcblk0p1/steamapps/compatdata",
    "APP_WINDOWS_APP_PATH":".cabbage_toolkit/windows_app",
};
let fetch_async_task_ticker = null;
function commandRequest(category, command, params, async_task) {
    return axios({
        method: 'post',
        url: '/api/cmd',
        data: {
            "category": category,
            "command": command,
            "params": params,
            "async_task": async_task || 0, // 是否异步任务
            "api_id": `${new Date().getTime()}`,
        }
    });
}

function apiErrorAndReturn(vue, resp, ignoreError) {
    if(resp.data.code !==0 || (resp.data.data && resp.data.data.hasOwnProperty('cmdCode') && resp.data.data.cmdCode !== 0)){
        const errMsg = (resp.data.data && resp.data.data.hasOwnProperty('errMsg')) ? resp.data.data.errMsg : resp.data.msg;
        const ignore = ignoreError || false;
        if(!ignore){
            vue.$message.error(errMsg);
        }
        return true;
    }
    return false;
}

function parseCacheInfoToJson(cacheInfo) {
    const gameIntalled = cacheInfo.installed.map(v=>{
        const id = v.substring(v.indexOf('(')+1, v.indexOf(')'));
        return {
            id: parseInt(id),
            name: v.substring(0, v.indexOf('(')).replace('Non-Steam shortcut:', ''),
            nonSteam: v.indexOf('Non-Steam shortcut') >=0 ? 1 : 0,
            compatdataPath: '.local/share/Steam/steamapps/compatdata/' + id,
        }
    });
    const gameMap = {};
    gameIntalled.forEach(v=>{
        gameMap[v.id] = v;
    });
    function beanMapFunc(v) {
        const gameId = parseInt(v.substring(v.lastIndexOf('/')+1));
        const gameName = gameMap.hasOwnProperty(gameId) ? gameMap[gameId].name : '未知';
        const nonSteam = gameMap.hasOwnProperty(gameId) ? gameMap[gameId].nonSteam : null;
        const size = parseFloat(parseInt(v.split('\t')[0])/1024).toFixed(2); // 占用空间(MB)
        return {
            gameId: gameId,
            gameName: gameName,
            nonSteam: nonSteam,
            size: size,
            path: v.split('\t')[1],
        }
    }
    const shaderCache = cacheInfo.shaderCache.split('\n').filter(v=>v.trim().length > 0).map(v=>{
        return beanMapFunc(v);
    }).filter(v=>v.gameId !== 0); // 去除id为0的数据
    const compatdata = cacheInfo.compatdata.split('\n').filter(v=>v.trim().length > 0).map(v=>{
        return beanMapFunc(v);
    }).filter(v=>v.gameId !== 0);
    const shaderCacheWithoutInstalled = shaderCache.filter(v=>!gameIntalled.some(vv=>vv.id == v.gameId));
    const compatdataWithoutInstalled = compatdata.filter(v=>!gameIntalled.some(vv=>vv.id == v.gameId));
    return {
        shaderCache: shaderCache.sort((a,b)=>b.size - a.size),
        compatdata: compatdata.sort((a,b)=>b.size - a.size),
        shaderCacheWithoutInstalled: shaderCacheWithoutInstalled.sort((a,b)=>b.size - a.size),
        compatdataWithoutInstalled: compatdataWithoutInstalled.sort((a,b)=>b.size - a.size),
    }
}

function fileSelectorInit(userHomePath, eventHandler) {
    let currentFolder = '';
    // Handle iframe demo embed.
    // if (window.location.href.indexOf('embed=true') > -1)  document.documentElement.classList.add('embed');
    if (false)  document.documentElement.classList.add('embed');
    // Back to regularly scheduled program.
    var elem = document.getElementById('filemanager');
    if(!elem){
        console.error('element filemanager not found!');
        return;
    }
    // Random folders and filenames.
    var testdiropts = [
        { name: 'Test Folder', type: 'folder', id: 'folder1', hash: 'folder1' },
        { name: 'Test Folder 2', type: 'folder', id: 'folder2', hash: 'folder2' },
        { name: 'Test Folder 3', type: 'folder', id: 'folder3', hash: 'folder3' },
        { name: 'Test Folder 4', type: 'folder', id: 'folder4', hash: 'folder4' },
        { name: 'Test Folder 5', type: 'folder', id: 'folder5', hash: 'folder5' },
    ];

    var testfileopts = [
        { name: 'Really_long_file_name_that_is_really,_really,_really,_long.xlsx', type: 'file', id: 'file1', hash: 'file1', 'size': 50000, tooltip: 'Last modified: Today\nCool!', overlay: 'custom_fileexplorer_overlay_lock' },
        { name: 'Another file.txt', type: 'file', id: 'file2', hash: 'file2' },
        { name: 'Another file.mp3', type: 'file', id: 'file3', hash: 'file3', tooltip: 'Amazing!!!' },
        { name: 'Test_download_image.jpg', type: 'file', id: 'file4', hash: 'file4', thumb: true },
        { name: 'Really long file name that is really, really, really, long.png', type: 'file', id: 'file5', hash: 'file5', overlay: 'custom_fileexplorer_overlay_lock', thumb: true },
    ];

    // Random thumbnail URLs for the demo.
    var imageurlopts = [
        'https://picsum.photos/{0}/{1}',
        'https://source.unsplash.com/{0}x{1}',
        'https://placebear.com/{0}/{1}',
        'https://placekitten.com/{0}/{1}',
        'https://placekeanu.com/{0}/{1}',
        'https://baconmockup.com/{0}/{1}/'
    ];

    var FormatStr = function(format) {
        var args = Array.prototype.slice.call(arguments, 1);

        return format.replace(/{(\d+)}/g, function(match, number) {
            return (typeof args[number] != 'undefined' ? args[number] : match);
        });
    };

    var GetRandomImageURL = function() {
        var url = imageurlopts[Math.floor(Math.random() * imageurlopts.length)];

        url = FormatStr(url, Math.floor(Math.random() * 300) + 200, Math.floor(Math.random() * 300) + 200);

        return url;
    };

    const steamdeckFolderDemo = {
        '/home/deck': [
            {name: 'Desktop', id: 'Desktop', hash: 'Desktop', type: 'folder'},
            {name: 'develop', id: 'develop', hash: 'develop', type: 'folder'},
            {name: 'Documents', id: 'Documents', hash: 'Documents', type: 'folder'},
            {name: 'Downloads', id: 'Downloads', hash: 'Downloads', type: 'folder'},
            {name: 'games', id: 'games', hash: 'games', type: 'folder'},
            {name: 'Games', id: 'Games', hash: 'Games', type: 'folder'},
            {name: 'Links', id: 'Links', hash: 'Links', type: 'folder'},
            {name: 'Music', id: 'Music', hash: 'Music', type: 'folder'},
            {name: 'Pictures', id: 'Pictures', hash: 'Pictures', type: 'folder'},
            {name: 'Public', id: 'Public', hash: 'Public', type: 'folder'},
            {name: 'sort_text', id: 'sort_text', hash: 'sort_text', type: 'folder'},
            {name: 'Templates', id: 'Templates', hash: 'Templates', type: 'folder'},
            {name: 'Videos', id: 'Videos', hash: 'Videos', type: 'folder'},
        ],
        '/home/deck/Desktop': [
            {name: '大白菜工具箱', id: '大白菜工具箱.desktop', hash: '大白菜工具箱.desktop', thumb: GetRandomImageURL()},
            {name: '百度网盘', id: '百度网盘.desktop', hash: '百度网盘.desktop', thumb: GetRandomImageURL()},
        ],
        '/home/deck/Pictures': [

        ],
    };


    // 模拟从后端获取目录
    function io_ctl_list(path, finishedCb) {
        setTimeout(()=>{
            const randomFileEntries = [];
            for (let x = 0; x < 10; x++)
            {
                const tempfile = Object.assign({}, testfileopts[Math.floor(Math.random() * testfileopts.length)]);
                tempfile.name = x + ' ' + tempfile.name;
                tempfile.id += '_' + x;
                tempfile.hash += '_' + x;
                if (tempfile.thumb)  tempfile.thumb = GetRandomImageURL();

                randomFileEntries.push(tempfile);
            }
            const files = steamdeckFolderDemo.hasOwnProperty(path) ? steamdeckFolderDemo[path] : randomFileEntries;
            if(typeof finishedCb === 'function'){
                finishedCb(files);
            }
        }, 1000)
    }

    var options = {
        // This allows drag-and-drop and cut/copy/paste to work between windows of the live demo.
        // Your application should either define the group uniquely for your application or not at all.
        group: 'demo_test_group',

        capturebrowser: true,

        initpath: [
            [ userHomePath ? userHomePath : '/home/deck', 'HOME', { canmodify: false } ]
        ],

        onfocus: function(e) {
            if(typeof eventHandler === 'function'){
                const info = {
                    filePath: currentFolder + '/' + e.target.getAttribute('entry_id'),
                    entryId: e.target.getAttribute('entry_id'),
                    entryType: e.target.getAttribute('entry_type'),
                };
                eventHandler(this, 'onfocus', info); // 文件选中事件
            }
            console.log('focus target:' + e.target.getAttribute('entry_id') + ' type:' + e.target.getAttribute('entry_type'));
            console.log(e);
        },

        onblur: function(e) {
            console.log('blur');
            console.log(e);
        },

        // See main documentation for the complete list of keys.
        // The only tool that won't show as a result of a handler being defined is 'item_checkboxes'.
        tools: {
            item_checkboxes: true
        },

        onrefresh: function(folder, required) {
            currentFolder = folder.GetPathIDs().join('/');
            if(typeof eventHandler === 'function'){
                eventHandler(this, 'onrefresh', folder); // 目录刷新事件
            }

            // console.log('onrefresh:' + JSON.stringify(folder), '  current folder:' + JSON.stringify(this.GetCurrentFolder()));
            console.log('onrefresh, currentPath:' + folder.GetPathIDs().join('/'));
            const currentPath = folder.GetPath().map(v=>v[0]).join('/');
            const postParams = {
                action: 'file_explorer_refresh',
                path: JSON.stringify(folder.GetPathIDs()),
                xsrftoken: 'asdfasdf'
            };
            console.log('onrefresh, postParams:' + postParams.path);
            // if(steamdeckFolderDemo.hasOwnProperty(currentPath)){
            //     if (this.IsMappedFolder(folder)){
            //         folder.SetEntries(steamdeckFolderDemo[currentPath]);
            //         return;
            //     }
            // }
            // if(this.IsMappedFolder(folder)){
            //     io_ctl_list(currentPath, (files)=>folder.SetEntries(files));
            //     this.SetNamedStatusBarText('folder', this.EscapeHTML('获取目录失败'));
            // }


            // Optional:  Ignore non-required refresh requests.  By default, folders are refreshed every 5 minutes so the widget has up-to-date information.
//			if (!required)  return;

            // Maybe notify a connected WebSocket here to watch the folder on the server for changes.
            if (folder === this.GetCurrentFolder())
            {

            }

            // This code randomly generates content for the demo.
            // See the documentation for a better onrefresh implementation.



            // var newentries = [];
            //
            // for (var x = 0; x < 10; x++)
            // {
            // 	var tempdir = Object.assign({}, testdiropts[Math.floor(Math.random() * testdiropts.length)]);
            //
            // 	tempdir.name = x + ' ' + tempdir.name;
            // 	tempdir.id += '_' + x;
            // 	tempdir.hash += '_' + x;
            //
            // 	newentries.push(tempdir);
            // }
            //
            // for (var x = 0; x < 100; x++)
            // {
            // 	var tempfile = Object.assign({}, testfileopts[Math.floor(Math.random() * testfileopts.length)]);
            //
            // 	tempfile.name = x + ' ' + tempfile.name;
            // 	tempfile.id += '_' + x;
            // 	tempfile.hash += '_' + x;
            // 	if (tempfile.thumb)  tempfile.thumb = GetRandomImageURL();
            //
            // 	newentries.push(tempfile);
            // }
            //
            // newentries.push({ name: 'data1', type: 'folder', id: 'data1', hash: 'data1' });
            // newentries.push({ name: 'data10', type: 'folder', id: 'data10', hash: 'data10' });
            // newentries.push({ name: 'data2', type: 'folder', id: 'data2', hash: 'data2' });
            // newentries.push({ name: 'data3', type: 'folder', id: 'data3', hash: 'data3' });
            // newentries.push({ name: 'data4', type: 'folder', id: 'data4', hash: 'data4' });
            // newentries.push({ name: 'data5', type: 'folder', id: 'data5', hash: 'data5' });
            //
            // if (this.IsMappedFolder(folder))  folder.SetEntries(newentries);
        },

        onrename: function(renamed, folder, entry, newname) {
            console.log('onrename');
            console.log(entry);
            console.log(newname);

            // Simulate network delay.
            setTimeout(function() {
                // The entry is a copy of the original, so it is okay to modify any aspect of it, including id.
                // Passing in a completely new entry to the renamed() callback is also okay.
                entry.id = newname;
                entry.name = newname;

                renamed(entry);
            }, 250);
        },

        onopenfile: function(folder, entry) {
            console.log('onopenfile');
            console.log(entry);
        },

        onnewfolder: function(created, folder) {
            console.log('onnewfolder');
            // Simulate network delay.
            setTimeout(function() {
                var entry = { name: 'New Folder', type: 'folder', id: 'asdfasdffolder123', hash: 'asdfasdffolder123' };

                created(entry);
            }, 250);
        },

        onnewfile: function(created, folder) {
            console.log('onnewfile');
            // Simulate network delay.
            setTimeout(function() {
                var entry = { name: 'New File.txt', type: 'file', id: 'asdfasdffile123', hash: 'asdfasdffile123' };

                created(entry);
            }, 250);
        },

        oninitupload: function(startupload, fileinfo) {
            console.log('oninitupload');
            console.log(fileinfo.file);
            console.log(JSON.stringify(fileinfo.folder.GetPathIDs()));

            if (fileinfo.type === 'dir')
            {
                // Create a directory.  This type only shows up if the directory is empty.

                // Simulate network delay.
                setTimeout(function() {

                    // Passing false as the second parameter to startupload will remove the item from the queue.
                    startupload(false);
                }, 250);
            }
            else
            {
                // For those who wish to handle file uploads via external libraries, fileinfo.file contains the File object.

                // Simulate network delay.
                setTimeout(function() {
                    // Set a URL, headers, and params to send with the file data to the server.
                    fileinfo.url = 'filemanager/';

                    fileinfo.headers = {
                    };

                    fileinfo.params = {
                        action: 'upload',
                        id: 'temp-12345',
                        path: JSON.stringify(fileinfo.folder.GetPathIDs()),
                        name: fileinfo.fullPath,
                        size: fileinfo.file.size,
                        xsrftoken: 'asdfasdf'
                    };

                    fileinfo.fileparam = 'file';

                    // Optional:  Send chunked uploads.  Requires the server to know how to put chunks back together.
                    fileinfo.chunksize = 1000000;

                    // Optional:  Automatic retry count for the file on failure.
                    fileinfo.retries = 3;

                    // Start the upload.
                    startupload(true);
                }, 250);
            }
        },

        // Optional upload handler function to finalize an uploaded file on a server (e.g. move from a temporary directory to the final location).
        onfinishedupload: function(finalize, fileinfo) {
            console.log('onfinishedupload');
            console.log(fileinfo);
            // Simulate network delay.
            setTimeout(function() {
                finalize(true);
            }, 250);
        },

        // Optional upload handler function to receive permanent error notifications.
        onuploaderror: function(fileinfo, e) {
            console.log('onuploaderror');
            console.log(e);
            console.log(fileinfo);
        },

        oninitdownload: function(startdownload, folder, ids, entries) {
            console.log('oninitdownload');
            console.log(ids);
            console.log(entries);
            // Simulate network delay.
            setTimeout(function() {
                // Set a URL and params to send with the request to the server.
                var options = {};

                // Optional:  HTTP method to use.
//				options.method = 'POST';

                options.url = 'filemanager/';

                options.params = {
                    action: 'download',
                    path: JSON.stringify(folder.GetPathIDs()),
                    ids: JSON.stringify(ids),
                    xsrftoken: 'asdfasdf'
                };

                // Optional:  Control the download via an in-page iframe (default) vs. form only (new tab).
//				options.iframe = false;

                startdownload(options);
            }, 250);
        },

        ondownloadstarted: function(options) {
            console.log('started');
            console.log(options);
        },

        ondownloaderror: function(options) {
            console.log('error');
            console.log(options);
        },

        // Calculated information must be fully synchronous (i.e. no AJAX calls).  Chromium only.
        ondownloadurl: function(result, folder, ids, entry) {
            console.log('ondownloadurl');
            console.log(folder);
            console.log(ids);
            console.log(entry);
            result.name = (ids.length === 1 ? (entry.type === 'file' ? entry.name : entry.name + '.zip') : 'download-' + Date.now() + '.zip');
            result.url = 'http://127.0.0.1/filemanager/?action=download&xsrfdata=asdfasdfasdf&xsrftoken=asdfasdf&path=' + encodeURIComponent(JSON.stringify(folder.GetPathIDs())) + '&ids=' + encodeURIComponent(JSON.stringify(ids));
        },

        oncopy: function(copied, srcpath, srcids, destfolder) {
            console.log('oncopy');
            console.log(srcpath);
            console.log(srcids);
            console.log(destfolder.GetPathIDs());
            // Simulate network delay.
            setTimeout(function() {
                // Fill an array with copied destination folder entries from the server.
                var entries = [];

                copied(true, entries);
            }, 250);
        },

        onmove: function(moved, srcpath, srcids, destfolder) {
            console.log('onmove');
            console.log(srcpath);
            console.log(srcids);
            console.log(destfolder.GetPathIDs());
            // Simulate network delay.
            setTimeout(function() {
                // Fill an array with moved destination folder entries from the server.
                var entries = [];

                moved(true, entries);
            }, 250);
        },

        ondelete: function(deleted, folder, ids, entries, recycle) {
            console.log('ondelete');
            console.log(folder);
            console.log(ids);
            console.log(entries);
            console.log(recycle);
            // Ask the user if they really want to delete/recycle the items.
            if (!recycle && !confirm('Are you sure you want to permanently delete ' + (entries.length == 1 ? '"' + entries[0].name + '"' : entries.length + ' items') +  '?'))  deleted('Cancelled deletion');
            else
            {
                // Simulate network delay.
                setTimeout(function() {
                    deleted(true);
                }, 250);
            }
        },
    };

    var fe = new window.FileExplorer(elem, options);
    console.log(fe);

//fe.Focus();

}