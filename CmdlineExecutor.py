import os
import platform
import subprocess
import time

from app_const import APP_WINDOWS_CACHE_PATH
from dev_mock import WINDOWS_MOCK

CMD_WAIT_EXIT_COMMAND = """
\necho "Ready to exit in 3 second."
\nsleep 3
"""

class CmdlineExecutor(object):
    def __init__(self, cmdline):
        self.cmdline = cmdline

    def _get_user_homepath(self):
        plat = platform.system().lower()
        if plat == 'windows':
            return os.environ['HOMEDRIVE'] + os.environ['HOMEPATH']
        elif plat == 'linux':
            return os.environ.get("HOME", "")

    def _get_terminal_provider(self):
        if WINDOWS_MOCK == 1:
            return "\"C:\Program Files\Git\git-bash.exe\""
        else:
            return "xterm -e /bin/bash  "

    def _byte_decode(self, byte_str):
        plat = platform.system().lower()
        if plat == 'windows':
            return byte_str.decode('GBK')
        elif plat == 'linux':
            return byte_str.decode('UTF-8')

    
    def _launch_subprocess_cmd(self, command_to_lunch, cwd=None, raise_errors=False):
        """
        for a given command line will lunch that as a subprocess
        :param command_to_lunch: string
        :param print_real_time: boolean
        :param cwd: the folder path from where the command should be run.
        :param raise_errors: boolean if the return code of the subprocess is different than 0 raise an error an stop all scripts.
                                else the main script will keep running and can access the third return value of this function and decide what to do with it.
        :return: list com return the stdout and the stderr of the Popen subprocess.
        """
        print("launch_subprocess_cmd: " + command_to_lunch)
        if cwd is None:
            p = subprocess.Popen(command_to_lunch, stderr=subprocess.PIPE, stdout=subprocess.PIPE, shell=True)
        else:
            p = subprocess.Popen(command_to_lunch, cwd=cwd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, shell=True)
    
        com = p.communicate()
        if raise_errors is True:
            if p.returncode != 0:
                raise ValueError(
                    "\n\nSubprocess fail: \n" + "Error captures: \n" + "stdout:\n" + com[0] + "\nstderr:\n" + com[1] + "\n")
        # com[0] is std_out, com[1] is std_err and p.return code is if the subprocess was successful or not with a int number
        return com[0], com[1], p.returncode


    def exec_with_popen(self):
        msg, errMsg, cmdCode = self._launch_subprocess_cmd(self.cmdline)
        return {
            "cmdCode": cmdCode,
            "result": self._byte_decode(msg).strip(),
            "errMsg": self._byte_decode(errMsg).strip()
        }



    # 启动一个终端窗口，在终端窗口中执行命令(可以进行交互，显示终端执行细节)
    def exec_with_new_terminal(self):
        msg = ""
        errMsg = ""
        cmdCode = 0
        tmp_cmd_file_path = ""
        try:
            terminal_provider = self._get_terminal_provider()
            # 把命令丢到一个临时sh文件
            tmp_cmd_name = "cmd_" + str(time.time()).replace('.', '') + ".sh"
            tmp_cmd_file_path = os.path.join(self._get_user_homepath(), APP_WINDOWS_CACHE_PATH, tmp_cmd_name)
            file = open(tmp_cmd_file_path, 'w', encoding="utf-8")
            file.write(self.cmdline + CMD_WAIT_EXIT_COMMAND)
            file.close()
            cmdline = "{} {}".format(terminal_provider, tmp_cmd_file_path)
            msg, errMsg, cmdCode = self._launch_subprocess_cmd(cmdline)
        except Exception as e:
            print(e)
            print("error file:{}".format(e.__traceback__.tb_frame.f_globals["__file__"]))
            print("error line:{}".format(e.__traceback__.tb_lineno))
        finally:
            os.remove(tmp_cmd_file_path)
        return {
            "cmdCode": cmdCode,
            "result": self._byte_decode(msg).strip(),
            "errMsg": self._byte_decode(errMsg).strip()
        }


    # 启动一个终端窗口，在终端窗口中执行脚本文件
    def exec_script_with_new_terminal(self, script_file):
        if not os.path.exists(script_file):
            raise Exception("脚本文件:" + script_file + " 不存在")
        terminal_provider = self._get_terminal_provider()
        cmdline = "{} {}".format(terminal_provider, script_file)
        msg, errMsg, cmdCode = self._launch_subprocess_cmd(cmdline)
        return {
            "cmdCode": cmdCode,
            "result": self._byte_decode(msg).strip(),
            "errMsg": self._byte_decode(errMsg).strip()
        }
