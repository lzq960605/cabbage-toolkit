import os
import platform
import subprocess
import tarfile
import zipfile
from os.path import join, getsize

from ArchiveDecompression import ArchiveDecompression
from CmdlineExecutor import CmdlineExecutor
from app_const import APP_GE_PROTON_CONF_PATH, APP_PROGRAM_PATH, APP_DOWNLOADS_PATH, APP_WINDOWS_APP_PATH, \
    PROTONTRICKS_CMD_PREFIX, INTERNAL_PROTONTRICKS_CMD_PREFIX, INTERNAL_PROTONTRICKS_FORCE_USE, APP_WINDOWS_CACHE_PATH
from dev_mock import WINDOWS_MOCK


def get_user_homepath():
    plat = platform.system().lower()
    if plat == 'windows':
        return os.environ['HOMEDRIVE'] + os.environ['HOMEPATH']
    elif plat == 'linux':
        return os.environ.get("HOME", "")


def byte_decode(byte_str):
    plat = platform.system().lower()
    if plat == 'windows':
        return byte_str.decode('GBK')
    elif plat == 'linux':
        return byte_str.decode('UTF-8')


def runShellCommand(cmdline):
    msg, errMsg, cmdCode = launch_subprocess_cmd(cmdline)
    return {
        "cmdCode": cmdCode,
        "result": byte_decode(msg).strip(),
        "errMsg": byte_decode(errMsg).strip()
    }


def showNativeAlert(message):
    cmd = "zenity  --warning --text=\"{}\"".format(message)
    runShellCommand(cmd)

# 显示对话框
def showNativeConfirm(message):
    cmd = "zenity  --question --text=\"{}\"".format(message)
    result = runShellCommand(cmd)
    return result['cmdCode']


def launch_subprocess_cmd(command_to_lunch, cwd=None, raise_errors=False):
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


# return the application can open folder or website
def get_system_folder_opener():
    plat = platform.system().lower()
    if plat == 'windows':
        return "explorer.exe"
    elif plat == 'linux':
        msg, errMsg, cmdCode = launch_subprocess_cmd("which xdg-open")
        if cmdCode == 0:
            return "xdg-open"
    return None


def is_protontricks_installed():
    cmd = "flatpak list | grep protontricks | wc -l"
    result = os.popen(cmd).read()
    return result.strip() != "0"


def is_firefox_installed():
    cmd = "flatpak list | grep firefox | wc -l"
    result = os.popen(cmd).read()
    return result.strip() != "0"

def install_firefox_with_xterm():
    script_file_path = os.path.join(get_user_homepath(), APP_PROGRAM_PATH, "system_tools_script", "firefox_installer.sh")
    executor = CmdlineExecutor("")
    result = executor.exec_script_with_new_terminal(script_file_path)
    return result['cmdCode']


def create_app_default_path():
    if not os.path.exists(get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH):
        os.makedirs(get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH)
    if not os.path.exists(get_user_homepath() + "/" + APP_PROGRAM_PATH):
        os.makedirs(get_user_homepath() + "/" + APP_PROGRAM_PATH)
    if not os.path.exists(get_user_homepath() + "/" + APP_DOWNLOADS_PATH):
        os.makedirs(get_user_homepath() + "/" + APP_DOWNLOADS_PATH)
    if not os.path.exists(get_user_homepath() + "/" + APP_WINDOWS_APP_PATH):
        os.makedirs(get_user_homepath() + "/" + APP_WINDOWS_APP_PATH)
    if not os.path.exists(get_user_homepath() + "/" + APP_WINDOWS_CACHE_PATH):
        os.makedirs(get_user_homepath() + "/" + APP_WINDOWS_CACHE_PATH)


def get_app_template_path():
    relative_template_path = "./templates"
    if WINDOWS_MOCK:
        return relative_template_path
    home_template_path = get_user_homepath() + "/" + APP_PROGRAM_PATH + "/templates"
    if os.path.exists(home_template_path):
        return home_template_path
    return relative_template_path


def get_protontricks_provider():
    if INTERNAL_PROTONTRICKS_FORCE_USE == 1:
        return INTERNAL_PROTONTRICKS_CMD_PREFIX.format(os.path.join(get_user_homepath(), APP_PROGRAM_PATH))

    if is_protontricks_installed():
        return PROTONTRICKS_CMD_PREFIX
    else:
        return INTERNAL_PROTONTRICKS_CMD_PREFIX.format(os.path.join(get_user_homepath(), APP_PROGRAM_PATH))


def untar_file_to_path(zip_file, target_path):
    t = tarfile.open(zip_file)
    t.extractall(path=target_path)
    t.close()


# 解压zip文件, zip_file: 源文件  target_path:目标文件
def unzip_file_to_path(zip_file, target_path):
    zfile = zipfile.ZipFile(zip_file, 'r')
    for file in zfile.namelist():
        zfile.extract(file, target_path)

    zfile.close()


# 解压文件到指定目录
def decompression_file_to(target_file, target_path):
    f = ArchiveDecompression(target_file)
    f.decompression_to(target_path)


# dir = 'C:\\Program Files (x86)'
def get_dir_size(target_dir):
    '''
    :brief:获取该目录的大小
    :param dir: 文件夹目录
    :return:改文件夹的大小：MB
    '''
    size = 0
    # 遍历该文件夹下的文件并计算大小
    for root, dirs, files in os.walk(target_dir):
        size += sum([getsize(join(root, name)) for name in files])
    return size / 1024 / 1024

def get_real_path(target_path):
    if os.path.islink(target_path):
        return os.path.realpath(target_path)

    return target_path

