
# for mock some data in windows develop ide
import platform

WINDOWS_MOCK_GAME_LIST = """
protontricks (WARNING): Flatpak version is too old (<1.12.1) to support sub-sandboxes. Disabling bwrap. --no-bwrap will be ignored.
Found the following games:
Non-Steam shortcut: DeadSpaceRemake.exe (2386592490)
Non-Steam shortcut: PAL3.exe (2401547085)
Non-Steam shortcut: font.exe (3481194002)
Non-Steam shortcut: taskmgr.exe (2683446806)
Non-Steam shortcut: taskmgr_bak.exe (3480744326)
Non-Steam shortcut: windows app (3758420005)
Non-Steam shortcut: 安装版游戏 (3603796694)
Non-Steam shortcut: 最终幻想15 (3315666250)
Plants vs. Zombies: Game of the Year (3590)

To run Protontricks for the chosen game, run:
$ protontricks APPID COMMAND

NOTE: A game must be launched at least once before Protontricks can find the game.

"""

WINDOWS_MOCK = platform.system().lower() == 'windows'

WINDOWS_MOCK_GE_PROTON_LIST = """
GE-Proton7-30
GE-Proton7-36
"""

WINDOWS_MOCK_FILE_SELECTOR_RESULT = """
Gtk-Message: 20:04:26.175: GtkDialog mapped without a transient parent. This is discouraged.
select file:/home/deck/abc.exe
"""

WINDOWS_MOCK_PROTON_VERSION = """
        #then setup patch and run(author:kong version:v1.1.0)
"""