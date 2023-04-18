import json
import os
import platform
import re
import shutil
import time
from queue import Queue
from threading import Thread

from CabbageSteamApp import CabbageSteamApp
from CmdlineExecutor import CmdlineExecutor
from ServiceException import SERVICE_EXCEPTION_USER_PASSWORD_NOT_SET, ServiceException
from app_const import APP_GE_PROTON_CONF_PATH, APP_VERSION, APP_HOME_PATH, APP_DOWNLOADS_PATH, \
    APP_PROGRAM_PATH
from dev_mock import WINDOWS_MOCK_GAME_LIST, WINDOWS_MOCK_FILE_SELECTOR_RESULT, WINDOWS_MOCK
from io_ctl import io_ctl_file_exist, io_ctl_list, io_ctl_copy, io_ctl_move, io_ctl_del, io_ctl_decompress_to, \
    io_ctl_decompression_to_with_system, io_ctl_du_path, io_ctl_del_multiple
from steam import STEAM_COMPAT_TOOL_PATH, STEAM_APP_SHADERCACHE_PATH, STEAM_APP_COMPAT_PATH
from util import is_protontricks_installed, get_system_folder_opener, runShellCommand, get_user_homepath, \
    launch_subprocess_cmd, get_protontricks_provider, get_steam_all_apps, get_system_rootpath, \
    get_steam_command_without_remote_debug

# eg: protontricks -c 'wine Z:\\\\home\\deck\\your.exe' gameId
RUN_EXE_CMDLINE = " -c 'wine {}' {}"
# eg: protontricks -c 'wine wineconsole.exe Z:\\\\home\\deck\\your.bat' gameId
RUN_BAT_CMDLINE = " -c 'wine wineconsole.exe {}' {}"
# eg: protontricks -c 'wine taskmgr.exe' gameId
RUN_TASKMGR_CMDLINE = " -c 'wine taskmgr.exe' {}"
# eg: protontricks -c 'wine regedit.exe' gameId
RUN_REGEDIT_CMDLINE = " -c 'wine regedit.exe' {}"
# eg: protontricks -c 'wine winecfg.exe' gameId
RUN_WINECFG_CMDLINE = " -c 'wine winecfg.exe' {}"
# eg: protontricks -c 'wine explorer.exe' gameId
RUN_EXPLORER_CMDLINE = " -c 'wine explorer.exe' {}"

RUN_NATIVE_FILE_SELECTOR = "FILE=`zenity --file-selection --title=\"选择文件\"` && echo \"select file:$FILE\""

LAUNCH_OPTIONS_EXTRA_EXE = "PROTON_REMOTE_DEBUG_CMD=\"{}\" PRESSURE_VESSEL_FILESYSTEMS_RW=\"$STEAM_COMPAT_DATA_PATH/pfx/drive_c:{}\" %command%"
LAUNCH_OPTIONS_TASKMGR = "LANG=zh_CN.utf8 PROTON_REMOTE_DEBUG_CMD=\"$STEAM_COMPAT_DATA_PATH/pfx/drive_c/windows/system32/taskmgr.exe\" PRESSURE_VESSEL_FILESYSTEMS_RW=\"$STEAM_COMPAT_DATA_PATH/pfx/drive_c\" %command%"

RUN_MAKE_GE_PROTON_PATCH_CMDLINE = "curl -s https://gitee.com/cabbage-v50-steamdeck/ge-proton-patch/raw/feature-v1.1.0/extra_exe_patch.sh  | bash -s patch {}"
RUN_MAKE_GE_PROTON_REVERT_PATCH_CMDLINE = "curl -s https://gitee.com/cabbage-v50-steamdeck/ge-proton-patch/raw/feature-v1.1.0/extra_exe_patch.sh  | bash -s revert {}"
RUN_GET_ONLINE_VERSION_CMDLINE = "curl -s https://gitee.com/cabbage-v50-steamdeck/cabbage-toolkit/raw/master/app_const.py | grep APP_VERSION | awk -F '=' '{print $2}'"
RUN_GET_ONLINE_SETTING_CMDLINE = "curl -s https://gitee.com/cabbage-v50-steamdeck/cabbage-toolkit/raw/master/app_center_setting.json"
RUN_CLONE_NEWEST_CODE_CMDLINE = "git clone https://gitee.com/cabbage-v50-steamdeck/cabbage-toolkit.git  {}"

async_task_result = Queue()


class CmdHandler(object):
    def __init__(self, category, command, params, async_task, api_id):
        self.category = category  # GAME_SETTING, PROTON_PATCH=
        self.command = command
        self.params = params
        self.async_task = async_task  # async task
        self.api_id = api_id  #

    def _async_task_handler(self):
        data = None
        try:
            data = getattr(self, self.command)()
        except ServiceException as se:
            print('service exception:', se)
            data = {
                "cmdCode": se.code,
                "errMsg": se.msg,
                "result": None,
            }
        except Exception as e:
            print('invoke method error:', e)
            data = {
                "cmdCode": -1,
                "errMsg": str(e),
                "result": None,
            }
        finally:
            pass
        # data = getattr(self, self.command)()
        async_task_result.put({
            "api_id": self.api_id,
            "command": self.command,
            "data": data,
        })

    def handle(self):
        print('ready to handle: %s, %s' % (self.command, self.params))
        errmsg = ''
        code = 0
        data = None
        try:
            if self.async_task == 0:
                data = getattr(self, self.command)()
            else:
                Thread(target=self._async_task_handler).start()
        except ServiceException as se:
            print('service exception:', se)
            errmsg = se.msg
            code = se.code
        except Exception as e:
            print('invoke method error:', e)
            errmsg = str(e)
            code = -1
        finally:
            pass

        return code, errmsg, data

    # ========= 常规方法 =========
    def fetch_async_task_result(self):
        result = []
        while not async_task_result.empty():
            result.append(async_task_result.get())

        return result

    def ioCtl(self):
        ctl = self.params['ctl']
        if ctl == 'file_exist':
            return {
                "cmdCode": 0,
                "result": io_ctl_file_exist(self.params['src']),
                "errMsg": "",
            }
        if ctl == 'copy':
            return {
                "cmdCode": 0,
                "result": io_ctl_copy(self.params['src'], self.params['dst']),
                "errMsg": "",
            }
        if ctl == 'move':
            return {
                "cmdCode": 0,
                "result": io_ctl_move(self.params['src'], self.params['dst']),
                "errMsg": "",
            }
        if ctl == 'del':
            return {
                "cmdCode": 0,
                "result": io_ctl_del(self.params['src']),
                "errMsg": "",
            }
        if ctl == 'del_multiple':
            return {
                "cmdCode": 0,
                "result": io_ctl_del_multiple(self.params['src']),
                "errMsg": "",
            }
        if ctl == 'list':
            return {
                "cmdCode": 0,
                "result": io_ctl_list(self.params['src']),
                "errMsg": "",
            }
        if ctl == 'decompress_to':
            return {
                "cmdCode": 0,
                "result": io_ctl_decompress_to(self.params['src'], self.params['dst']),
                "errMsg": "",
            }
        return {
            "cmdCode": -1,
            "result": None,
            "errMsg": "io_ctl未定义",
        }

    def untar_huge_file(self):
        src = self.params['src']
        dst = self.params['dst']
        plat = platform.system().lower()
        if plat == 'windows':
            src = src.replace("C:", "/c").replace("\\", "/")
            dst = dst.replace("C:", "/c").replace("\\", "/")

        return {
            "cmdCode": 0,
            "result": io_ctl_decompression_to_with_system(src, dst),
            "errMsg": "",
        }

    def checkProtontricksInstalled(self):
        return is_protontricks_installed()


    def runLocalScriptWithTerminal(self):
        need_sudo = self.params['need_sudo']
        if need_sudo == 1:
            self.checkDeckUserPasswordSet()
        script_file = self.params['script_file']
        script_file_path = os.path.join(get_user_homepath(), APP_PROGRAM_PATH, "system_tools_script", script_file)
        executor = CmdlineExecutor("")
        return executor.exec_script_with_new_terminal(script_file_path)


    def checkDeckUserPasswordSet(self):
        command = "passwd  --status $USER | awk '{print $2}'"
        executor = CmdlineExecutor(command)
        resp = executor.exec_with_popen()
        if resp['cmdCode'] == 0:
            if resp['result'].strip() != 'P':
                raise ServiceException(SERVICE_EXCEPTION_USER_PASSWORD_NOT_SET)

    def runShellCommand(self):
        command = self.params['command']
        executor = CmdlineExecutor(command)
        return executor.exec_with_popen()

    def gameList(self):
        dict_data = runShellCommand(get_protontricks_provider() + " -l")
        if WINDOWS_MOCK:
            dict_data['result'] = WINDOWS_MOCK_GAME_LIST
            dict_data['cmdCode'] = 0

        return dict_data


    def gameListAll(self):
        apps = get_steam_all_apps()
        return {
            "cmdCode": 0,
            "result": list(map(lambda v:{'id':v.appid, 'name':v.name}, apps)),
            "errMsg": ''
        }

    def gameListInfo(self):
        dict_data = self.gameList()
        reg = "(.* \([\d]{2,}\))"
        gameList = re.findall(reg, dict_data['result'])
        return gameList



    def geProtonList(self):
        command = "ls " + get_user_homepath() + "/" + STEAM_COMPAT_TOOL_PATH + \
                  " -l | grep GE-Proton | grep -v '.zip' | grep -v '.tar' | awk '{print $9}'"
        dict_data = runShellCommand(command)
        # if WINDOWS_MOCK:
        #     dict_data['result'] = WINDOWS_MOCK_GE_PROTON_LIST
        #     dict_data['cmdCode'] = 0

        return dict_data

    def openFileSelector(self):
        dict_data = runShellCommand(RUN_NATIVE_FILE_SELECTOR)
        if WINDOWS_MOCK:
            dict_data['result'] = WINDOWS_MOCK_FILE_SELECTOR_RESULT
            dict_data['cmdCode'] = 0

        return dict_data

    # ========= 游戏设置 =========
    def runExe(self):
        dict_data = runShellCommand(get_protontricks_provider() + RUN_EXE_CMDLINE.format(self.params['targetPath'],
                                                                                         self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def runBat(self):
        dict_data = runShellCommand(get_protontricks_provider() + RUN_BAT_CMDLINE.format(self.params['targetPath'],
                                                                                         self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def setAttachExe(self):
        pass

    # ========= 辅助功能 =========
    def openTaskMgr(self):
        dict_data = runShellCommand(get_protontricks_provider() + RUN_TASKMGR_CMDLINE.format(self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def openRegedit(self):
        dict_data = runShellCommand(get_protontricks_provider() + RUN_REGEDIT_CMDLINE.format(self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def openWineCfg(self):
        dict_data = runShellCommand(get_protontricks_provider() + RUN_WINECFG_CMDLINE.format(self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def openExplorer(self):
        dict_data = runShellCommand(get_protontricks_provider() + RUN_EXPLORER_CMDLINE.format(self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def openDiskC_Path(self):
        opener = get_system_folder_opener()
        if not opener:
            raise Exception("Couldn't found folder opener, open folder failed!")
        dict_data = runShellCommand(opener + " " + self.params['targetPath'])
        return dict_data

    def openGameInstallPath(self):
        opener = get_system_folder_opener()
        if not opener:
            raise Exception("Couldn't found folder opener, open folder failed!")
        dict_data = runShellCommand(opener + " " + self.params['targetPath'])
        return dict_data

    # 打开用户Home目录下的任意目录
    def openTargetPath(self):
        opener = get_system_folder_opener()
        if not opener:
            raise Exception("Couldn't found folder opener, open folder failed!")
        dict_data = runShellCommand(opener + " " + self.params['targetPath'])
        return dict_data

    # ========= 兼容层功能 =========
    def makeGeProtonPatch(self):
        dict_data = runShellCommand(RUN_MAKE_GE_PROTON_PATCH_CMDLINE.format(self.params['targetProton']))
        # if WINDOWS_MOCK:
        #     dict_data['cmdCode'] = 0

        return dict_data

    def revertGeProtonPatch(self):
        dict_data = runShellCommand(RUN_MAKE_GE_PROTON_REVERT_PATCH_CMDLINE.format(self.params['targetProton']))
        # if WINDOWS_MOCK:
        #     dict_data['cmdCode'] = 0

        return dict_data

    def geProtonVersion(self):
        command = "cat " + get_user_homepath() + "/" + STEAM_COMPAT_TOOL_PATH + "/" + self.params[
            'targetProton'] + "/proton " \
                              " | grep 'author:kong'"
        dict_data = runShellCommand(command)
        dict_data['cmdCode'] = 0
        # if WINDOWS_MOCK:
        #     dict_data['result'] = WINDOWS_MOCK_PROTON_VERSION
        #     dict_data['cmdCode'] = 0

        return dict_data

    # 检测应用的在线版本, 若在线的版本比较新，返回在线版本
    def checkAppOnlineVersion(self):
        dict_data = runShellCommand(RUN_GET_ONLINE_VERSION_CMDLINE)
        if dict_data['cmdCode'] == 0:
            online_version = dict_data['result'].replace("\"", "").strip()
            online_version_number = online_version.split('.')
            local_version_number = APP_VERSION.split('.')
            if len(online_version_number) == len(local_version_number) and len(online_version_number) == 3:
                if 100 * int(online_version_number[0]) + 10 * int(online_version_number[1]) + int(
                        online_version_number[2]) \
                        > 100 * int(local_version_number[0]) + 10 * int(local_version_number[1]) + int(
                    local_version_number[2]):
                    dict_data['result'] = {
                        "need_update": 1,
                        "version": online_version
                    }
                    return dict_data

        dict_data['result'] = {
            "need_update": 0,
            "version": dict_data['result']
        }
        return dict_data

    # 获取app的设置
    def getAppSetting(self):
        # 先获取线上的配置, 覆盖本地的配置
        # dict_data = runShellCommand(RUN_GET_ONLINE_SETTING_CMDLINE)
        msg, errMsg, cmdCode = launch_subprocess_cmd(RUN_GET_ONLINE_SETTING_CMDLINE)
        dict_data = {
            "cmdCode": cmdCode,
            "result": msg.decode('UTF-8'),
            "errMsg": errMsg.decode('UTF-8')
        }
        config_file = get_user_homepath() + "/" + APP_HOME_PATH + \
                      "/local_app_center_setting.json"
        if dict_data['cmdCode'] == 0:
            file = open(config_file, 'w', encoding="utf-8")
            file.write(dict_data['result'])
            file.close()
        # 有可能没开网络, 写一个空文件
        if not os.path.exists(config_file):
            file = open(config_file, 'w', encoding="utf-8")
            file.write("")
            file.close()

        file = open(config_file, encoding="utf-8")
        content = file.read()
        file.close()
        if content == "":
            dict_data['result'] = ""
            return dict_data
        content_dict = json.loads(content)
        content_dict['version'] = APP_VERSION
        content_dict['user_home_path'] = get_user_homepath()
        content_dict['system_root_path'] = get_system_rootpath()
        dict_data['result'] = json.dumps(content_dict)
        return dict_data

    # 升级本地app到最新版本
    def updateAppToNewestVersion(self):
        # clone 最新版本到downloads目录
        code_target_path = get_user_homepath() + "/" + APP_DOWNLOADS_PATH + "/cabbage-toolkit_" + str(
            time.time()).replace('.', '')
        dict_data = runShellCommand(RUN_CLONE_NEWEST_CODE_CMDLINE.format(code_target_path))
        if dict_data['cmdCode'] != 0:
            return dict_data
        # origin_program_path = get_user_homepath() + "/" + APP_PROGRAM_PATH + "/cabbage-toolkit"
        origin_program_path = get_user_homepath() + "/" + APP_PROGRAM_PATH
        # 先彻底删掉原来的程序
        if os.path.exists(origin_program_path):
            shutil.rmtree(origin_program_path)
        # 移动并重命名为: cabbage-toolkit
        shutil.move(code_target_path, origin_program_path)
        return dict_data

    # 持久化接口-读取兼容层游戏配置
    def readGeProtonGameConf(self):
        command = "cat " + get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH + "/" + self.params['gameId'] + ".conf "
        dict_data = runShellCommand(command)
        dict_data['cmdCode'] = 0
        return dict_data

    def readGeProtonGameConfToDict(self):
        config_file = get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH + \
                      "/" + self.params['gameId'] + ".conf"
        if not os.path.exists(config_file):
            return {
                "cmdCode": 0,
                "result": None,
                "errMsg": "",
            }
        file = open(config_file, encoding="utf-8")
        content = file.read()
        file.close()
        conf_dict = {}
        for s in content.split("\n"):
            if s.strip() == "" or s.find('=') == -1:
                continue
            conf_dict[s.split('=')[0].strip()] = s.split('=')[1].replace("/r", "")
        return {
            "cmdCode": 0,
            "result": conf_dict,
            "errMsg": "",
        }

    def writeGeProtonGameConf(self):
        config_file = get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH + \
                      "/" + self.params['gameId'] + ".conf"
        if not os.path.exists(get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH):
            os.makedirs(get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH)
        file = open(config_file, 'w')
        file.write(self.params['content'])
        file.close()
        # 写入启动参数
        originJson = self.params['originJson']
        if self.params['useLaunchoptions'] == 1:
            # 设置附加exe(优先级最高)
            if originJson.__contains__('WINE_EXTRA_EXE') and originJson['WINE_EXTRA_EXE'] != '':
                app = CabbageSteamApp(self.params['gameId'] + '')
                launchOptionPrev = app.readVdfValue('LaunchOptions')
                if launchOptionPrev is not None:
                    launchOptionPrev = get_steam_command_without_remote_debug(launchOptionPrev) + " "
                else:
                    launchOptionPrev=""
                app.writeVdfValue('LaunchOptions', launchOptionPrev + LAUNCH_OPTIONS_EXTRA_EXE.format(originJson['WINE_EXTRA_EXE'],
                                                                                   os.path.dirname(originJson['WINE_EXTRA_EXE'])))
            # 设置了开启任务管理器
            elif originJson.__contains__('WINE_TASKMGR') and originJson['WINE_TASKMGR'] == '1':
                app = CabbageSteamApp(self.params['gameId'] + '')
                launchOptionPrev = app.readVdfValue('LaunchOptions')
                if launchOptionPrev is not None:
                    launchOptionPrev = get_steam_command_without_remote_debug(launchOptionPrev) + " "
                else:
                    launchOptionPrev=""
                launchOptionPrev = re.sub(r'LANG=zh_CN.utf8', '', launchOptionPrev)
                app.writeVdfValue('LaunchOptions', launchOptionPrev + LAUNCH_OPTIONS_TASKMGR)
            # 清空多开exe相关的启动参数
            else:
                app = CabbageSteamApp(self.params['gameId'] + '')
                launchOptionPrev = app.readVdfValue('LaunchOptions')
                if launchOptionPrev is not None:
                    launchOptionPrev = get_steam_command_without_remote_debug(launchOptionPrev) + " "
                else:
                    launchOptionPrev=""
                launchOptionPrev = re.sub(r'LANG=zh_CN.utf8', '', launchOptionPrev)
                # 若用户自己设置了启动命令，简单地在后面加上 %command%, 可能不能处理所有情况
                if launchOptionPrev.strip() == "":
                    launchOptionPrev = ""
                else:
                    launchOptionPrev += " %command%"
                app.writeVdfValue('LaunchOptions', launchOptionPrev)

        return {
            "cmdCode": 0,
            "result": "",
            "errMsg": "",
        }

    # 获取着色器缓存/兼容层缓存文件夹列表
    def getCacheFolder(self):
        shaderCacheFolder = get_user_homepath() + "/" + STEAM_APP_SHADERCACHE_PATH
        compatdataFolder = get_user_homepath() + "/" + STEAM_APP_COMPAT_PATH
        result = {
            "shaderCache": io_ctl_du_path(shaderCacheFolder),
            "compatdata": io_ctl_du_path(compatdataFolder),
            "installed": self.gameListInfo()
        }
        return {
            "cmdCode": 0,
            "result": result,
            "errMsg": "",
        }

    # 强制退出steam客户端
    def killSteamAppClient(self):
        cmd = "ps -ef | grep -E '(steam \-steamdeck|steam.sh \-steamdeck)' | grep -v grep | awk '{print $2}' | wc -l"
        result = os.popen(cmd).read()
        # steam客户端进程未启动
        if result.strip() == "0":
            return {
                "cmdCode": 0,
                "result": None,
                "errMsg": "",
            }

        command = "ps -ef | grep -E '(steam \-steamdeck|steam.sh \-steamdeck)' | grep -v grep | awk '{print $2}' | xargs kill -9"
        return runShellCommand(command)

