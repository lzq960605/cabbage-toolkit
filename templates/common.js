
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

function fileSelectorInit(userHomePath, rootPath, eventHandler) {
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
    var options = {
        // This allows drag-and-drop and cut/copy/paste to work between windows of the live demo.
        // Your application should either define the group uniquely for your application or not at all.
        group: 'demo_test_group',
        capturebrowser: true,
        initpath: [
            [ rootPath ? rootPath : '/', '根目录(/)', { canmodify: false } ],
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
            // console.log('focus target:' + e.target.getAttribute('entry_id') + ' type:' + e.target.getAttribute('entry_type'));
            // console.log(e);
        },
        onblur: function(e) {
        },
        // See main documentation for the complete list of keys.
        // The only tool that won't show as a result of a handler being defined is 'item_checkboxes'.
        tools: {
            item_checkboxes: true
        },
        onrefresh: function(folder, required) {
            // this.GetCurrentFolder()
            currentFolder = folder.GetPathIDs().join('/');
            currentFolder = currentFolder.startsWith('//') ? (currentFolder.replace('//', '/')) : (currentFolder);
            if(typeof eventHandler === 'function'){
                eventHandler(this, 'onrefresh', folder); // 目录刷新事件
            }
        },
        onrename: function(renamed, folder, entry, newname) {
        },
        onopenfile: function(folder, entry) {
        },
        onnewfolder: function(created, folder) {
        },
        onnewfile: function(created, folder) {
        },
        oninitupload: function(startupload, fileinfo) {
        },
        // Optional upload handler function to finalize an uploaded file on a server (e.g. move from a temporary directory to the final location).
        onfinishedupload: function(finalize, fileinfo) {
        },
        // Optional upload handler function to receive permanent error notifications.
        onuploaderror: function(fileinfo, e) {
        },
        oninitdownload: function(startdownload, folder, ids, entries) {
        },
        ondownloadstarted: function(options) {
        },
        ondownloaderror: function(options) {
        },
        // Calculated information must be fully synchronous (i.e. no AJAX calls).  Chromium only.
        ondownloadurl: function(result, folder, ids, entry) {
        },
        oncopy: function(copied, srcpath, srcids, destfolder) {
        },
        onmove: function(moved, srcpath, srcids, destfolder) {
        },
        ondelete: function(deleted, folder, ids, entries, recycle) {
        },
    };
    const fe = new window.FileExplorer(elem, options);
    const userInitPath = [
        [ userHomePath ? userHomePath : '/home/deck', 'HOME', { canmodify: false } ],
    ];
    fe.SetPath(userInitPath);
    return fe;
}

const FILE_SELECTOR_USE = 'HTML'; // LINUX_WDG_OPEN, HTML
function openFileSelector(vue, choiceFileCb) {
    // 先选择exe, 再打开
    if(FILE_SELECTOR_USE === 'LINUX_WDG_OPEN'){
        commandRequest('GAME_SETTING', 'openFileSelector', {}).then((resp)=>{
            if(apiErrorAndReturn(vue, resp, true)){
                return;
            }
            let path = resp.data.data.result;
            path = path.indexOf('select file:') >= 0 ? path.split('select file:')[1] : '';
            if(typeof choiceFileCb === 'function'){
                choiceFileCb(path, '');
            }
        }).catch((e)=>{
            console.error(e);
            vue.$message.error(e.message);
        });
    }
    else if(FILE_SELECTOR_USE === 'HTML'){
        vue.fileSelectorDialogVisible = true;
        const t = setInterval(()=>{
            // 轮询对话框关闭
            if(vue.fileSelectorDialogVisible === false){
                clearInterval(t);
                if(typeof choiceFileCb === 'function'){
                    choiceFileCb(vue.fileSelectorValue, ''); // 参数1: 文件地址; 参数2: 文件类型
                }
            }
        }, 500)
    }
}