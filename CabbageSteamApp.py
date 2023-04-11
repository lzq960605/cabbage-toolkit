from pathlib import Path

from steam import get_steam_lib_paths, get_steam_apps
from util import get_user_homepath


class CabbageSteamApp(object):
    def __init__(self, appid):
        self.appid = appid
        self.app = self._findAppWithAppId(appid)

    def writeVdfValue(self, keyPath, value):
        pass

    def readVdfValue(self, keyPath):
        if self.app.shortcut_data.__contains__(keyPath):
            return self.app.shortcut_data[keyPath]
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
        # steam_lib_paths = steam_path
        # 5. Find any Steam apps
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




