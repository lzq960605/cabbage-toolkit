import os
import pathlib
import shutil

from ArchiveDecompression import ArchiveDecompression


def io_ctl_file_exist(path):
    return os.path.exists(path)


def io_ctl_copy(src, dst):
    if not os.path.exists(os.path.dirname(dst)):
        os.makedirs(os.path.dirname(dst))
    shutil.copy(src, dst)


def io_ctl_move(src, dst):
    if not os.path.exists(os.path.dirname(dst)):
        os.makedirs(os.path.dirname(dst))
    shutil.move(src, dst)


def io_ctl_del(src):
    shutil.rmtree(src)


def io_ctl_del_multiple(pathList):
    errMsg = ""
    for path in pathList:
        try:
            if os.path.exists(path):
                shutil.rmtree(path)
        except Exception as e:
            errMsg += 'delete folder:{} failed.\n'.format(path)
            print('delete folder:{} failed:'.format(path), e)
        finally:
            pass

    if errMsg != "":
        raise Exception(errMsg)


def io_ctl_list(src):
    currentPath = pathlib.Path(src)
    result = []
    for item in currentPath.iterdir():
        result.append({
            "name": item.name,
            "suffix": item.suffix,
            "dir": 1 if item.is_dir() else 0,
            "file": 1 if item.is_file() else 0,
            "symlink": 1 if item.is_symlink() else 0,
        })

    # return os.listdir(src)
    return result

def io_ctl_list_with_absolute_path(src):
    return list(map(lambda v:os.path.join(src, v), os.listdir(src)))

# 统计目录大小(单位:KB)
def io_ctl_du_path(src):
    pathName = os.path.basename(src)
    cmd = "du -l --max-depth=1 {} | grep -vE '{}$'".format(src, pathName)
    result = os.popen(cmd).read()
    return result


def io_ctl_decompress_to(src, dst):
    ad = ArchiveDecompression(src)
    ad.decompression_to(dst)


def io_ctl_decompression_to_with_system(src, dst):
    ad = ArchiveDecompression(src)
    ad.decompression_to_with_system(dst)
