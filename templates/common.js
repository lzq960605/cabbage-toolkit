
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
