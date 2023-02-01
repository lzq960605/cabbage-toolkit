import os
import platform
import subprocess

from app_const import APP_GE_PROTON_CONF_PATH, APP_PROGRAM_PATH, APP_DOWNLOADS_PATH, APP_WINDOWS_APP_PATH


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


# FIXME: just simple judge
def is_run_on_steamdeck():
    return os.environ.get("HOME", "") == '/home/deck'


def is_protontricks_installed():
    cmd = "flatpak list | grep protontricks | wc -l"
    if False:
        cmd = "echo 1"
    result = os.popen(cmd).read()
    return result.strip() == "1"


def create_app_default_path():
    if not os.path.exists(get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH):
        os.makedirs(get_user_homepath() + "/" + APP_GE_PROTON_CONF_PATH)
    if not os.path.exists(get_user_homepath() + "/" + APP_PROGRAM_PATH):
        os.makedirs(get_user_homepath() + "/" + APP_PROGRAM_PATH)
    if not os.path.exists(get_user_homepath() + "/" + APP_DOWNLOADS_PATH):
        os.makedirs(get_user_homepath() + "/" + APP_DOWNLOADS_PATH)
    if not os.path.exists(get_user_homepath() + "/" + APP_WINDOWS_APP_PATH):
        os.makedirs(get_user_homepath() + "/" + APP_WINDOWS_APP_PATH)


def get_app_template_path():
    relative_template_path = "./templates"
    home_template_path = get_user_homepath() + "/" + APP_PROGRAM_PATH + "/cabbage-toolkit/templates"
    if os.path.exists(home_template_path):
        return home_template_path
    return relative_template_path
