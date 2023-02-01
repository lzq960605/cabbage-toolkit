import os
import shutil
import time

from app_const import PROTONTRICKS_CMD_PREFIX, APP_GE_PROTON_CONF_PATH, APP_VERSION, APP_HOME_PATH, APP_DOWNLOADS_PATH, \
    APP_PROGRAM_PATH
from dev_mock import WINDOWS_MOCK_GAME_LIST, WINDOWS_MOCK_FILE_SELECTOR_RESULT, WINDOWS_MOCK
from steam import STEAM_COMPAT_TOOL_PATH
from util import is_protontricks_installed, get_system_folder_opener, runShellCommand, get_user_homepath

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

RUN_NATIVE_FILE_SELECTOR = "FILE=`zenity --file-selection --title=\"选择文件\"` && echo \"select file:$FILE\""

RUN_MAKE_GE_PROTON_PATCH_CMDLINE = "curl -s https://gitee.com/cabbage-v50-steamdeck/ge-proton-patch/raw/feature-v1.1.0/extra_exe_patch.sh  | bash -s patch {}"
RUN_MAKE_GE_PROTON_REVERT_PATCH_CMDLINE = "curl -s https://gitee.com/cabbage-v50-steamdeck/ge-proton-patch/raw/feature-v1.1.0/extra_exe_patch.sh  | bash -s revert {}"
RUN_GET_ONLINE_VERSION_CMDLINE = "curl -s https://gitee.com/cabbage-v50-steamdeck/cabbage-toolkit/raw/master/app_const.py | grep APP_VERSION | awk -F '=' '{print $2}'"
RUN_GET_ONLINE_SETTING_CMDLINE = "curl -s https://gitee.com/cabbage-v50-steamdeck/cabbage-toolkit/raw/master/app_center_setting.json"
RUN_CLONE_NEWEST_CODE_CMDLINE = "git clone https://gitee.com/cabbage-v50-steamdeck/cabbage-toolkit.git  {}"


class CmdHandler(object):
    def __init__(self, category, command, params):
        self.category = category  # GAME_SETTING, PROTON_PATCH
        self.command = command
        self.params = params

    def handle(self):
        print('ready to handle: %s, %s' % (self.command, self.params))
        errmsg = ''
        code = 0
        data = None
        try:
            data = getattr(self, self.command)()
        except Exception as e:
            print('invoke method error:', e)
            errmsg = str(e)
            code = -1
        finally:
            pass

        return code, errmsg, data

    # ========= 私有方法 =========

    def checkProtontricksInstalled(self):
        return is_protontricks_installed()

    def gameList(self):
        dict_data = runShellCommand(PROTONTRICKS_CMD_PREFIX + " -l")
        if WINDOWS_MOCK:
            dict_data['result'] = WINDOWS_MOCK_GAME_LIST
            dict_data['cmdCode'] = 0

        return dict_data

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
        dict_data = runShellCommand(PROTONTRICKS_CMD_PREFIX + RUN_EXE_CMDLINE.format(self.params['targetPath'],
                                                                                     self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def runBat(self):
        dict_data = runShellCommand(PROTONTRICKS_CMD_PREFIX + RUN_BAT_CMDLINE.format(self.params['targetPath'],
                                                                                     self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def setAttachExe(self):
        pass

    # ========= 辅助功能 =========
    def openTaskMgr(self):
        dict_data = runShellCommand(PROTONTRICKS_CMD_PREFIX + RUN_TASKMGR_CMDLINE.format(self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def openRegedit(self):
        dict_data = runShellCommand(PROTONTRICKS_CMD_PREFIX + RUN_REGEDIT_CMDLINE.format(self.params['gameId']))
        if WINDOWS_MOCK:
            dict_data['cmdCode'] = 0

        return dict_data

    def openWineCfg(self):
        dict_data = runShellCommand(PROTONTRICKS_CMD_PREFIX + RUN_WINECFG_CMDLINE.format(self.params['gameId']))
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
        dict_data = runShellCommand(RUN_GET_ONLINE_SETTING_CMDLINE)
        config_file = get_user_homepath() + "/" + APP_HOME_PATH + \
                      "/local_app_center_setting.json"
        if dict_data['cmdCode'] == 0:
            file = open(config_file, 'w')
            file.write(dict_data['result'])
            file.close()
        # 有可能没开网络, 写一个空文件
        if not os.path.exists(config_file):
            file = open(config_file, 'w')
            file.write("")
            file.close()

        file = open(config_file, encoding="utf-8")
        content = file.read()
        file.close()
        dict_data['result'] = content
        return dict_data

    # 升级本地app到最新版本
    def updateAppToNewestVersion(self):
        # clone 最新版本到downloads目录
        code_target_path = get_user_homepath() + "/" + APP_DOWNLOADS_PATH + "/cabbage-toolkit_" + str(time.time()).replace('.', '')
        dict_data = runShellCommand(RUN_CLONE_NEWEST_CODE_CMDLINE.format(code_target_path))
        if dict_data['cmdCode'] != 0:
            return dict_data
        origin_program_path = get_user_homepath() + "/" + APP_PROGRAM_PATH + "/cabbage-toolkit"
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
        # command = "cat " + get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH + "/" + self.params['gameId'] + ".conf "
        # dict_data = runShellCommand(command)
        # conf_dict = {}
        # if dict_data['cmdCode'] == 0:
        #     for s in dict_data['result'].split("\n"):
        #         if s.strip() == "" or s.find('=') == -1:
        #             continue
        #         conf_dict[s.split('=')[0]] = s.split('=')[1]
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
        return {
            "cmdCode": 0,
            "result": "",
            "errMsg": "",
        }
