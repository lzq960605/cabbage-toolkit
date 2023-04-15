import os
import time
from pathlib import Path

import vdf
from app_const import APP_STEAM_CONFIG_BACKUP_PATH
from io_ctl import io_ctl_copy
from steam import get_steam_lib_paths, get_steam_apps
from util import get_user_homepath


class CabbageSteamApp(object):
    def __init__(self, appid):
        self.appid = appid
        self.app = self._findAppWithAppId(appid)

    def writeVdfValue(self, key, value):
        #if not self.app.shortcut_data.__contains__(key):
        #    raise Exception(" app:{} shortcut_data not contain:{}, file:{}\n 尝试修改该游戏属性的'启动选项'失败, 请反馈该问题".format(self.appid, key, self.app.shortcuts_path))
        if not os.path.exists(self.app.shortcuts_path):
            raise Exception(" app:{} shortcuts_path:{} not exist".format(self.appid, self.app.shortcuts_path))

        # 正版游戏
        if not self.isNonSteamGame():
            # 先备份配置文件
            target_file = get_user_homepath() + "/" + APP_STEAM_CONFIG_BACKUP_PATH + "/localconfig" + \
                          "/localconfig_" + time.strftime("%Y%m%d%H%M%S", time.localtime(time.time())) + ".vdf"
            io_ctl_copy(self.app.shortcuts_path, target_file)
            with open(self.app.shortcuts_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # 解析 VDF 格式(文本格式)
            data = vdf.loads(content)
            # 修改数据
            data['UserLocalConfigStore']['Software']['Valve']['Steam']['apps'][str(self.appid)][key] = value
            # 将修改后的数据写回 localconfig.vdf 文件
            with open(self.app.shortcuts_path, 'w', encoding='utf-8') as f:
                f.write(vdf.dumps(data))
        # 非steam游戏
        else:
            # 先备份配置文件
            target_file = get_user_homepath() + "/" + APP_STEAM_CONFIG_BACKUP_PATH + "/shortcuts" + \
                          "/shortcuts_" + time.strftime("%Y%m%d%H%M%S", time.localtime(time.time())) + ".vdf"
            io_ctl_copy(self.app.shortcuts_path, target_file)
            with open(self.app.shortcuts_path, "rb") as f:
                data = f.read()
            # 解析 VDF 格式(二进制格式)
            parsed_data = vdf.binary_loads(data)
            # 修改数据
            parsed_data['shortcuts'][str(self.app.shortcut_id)][key] = value
            # 将修改后的数据写回 shortcut.vdf 文件
            with open(self.app.shortcuts_path, "wb") as f:
                f.write(vdf.binary_dumps(parsed_data))


    def readVdfValue(self, key):
        if self.app.shortcut_data.__contains__(key):
            return self.app.shortcut_data[key]
        return None

    def getAppName(self):
        return self.app.name

    def getAppid(self):
        return self.appid

    def isNonSteamGame(self):
        return self.app.name.startswith("Non-Steam")

    def _findAppWithAppId(self, appid):
        user_home_path = get_user_homepath()
        steam_path = Path(user_home_path + "/" + ".local/share/Steam")
        steam_lib_paths = get_steam_lib_paths(steam_path)
        steam_apps = get_steam_apps(
            steam_root=steam_path, steam_path=steam_path,
            steam_lib_paths=steam_lib_paths
        )
        steam_appid = int(appid)
        try:
            steam_app = next(
                app for app in steam_apps
                if app.appid == steam_appid
            )
        except StopIteration:
            raise Exception("Couldn't get the steam app with appid:{}".format(steam_appid))

        return steam_app




