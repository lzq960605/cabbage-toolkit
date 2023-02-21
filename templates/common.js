
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