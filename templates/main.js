new Vue({
    el: '#app',
    data: function() {
        return {
            pageLoading:false,
            pageLoadingText:'加载中',
            pageLoadingTimer: null,
            // main_windows: 'GAME_SETTING', // GAME_SETTING, PROTON_PATCH
            visible: false,
            options: [{
                value: '1',
                label: '游戏设置'
            }, {
                value: '2',
                label: '多开exe(新版)'
            }, {
                value: '3',
                label: '打兼容层补丁(旧版)'
            }, {
                value: '4',
                label: '软件中心'
            }, {
                value: '5',
                label: '缓存清理'
            }],
            main_windows: '1',  // 1: GAME_SETTING, 2: PROTON_PATCH
            gameList:[],
            gameListAll:[], // 所有的游戏(包括没有使用兼容层启动过的)
            currentGame: {
                id:'',
                name:'',
            },
            geProtonList:[],
            currentGeProton: {
                name:'',
                version:'',
                path:'',
            },
            storageDialogVisible: false,
            storageDialogTarget: '', // openDiskC_Path, openGameInstallPath
            softwareDialogVisible: false, //控制软件选择对话框显示与隐藏
            fileSelectorDialogVisible: false,
            fileSelectorValue: '', // 文件对话框所选的文件
            fileSelectorFe: null, // 文件选择句柄
            softwareDialogOptions: [],
            softwareDialogOptionsValue: '',
            softwareInfo: {},
            geGameOptions: [],
            geGameOptionValue: '',  // 游戏id
            // 选中的多开exe 游戏信息
            multiExeGame: {
                id:'',
                name:'',
            },
            // 兼容层游戏持久化配置
            geGameOptionConf: {
                WINE_TASKMGR:'',
                WINE_EXTRA_EXE:'',
                WINE_CHEATENGINE:'',
                WINE_FLINGTRAINER:'',
            },
            // app配置，优先从云端获取
            appSetting: {
                "version":"1.0.0",
                "adv": {
                    "author": "大白菜v50",
                    "author_home_page": "https://www.bilibili.com/video/BV17M411B7Ps/",
                    "helper_page": "https://www.bilibili.com/read/cv21084708/"
                },
                "helper_page": {
                    "install_ge_proton": "https://www.bilibili.com/read/cv21084708/",
                    "install_protontricks": "https://www.bilibili.com/video/cv21084708/"
                },
                "user_home_path": "/home/deck",
                "system_root_path": "/",
                "necessary_tools": [],
                "windows_app": [],
            },
            windowsAppListData: [],
            cacheTabActiveName: 'shaderCache',
            // 缓存列表
            apiCacheReturn:null,
            gameCache: {
                "shaderCache":[],
                "compatdata":[],
            },
            multipleSelection: [],
            shaderOnlyDeleted: true,
            onlyDeletedDisabled:false,
        }
    },
    methods: {
        onHandlerAsyncTaskError: function(errArrays){
            const msg = errArrays.filter(v=>{
                return v.data.cmdCode != '0';
            }).map(v=>{
                return JSON.stringify(v.data.result).replace("\"", "");
            }).join("\n");
            if(msg.trim().length > 0){
                this.$message.success(msg);
            }
        },
        lockScreen: function(waitSecond, notifyText){
            // const loading = this.$loading({
            //     lock: true,
            //     text: '处理中',
            //     spinner: 'el-icon-loading',
            //     background: 'rgba(0, 0, 0, 0.7)'
            // });
            this.pageLoading = true;
            this.pageLoadingText = notifyText || '加载中';
            const wait = waitSecond || 999;
            this.pageLoadingTimer = setTimeout(() => {
                // loading.close();
                this.pageLoading = false;
            }, wait*1000);
        },
        lockScreenClear: function(){
            this.pageLoading = false;
            clearTimeout(this.pageLoadingTimer);
        },
        onEnterAuthorHomeSite:function(){
            if(this.appSetting.adv.author_home_page){
                window.open(this.appSetting.adv.author_home_page);
            }
        },
        onGetAppSetting:function () {
            commandRequest('GAME_SETTING', 'getAppSetting', {}).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                if(resp.data.data.result.length > 0){
                    this.appSetting = JSON.parse(resp.data.data.result);
                    console.log('onGetAppSetting: ' + JSON.stringify(this.appSetting));
                }
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            });
        },
        onClickGameItem:function (gameItem) {
            this.currentGame = JSON.parse(JSON.stringify(gameItem));
        },
        onClickMultiExeGameItem:function (gameItem) {
            this.multiExeGame = JSON.parse(JSON.stringify(gameItem));
            this.geGameOptionValue = this.multiExeGame.id;
            this.readGeProtonGameConf(true);
        },
        onClickGeProtonItem:function (item) {
            const currentGeProton = JSON.parse(JSON.stringify(item));
            currentGeProton.path = STEAM_CONST.STEAM_COMPAT_TOOL_PATH + "/" + item.name;
            this.currentGeProton = currentGeProton;
            this.onGeProtonVersion();
            this.geGameOptionValue = '';
        },
        updateAppToNewestVersion: function(){
            commandRequest('GAME_SETTING', 'updateAppToNewestVersion', {}).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                // result:{need_update: 1, version: '1.0.0'}
                this.$message.success('升级完成, ');
                this.$alert(`升级完成，程序将自动关闭，请手动启动应用`, '提示', {
                    confirmButtonText: '确定',
                    callback: (action) => {
                        // 关闭python应用
                        axios({
                            method: 'get',
                            url: '/app/exit'
                        }).then(resp=>{
                            window.location.href="about:blank";
                            window.close();
                        });
                    }
                });
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            });
        },
        checkAppOnlineVersion: function(){
            commandRequest('GAME_SETTING', 'checkAppOnlineVersion', {}).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                // result:{need_update: 1, version: '1.0.0'}
                if(resp.data.data.result.need_update == 1){
                    this.$alert(`检测到有新版本:${resp.data.data.result.version}, 是否现在升级?`, '提示', {
                        cancelButtonText: '取消',
                        confirmButtonText: '确定',
                        callback: (action) => {
                            if (action === 'confirm') {
                                this.$message.success('准备升级到'+ resp.data.data.result.version);
                                this.updateAppToNewestVersion();
                            }
                        }
                    });
                }
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            });
        },
        // 补丁功能
        onRunWindowsApp:function(appType){
            if(!this.currentGame.id){
                this.$message.warning('请先选择游戏');
                return;
            }
            // 先选择exe, 再打开
            openFileSelector(this, (filePath, fileType)=>{
                let path = filePath;
                if(new RegExp("[\\u4E00-\\u9FFF]+", "g").test(path) || path.indexOf(' ') >= 0){
                    this.$message.warning('文件路径或文件名不能包含中文或空格!');
                    return;
                }
                if(path){
                    const command = appType === 'exe' ? 'runExe' : 'runBat';
                    this.lockScreen(4);
                    commandRequest('GAME_SETTING', command, {
                        targetPath: path,
                        gameId: this.currentGame.id,
                    }, 1).then((resp)=>{
                        if(apiErrorAndReturn(this, resp)){
                            return;
                        }
                        this.$message.success('运行成功');
                    }).catch((e)=>{
                        console.error(e);
                        this.$message.error(e.message);
                    })
                }
            });
        },
        // ------ 辅助功能 ------
        onHelperGeneralOpen:function(command){
            if(!this.currentGame.id){
                this.$message.warning('请先选择游戏');
                return;
            }
            this.lockScreen(4);
            commandRequest('GAME_SETTING', command, {
                gameId: this.currentGame.id,
            }, 1).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                this.$message.success('运行成功');
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            })
        },
        onShowStorageChoice:function(storageDialogTarget){
            console.log("this.storageDialogTarget = " + storageDialogTarget);
            if(!this.currentGame.id){
                this.$message.warning('请先选择游戏');
                return;
            }
            // 正版和学习版游戏C盘仅仅会安装在内部存储上
            // if(storageDialogTarget === 'openDiskC_Path' && this.currentGame.nonSteam === 1){
            if(storageDialogTarget === 'openDiskC_Path'){
                this.onOpenDiskC_Path('INTERNAL_STORAGE');
                return;
            }
            this.storageDialogTarget = storageDialogTarget;
            this.storageDialogVisible = true;
        },
        onConfirmStorageChoice:function(choice){
            if(this.storageDialogTarget === 'openDiskC_Path'){
                this.onOpenDiskC_Path(choice ? 'SD_CARD' : 'INTERNAL_STORAGE');
            }
            else if(this.storageDialogTarget === 'openGameInstallPath'){
                this.onOpenGameInstallPath(choice ? 'SD_CARD' : 'INTERNAL_STORAGE');
            }
            this.storageDialogVisible = false;
        },
        // /run/media/mmcblk0p1/steamapps/compatdata/2426010261/pfx/drive_c
        onOpenDiskC_Path:function(storage){
            if(!this.currentGame.id){
                this.$message.warning('请先选择游戏');
                return;
            }
            this.lockScreen(2);
            commandRequest('GAME_SETTING', 'openDiskC_Path', {
                gameId: this.currentGame.id,
                storage:storage,
                targetPath: storage === 'INTERNAL_STORAGE' ?
                    `${STEAM_CONST.STEAM_APP_COMPAT_PATH}/${this.currentGame.id}/pfx/drive_c` :
                    `${STEAM_CONST.STEAM_SDCARD_APP_COMPAT_PATH}/${this.currentGame.id}/pfx/drive_c`
            }, 1).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                this.$message.success('运行成功');
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            })
        },
        onOpenGameInstallPath:function(storage){
            if(!this.currentGame.id){
                this.$message.warning('请先选择游戏');
                return;
            }
            this.lockScreen(2);
            commandRequest('GAME_SETTING', 'openGameInstallPath', {
                gameId: this.currentGame.id,
                storage:storage,
                targetPath: storage === 'INTERNAL_STORAGE' ?
                    `${STEAM_CONST.STEAM_APP_PATH}` :
                    `${STEAM_CONST.STEAM_SDCARD_APP_PATH}`
            }, 1).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                this.$message.success('运行成功');
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            })
        },
        onOpenTargetPath:function(path){
            this.lockScreen(2);
            commandRequest('GAME_SETTING', 'openTargetPath', {
                targetPath: path
            }, 1).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                this.$message.success('运行成功');
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            })
        },
        onGeProtonGeneralFunc:function(command){
            if(!this.currentGeProton.name){
                this.$message.warning('请先选择兼容层');
                return;
            }
            commandRequest('PROTON_PATCH', command, {
                targetProton: this.currentGeProton.name
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                // 最新补丁版本
                this.onGeProtonVersion();
                this.$message.success('运行成功');
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            })
        },
        onGeProtonVersion:function(){
            commandRequest('PROTON_PATCH', 'geProtonVersion', {
                targetProton: this.currentGeProton.name
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                const result = resp.data.data.result.trim();
                const version =result.indexOf('version:') >= 0 ? result.substring(result.indexOf('version:') + 'version:'.length, result.indexOf(')')) : '';
                const currentGeProton = JSON.parse(JSON.stringify(this.currentGeProton));
                currentGeProton.version = version;
                this.currentGeProton = currentGeProton;
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            })
        },
        readGeProtonGameConf:function(ignoreGeProton){
            const ignoreGe = ignoreGeProton || false;
            if(!ignoreGe){
                if(!this.currentGeProton.name){
                    this.$message.warning('请先选择兼容层');
                    return;
                }
            }
            if(!this.geGameOptionValue){
                this.$message.warning('请先选择要设置的游戏');
                return;
            }
            commandRequest('PROTON_PATCH', 'readGeProtonGameConfToDict', {
                targetProton: this.currentGeProton.name,
                gameId: this.geGameOptionValue,
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                if(!resp.data.data.result){
                    this.geGameOptionConf = {
                        WINE_TASKMGR: '0',
                        WINE_EXTRA_EXE: '',
                    };
                    return;
                }
                this.geGameOptionConf = JSON.parse(JSON.stringify(resp.data.data.result))
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            })
        },
        writeGeProtonGameConfContent:function(json){
            // 是否要写入启动参数, 新的多开exe方式使用启动参数的方式进行设置
            let useLaunchoptions = 0;
            if(this.main_windows === '2'){
                useLaunchoptions = 1;
            }
            const content = Object.entries(json).map(v=>{
                return `${v[0]}=${v[1]}`;
            }).sort().join('\n');
            commandRequest('PROTON_PATCH', 'writeGeProtonGameConf', {
                targetProton: this.currentGeProton.name,
                gameId: this.geGameOptionValue,
                content: content,
                originJson: json,
                useLaunchoptions: useLaunchoptions
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                this.$message.success('设置成功');
                if(useLaunchoptions === 1){
                    this.$confirm('需要重启Steam客户端程序才能让设置生效，是否现在关闭Steam客户端程序?', '提示', {
                        confirmButtonText: '确定',
                        callback: (action) => {
                            if (action === 'confirm') {
                                commandRequest('PROTON_PATCH', 'killSteamAppClient', {}).then((resp)=>{
                                    if(apiErrorAndReturn(this, resp)){
                                        return;
                                    }
                                    this.$alert(`已成功关闭Steam客户端程序，请手动点击桌面图标启动Steam客户端程序`, '提示');
                                }).catch((e)=>{
                                    console.error(e);
                                    this.$message.error(e.message);
                                });
                            }
                        }
                    });
                }
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            })
        },
        updateGeProtonGameConf: function(json){
            for(const v in json){
                this.geGameOptionConf[v] = json[v];
            }
            this.writeGeProtonGameConfContent(this.geGameOptionConf);
            this.geGameOptionConf = JSON.parse(JSON.stringify(this.geGameOptionConf))
        },
        updateGeProtonAttachGame: function(ignoreGeProton){
            const ignoreGe = ignoreGeProton || false;
            if(!ignoreGe){
                if(!this.currentGeProton.name){
                    this.$message.warning('请先选择兼容层');
                    return;
                }
                if(!this.currentGeProton.version){
                    this.$message.warning('兼容层未打补丁');
                    return;
                }
                if(this.currentGeProton.version === '1.0.0'){
                    this.$message.warning('兼容层补丁版本太低，请重新打补丁');
                    return;
                }
            }
            openFileSelector(this, (filePath, fileType)=>{
                if(!filePath){
                    this.$confirm('取消当游戏运行时 启动附件exe应用程序', '是否取消?', {
                        confirmButtonText: '确定',
                        callback: (action) => {
                            if (action === 'confirm') {
                                this.updateGeProtonGameConf({WINE_EXTRA_EXE:''});
                            }
                        }
                    });
                    return;
                }
                let path = filePath;
                console.log(`path:${path}`);
                if(new RegExp("[\\u4E00-\\u9FFF]+", "g").test(path) || path.indexOf(' ') >= 0){
                    this.$message.warning('文件路径或文件名不能包含中文或空格!');
                    return;
                }
                // 选择了目录
                if(path){
                    this.geGameOptionConf['WINE_CHEATENGINE'] = 0;
                    this.geGameOptionConf['WINE_FLINGTRAINER'] = 0;
                    this.updateGeProtonGameConf({WINE_EXTRA_EXE:path, WINE_CHEATENGINE:'0', WINE_FLINGTRAINER:'0'});
                }
            })
        },
        updateGeProtonTaskmgr: function(ignoreGeProton){
            const ignoreGe = ignoreGeProton || false;
            if(!ignoreGe){
                if(!this.currentGeProton.name){
                    this.$message.warning('请先选择兼容层');
                    return;
                }
                if(!this.currentGeProton.version){
                    this.$message.warning('兼容层未打补丁');
                    return;
                }
                if(this.currentGeProton.version === '1.0.0'){
                    this.$message.warning('兼容层补丁版本太低，请重新打补丁');
                    return;
                }
            }
            if(this.geGameOptionConf['WINE_TASKMGR'] == '0'){
                this.geGameOptionConf['WINE_TASKMGR'] = '1'
            }
            else {
                this.geGameOptionConf['WINE_TASKMGR'] = '0'
            }
            this.updateGeProtonGameConf({WINE_TASKMGR:this.geGameOptionConf['WINE_TASKMGR']});
        },
        updateGeProtonCheat: function(cheatTools, ignoreGeProton){
            const ignoreGe = ignoreGeProton || false;
            if(!ignoreGe){
                if(!this.currentGeProton.name){
                    this.$message.warning('请先选择兼容层');
                    return;
                }
                if(!this.currentGeProton.version){
                    this.$message.warning('兼容层未打补丁');
                    return;
                }
                if(this.currentGeProton.version === '1.0.0'){
                    this.$message.warning('兼容层补丁版本太低，请重新打补丁');
                    return;
                }
            }
            const cheatAppPath = (cheatTools == 'CheatEngine') ?  `${this.appSetting.user_home_path}/${STEAM_CONST.APP_WINDOWS_APP_PATH}/CheatEngine/CheatEngine.exe` :
                `${this.appSetting.user_home_path}/${STEAM_CONST.APP_WINDOWS_APP_PATH}/FLiNGTrainer/FLiNGTrainer.exe`;
            commandRequest('GAME_SETTING', 'ioCtl', {
                ctl: 'file_exist',
                src: cheatAppPath
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                let exist = resp.data.data.result || false;
                if(!exist){
                    this.$alert(`没有安装该软件, 请到"软件中心"->"windows软件"下载`);
                    return;
                }
                // 设置开启或关闭
                if(cheatTools == 'CheatEngine'){
                    this.geGameOptionConf['WINE_CHEATENGINE'] = (this.geGameOptionConf['WINE_CHEATENGINE'] == '0') ? '1' : '0';
                    if(this.geGameOptionConf['WINE_CHEATENGINE'] == '1'){
                        this.geGameOptionConf['WINE_FLINGTRAINER'] = 0;
                        this.geGameOptionConf['WINE_EXTRA_EXE'] = cheatAppPath;
                    }
                    else {
                        this.geGameOptionConf['WINE_EXTRA_EXE'] = '';
                    }
                    this.updateGeProtonGameConf({WINE_CHEATENGINE:this.geGameOptionConf['WINE_CHEATENGINE'], WINE_FLINGTRAINER:this.geGameOptionConf['WINE_FLINGTRAINER'], WINE_EXTRA_EXE:this.geGameOptionConf['WINE_EXTRA_EXE']});
                }
                else {
                    this.geGameOptionConf['WINE_FLINGTRAINER'] = (this.geGameOptionConf['WINE_FLINGTRAINER'] == '0') ? '1' : '0';
                    if(this.geGameOptionConf['WINE_FLINGTRAINER'] == '1'){
                        this.geGameOptionConf['WINE_CHEATENGINE'] = 0;
                        this.geGameOptionConf['WINE_EXTRA_EXE'] = cheatAppPath;
                    }
                    else {
                        this.geGameOptionConf['WINE_EXTRA_EXE'] = '';
                    }
                    this.updateGeProtonGameConf({WINE_CHEATENGINE:this.geGameOptionConf['WINE_CHEATENGINE'], WINE_FLINGTRAINER:this.geGameOptionConf['WINE_FLINGTRAINER'], WINE_EXTRA_EXE:this.geGameOptionConf['WINE_EXTRA_EXE']});
                }
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            });
        },
        onChangeGeProtonGame:function() {
            if(!this.currentGeProton.name){
                this.$message.warning('请先选择兼容层');
                this.geGameOptionValue = '';
                return;
            }
            this.readGeProtonGameConf();
        },
        onSystemToolsDownload(index, row){
            window.open(row.url);
        },
        onSystemToolsShowPath(index, row){
            this.onOpenTargetPath(STEAM_CONST.STEAM_COMPAT_TOOL_PATH);
        },
        onArchiveInstallFromDownloadPath(index, row, systemTools){
            const softwarePath = `${this.appSetting.user_home_path}/Downloads`;
            commandRequest('GAME_SETTING', 'ioCtl', {
                ctl: 'list',
                src: softwarePath
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                let fileList = resp.data.data.result || [];
                console.log(`fileList: ${JSON.stringify(fileList)}`)
                fileList = fileList.map(v=>{
                    return v.name;
                });

                fileList = fileList.filter(v=>v.indexOf(row.key) >= 0); // 利用key搜索
                fileList = fileList.filter(v=>{
                    return ARCHIVE_FILE_SUFFIX.some(vv=>v.endsWith(vv));// 后缀名要满足
                });
                // Proton兼容层暂只支持tar类型压缩包, 去除zip包后缀
                if(systemTools === 1){
                    fileList = fileList.filter(v=>!v.endsWith(".zip"));
                }
                if(fileList.length === 0){
                    this.$alert(row.name + " 不在用户下载目录(Downloads)下");
                    return;
                }
                this.softwareDialogOptions = fileList.map(v=>{
                    return {
                        value: v.toString(),
                        label: v.toString(),
                    }
                });
                this.softwareInfo = JSON.parse(JSON.stringify(row));
                this.softwareInfo.systemTools = systemTools || 0; // 系统工具
                // 找到了文件, 弹选择框安装
                this.softwareDialogVisible = true;
                this.softwareDialogOptionsValue = this.softwareDialogOptions[0]; // 默认选中第一个(不生效)
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            })
        },
        onSoftwareDownload(index, row){
            window.open(row.url);
        },
        onSoftwareShowPath(index, row){
            this.onOpenTargetPath(`${this.appSetting.user_home_path}/${STEAM_CONST.APP_WINDOWS_APP_PATH}`);
        },
        onConfirmInstallSoftware(){
            this.softwareInfo.fileSelected = this.softwareDialogOptionsValue;
            const isProton =  /GE-Proton[\d]+-[\d]+/g.test(this.softwareInfo.name) && this.softwareInfo.systemTools === 1;
            if(isProton){
                this.onConfirmInstallProton(isProton);
                this.softwareDialogVisible = false;
                return;
            }
            // 普通的小软件安装
            let dstPath = `${this.appSetting.user_home_path}/${STEAM_CONST.APP_WINDOWS_APP_PATH}`;
            const srcPath = `${this.appSetting.user_home_path}/Downloads/${this.softwareInfo.fileSelected}`;
            // 是否已安装相同版本的软件?
            commandRequest('GAME_SETTING', 'ioCtl', {
                ctl: 'file_exist',
                src: `${dstPath}/${this.softwareInfo.name}`
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                let exist = resp.data.data.result || false;
                if(exist){
                    this.$alert(`目录:${dstPath}已安装了该软件`);
                    return;
                }
                // 解压压缩包方式安装(阻塞安装)
                // const loading = this.$loading({
                //     lock: true,
                //     text: '安装中',
                //     spinner: 'el-icon-loading',
                //     background: 'rgba(0, 0, 0, 0.7)'
                // });
                this.lockScreen(999, '安装中');
                commandRequest('GAME_SETTING', 'ioCtl', {
                    ctl: 'decompress_to',
                    src: srcPath,
                    dst: dstPath,
                }).then((resp)=>{
                    // loading.close();
                    this.lockScreenClear();
                    if(apiErrorAndReturn(this, resp)){
                        return;
                    }
                    this.$alert(`安装软件${this.softwareInfo.name}到${dstPath}成功`);
                }).catch((e)=>{
                    // loading.close();
                    this.lockScreenClear();
                    console.error(e);
                    this.$message.error(e.message);
                })
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            });
            this.softwareDialogVisible = false;
        },
        onConfirmInstallProton(){
            let dstPath = `${this.appSetting.user_home_path}/${STEAM_CONST.STEAM_COMPAT_TOOL_PATH}`;
            const srcPath = `${this.appSetting.user_home_path}/Downloads/${this.softwareInfo.fileSelected}`;
            // 是否已安装相同版本的软件?
            commandRequest('GAME_SETTING', 'ioCtl', {
                ctl: 'file_exist',
                src: `${dstPath}/${this.softwareInfo.name}`
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                let exist = resp.data.data.result || false;
                if(exist){
                    this.$alert(`目录:${dstPath}已安装了该软件`);
                    return;
                }
                // const loading = this.$loading({
                //     lock: true,
                //     text: '安装中',
                //     spinner: 'el-icon-loading',
                //     background: 'rgba(0, 0, 0, 0.7)'
                // });
                this.lockScreen(999, '安装中');
                // 解压压缩包方式安装(使用同步任务)
                commandRequest('GAME_SETTING', 'untar_huge_file', {
                    src: srcPath,
                    dst: dstPath,
                }).then((resp)=>{
                    // loading.close();
                    this.lockScreenClear();
                    if(apiErrorAndReturn(this, resp)){
                        return;
                    }
                    this.$alert(`安装兼容层${this.softwareInfo.name}到${dstPath}成功`);
                }).catch((e)=>{
                    this.lockScreenClear();
                    // loading.close();
                    console.error(e);
                    this.$message.error(e.message);
                })
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            });
        },
        onSystemToolsInstall(index, row){
            this.onConfirmInstallSystemToolsScript(row, (installed)=>{
                if(installed){
                    this.$message.success("该工具已安装");
                    return;
                }
                // 启动安装脚本
                commandRequest('GAME_SETTING', 'runLocalScriptWithTerminal', {
                    script_file: row.key,
                    need_sudo: 0,
                }).then((resp)=>{
                    if(apiErrorAndReturn(this, resp)){
                        // 没有设置deck密码
                        if(resp.data.code == 10){
                            setTimeout(()=>{
                                this.$message.success("请先设置【deck用户密码】，并牢记你的密码");
                                commandRequest('GAME_SETTING', 'runLocalScriptWithTerminal', {
                                    script_file: 'passwd_new_set.sh',
                                    need_sudo: 0,
                                }).then((resp)=>{
                                    if(apiErrorAndReturn(this, resp)){
                                        return;
                                    }
                                    this.$message.success("密码设置成功");
                                }).catch((e)=>{
                                });
                            }, 2000);
                        }
                        return;
                    }
                    const result = resp.data.data.result;
                    this.$message.success("安装成功");
                }).catch((e)=>{
                    console.error(e);
                });
            })
        },
        // 显示一个软件简要信息(运行状态，附加信息)的对话框
        onSystemToolsStatus(index, row){
            this.onConfirmInstallSystemToolsScript(row, (installed)=> {
                const statusText= installed ? '已安装' : '未安装';
                if(row.key === 'system_font_installer.sh'){
                    let content = `<strong>状态: ${statusText}</strong>`;
                    content += `<br/>`;
                    content += `<br/><strong>使用方式:</strong>`;
                    // content += `<hr/>`;
                    content += `<br/>请在"游戏"->"属性"->"启动选项"中:<br/>添加LANG=zh_CN.utf8 %command% 启用简体语言环境;<br/>添加LANG=zh_HK.utf8 %command% 启用繁体语言环境;`;
                    content += `<br/><img style="width:380px;border:none;" src="helper_images/help_system_font_installer_p1.png">`;
                    this.$alert(content, '软件信息', {
                        dangerouslyUseHTMLString: true
                    });
                }
                if(row.key === 'sshd_installer.sh'){
                    const get_ip_command = "ip addr | grep -o -E \"inet [0-9.]+\" | grep -v 127.0.0.1 | awk '{print $2}'";
                    // const get_ip_command = "ipconfig | grep  -o -E \" [0-9.]+\" | grep 1"; // test in windows
                    commandRequest('GAME_SETTING', 'runShellCommand', {
                        command: get_ip_command
                    }).then((resp)=>{
                        if(apiErrorAndReturn(this, resp)){
                            return;
                        }
                        let content = `<strong>状态: ${statusText}</strong>`;
                        // 附加连接信息
                        if(installed){
                            content += `<br/>`;
                            content += `<br/><strong>使用WinSCP, MobaXterm等软件填写以下的信息即可连接:</strong>`;
                            content += `<hr/>`;
                            const result = resp.data.data.result;
                            const ipAddr = result.trim() ? `ip地址(主机名):${result.trim()}` : `ip地址(主机名):桌面模式下查看右下角的连接信息`;
                            content += `<br/><strong>${ipAddr}</strong>`;
                            content += `<br/><strong>端口: 22</strong>`;
                            content += `<br/><strong>用户名: deck</strong>`;
                            content += `<br/><strong>密码: 【deck用户密码】</strong>`;
                        }
                        console.log(content);
                        this.$alert(content, '软件信息', {
                            dangerouslyUseHTMLString: true
                        });
                    }).catch((e)=>{
                        console.error(e);
                    });
                }
            });
        },
        // 判断系统是否已安装对应linux脚本
        onConfirmInstallSystemToolsScript(tools, cbFunc){
            if(!tools.test_command || !tools.test_installed_condition){
                console.error("test_command or test_installed_condition not defined!");
                return false
            }
            commandRequest('GAME_SETTING', 'runShellCommand', {
                command: tools.test_command
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                const result = resp.data.data.result;
                let installed = false;
                if(tools.test_installed_condition == 'GT_ZERO'){
                    if(parseInt(result.trim()) > 0){
                        installed = true
                    }
                }
                if(typeof cbFunc ==='function'){
                    cbFunc(installed)
                }
            }).catch((e)=>{
                console.error(e);
            });
        },
        onHandleCacheTapChange(tab, event){
            if (tab.name == 'shaderCache') {
                this.shaderOnlyDeleted = true;
                this.onlyDeletedDisabled = false
            }
            if (tab.name == 'compatdata') {
                this.shaderOnlyDeleted = true;
                this.onlyDeletedDisabled = true
            }
            if(this.shaderOnlyDeleted){
                this.gameCache.shaderCache = this.apiCacheReturn.shaderCacheWithoutInstalled;
                this.gameCache.compatdata = this.apiCacheReturn.compatdataWithoutInstalled;
            }
            else {
                this.gameCache.shaderCache = this.apiCacheReturn.shaderCache;
                this.gameCache.compatdata = this.apiCacheReturn.compatdata;
            }
        },
        onDoCleanCache() {
            const pathToDel = this.multipleSelection.map(v=>v.path);
            this.lockScreen(999, "正在清除缓存, 请稍后");
            commandRequest('GAME_SETTING', 'ioCtl', {
                ctl: 'del_multiple',
                src: pathToDel
            }).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                this.lockScreenClear();
                this.$alert(`清除完成, 点击确定重新刷新列表.`, '提示', {
                    confirmButtonText: '确定',
                    callback: (action) => {
                        if (action === 'confirm') {
                            this.onGetCacheFolder();
                        }
                    }
                });
            }).catch((e)=>{
                this.lockScreenClear();
                console.error(e);
                this.$message.error(e.message);
            });
        },
        onConfirmCleanCache(rows) {
            if(this.multipleSelection.length === 0){
                this.$message.warning('请先选择对应的缓存目录');
                return;
            }
            console.log(`onConfirmCleanCache: ${JSON.stringify(this.multipleSelection)}`);
            let sumSize = Number(0);
            this.multipleSelection.forEach((v)=>{
               sumSize += Number(v.size);
            });
            let notifyText = ``;
            if(this.cacheTabActiveName === 'shaderCache'){
                notifyText = `预计回收${sumSize}MB存储空间`;
            }
            else {
                notifyText = `清除兼容层缓存可能会导致重要游戏数据(如本地存档)丢失，建议先备份游戏数据再清除，是否要继续清空缓存?(预计回收${sumSize}MB存储空间)`;
            }
            this.$confirm(notifyText, '是否继续', {
                confirmButtonText: '确定',
                cancelButtonText: '放弃清空',
                callback: (action) => {
                    if (action === 'confirm') {
                        this.onDoCleanCache();
                    }
                }
            });
        },
        handleSelectionChange(val) {
            this.multipleSelection = val;
        },
        onChangeCacheCheckbox(val) {
            if(val){
                this.gameCache.shaderCache = this.apiCacheReturn.shaderCacheWithoutInstalled;
                this.gameCache.compatdata = this.apiCacheReturn.compatdataWithoutInstalled;
            }
            else {
                this.gameCache.shaderCache = this.apiCacheReturn.shaderCache;
                this.gameCache.compatdata = this.apiCacheReturn.compatdata;
            }
        },
        onGetCacheFolder() {
            // 获取游戏缓存数据(阻塞加载)
            this.lockScreen(999, "正在计算缓存目录占用空间，可能需要一段时间.");
            commandRequest('GAME_SETTING', 'getCacheFolder', {}).then((resp)=>{
                this.lockScreenClear();
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                const result = resp.data.data.result;
                // console.log(`getCacheFolder: ${JSON.stringify(result)}`);
                this.apiCacheReturn = parseCacheInfoToJson(result);
                console.log(`cacheInfo: ${JSON.stringify(this.apiCacheReturn)}`);
                if(this.shaderOnlyDeleted){
                    this.gameCache.shaderCache = this.apiCacheReturn.shaderCacheWithoutInstalled;
                    this.gameCache.compatdata = this.apiCacheReturn.compatdataWithoutInstalled;
                }
                else {
                    this.gameCache.shaderCache = this.apiCacheReturn.shaderCache;
                    this.gameCache.compatdata = this.apiCacheReturn.compatdata;
                }
            }).catch((e)=>{
                this.lockScreenClear();
                console.error(e);
            });
        },
        onBeforeFileSelectorOpen(){
            // 初始化fileSelector实例
            this.fileSelectorValue = '';
            this.fileSelectorFe = fileSelectorInit(this.appSetting.user_home_path, this.appSetting.system_root_path, (fe, eventName, data)=>{
                if(eventName === 'onrefresh'){
                    const path = data.GetPathIDs().join('/');
                    commandRequest('GAME_SETTING', 'ioCtl', {
                        ctl: 'list',
                        src: path
                    }).then((resp)=>{
                        if(apiErrorAndReturn(this, resp)){
                            return;
                        }
                        let fileList = resp.data.data.result || [];
                        fileList = fileList.map(v=>{
                            return {
                                name: v.name,
                                id: v.name,
                                hash: v.name,
                                type: (v.dir === 1 || v.symlink === 1) ? 'folder' : 'file',
                            }
                        });
                        // console.log(fileList);
                        if(fe.IsMappedFolder(data)){
                            data.SetEntries(fileList);
                        }
                    }).catch((e)=>{
                        console.error(e);
                        this.$message.error(e.message);
                    });
                }
                if(eventName === 'onfocus'){
                    if(data.entryType === 'file' && data.entryId){
                        console.log(`select file: ${data.filePath}`);
                        this.fileSelectorValue = data.filePath;
                    }
                }
            });
        },
        onConfirmFileChoice(confirm){
          if(!confirm){
              this.fileSelectorValue = '';
          }
          this.fileSelectorDialogVisible = false;
        },
        onFileSelectorClose(){
            console.log('onFileSelectorClose');
            // this.onConfirmFileChoice(false);
            this.fileSelectorDialogVisible = false;
            if(this.fileSelectorFe != null){
                this.fileSelectorFe.Destroy();
                this.fileSelectorFe = null;
            }
        },
        onChangeWindows:function () {
            if(this.main_windows === '1'){
                commandRequest('GAME_SETTING', 'gameList', {}).then((resp)=>{
                    if(apiErrorAndReturn(this, resp)){
                        return;
                    }
                    const result = resp.data.data.result;
                    const pattg = /.* \([\d]{2,}\)/g;
                    let gameList = result.match(pattg) || [];
                    gameList = gameList.map(v=>{
                        const id = v.substring(v.indexOf('(')+1, v.indexOf(')'));
                        return {
                            id: id,
                            name: v.substring(0, v.indexOf('(')).replace('Non-Steam shortcut:', ''),
                            nonSteam: v.indexOf('Non-Steam shortcut') >=0 ? 1 : 0,
                            diskC_Path: '.local/share/Steam/steamapps/compatdata/' + id + '/pfx/drive_c',
                        }
                    });
                    // console.log(JSON.stringify(gameList));
                    this.gameList = gameList;
                }).catch((e)=>{
                    console.error(e);
                    this.$message.error(e.message);
                })
            }
            if(this.main_windows === '2'){
                commandRequest('GAME_SETTING', 'gameListAll', {}).then((resp)=>{
                    if(apiErrorAndReturn(this, resp)){
                        return;
                    }
                    const result = resp.data.data.result;
                    let gameList = result.map(v=>{
                        // const id = v.substring(v.indexOf('(')+1, v.indexOf(')'));
                        return {
                            id: new String(v.id),
                            name: v.name.replace('Non-Steam shortcut:', ''),
                            nonSteam: v.name.indexOf('Non-Steam shortcut') >=0 ? 1 : 0,
                            diskC_Path: '.local/share/Steam/steamapps/compatdata/' + v.id + '/pfx/drive_c',
                        }
                    });
                    gameList = gameList.filter(v=> v.id!== 'null' && v.name.indexOf('Proton') < 0 && v.name.indexOf('Steam Linux Runtime') < 0 );
                    // console.log(JSON.stringify(gameList));
                    this.gameListAll = gameList;
                }).catch((e)=>{
                    console.error(e);
                    this.$message.error(e.message);
                })
            }
            else if(this.main_windows === '3'){
                this.$alert(`建议使用'多开exe(新版)'来实现功能, 该旧版功能可能在未来版本中移除.`);

                this.geGameOptionValue = '';
                commandRequest('PROTON_PATCH', 'geProtonList', {}).then((resp)=>{
                    if(apiErrorAndReturn(this, resp)){
                        return;
                    }
                    const result = resp.data.data.result;
                    const pattg = /GE-Proton[\d]+-[\d]+/g;
                    let geProtonList = result.match(pattg) || [];
                    geProtonList = geProtonList.map(v=>{
                        return {
                            name: v
                        }
                    });
                    this.geProtonList = geProtonList;

                    this.geGameOptions = this.gameList.map(v=>{
                        return {
                            value:v.id,
                            label:`${v.name}(${v.id})`,
                        }
                    });
                    if(geProtonList.length === 0){
                        this.$alert(`检测到没有安装GE-Proton兼容层, 请到"软件中心"->"系统工具"下载`);
                    }
                }).catch((e)=>{
                    console.error(e);
                    this.$message.error(e.message);
                })
            }
            else if(this.main_windows === '5'){
                this.onGetCacheFolder();
            }


        }
    },

    mounted: function () {
        this.onChangeWindows();
        // 先检查protontricks是否已安装
        commandRequest('GAME_SETTING', 'checkProtontricksInstalled', {}).then((resp)=>{
            if(apiErrorAndReturn(this, resp)){
                return;
            }
            this.checkAppOnlineVersion();
        }).catch((e)=>{
            console.error(e);
            this.$message.error(e.message);
        });

        // 轮询异步任务的请求结果
        fetch_async_task_ticker = setInterval(()=>{
            commandRequest('GAME_SETTING', 'fetch_async_task_result', {}).then((resp)=>{
                if(apiErrorAndReturn(this, resp)){
                    return;
                }
                if(resp.data.data && resp.data.data.length > 0){
                    this.onHandlerAsyncTaskError(resp.data.data);
                }
            }).catch((e)=>{
                console.error(e);
                this.$message.error(e.message);
            });
        }, 30000);
        this.onGetAppSetting();


    },
    created: function() {
        window.onload = function () {
            window.onbeforeunload = function () {
                clearInterval(fetch_async_task_ticker);
                // 关闭python应用
                axios({
                    method: 'get',
                    url: '/app/exit'
                }).then(resp=>{
                    this.$alert('程序已关闭', '提示', {
                        confirmButtonText: '确定',
                    });
                });
                return "Do you really want to close?";
            };
        }
    }
});