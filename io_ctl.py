import os
import shutil

from ArchiveDecompression import ArchiveDecompression


def io_ctl_file_exist(path):
    return os.path.exists(path)


def io_ctl_copy(src, dst):
    if not os.path.exists(dst):
        os.makedirs(dst)
    shutil.copy(src, dst)


def io_ctl_move(src, dst):
    if not os.path.exists(dst):
        os.makedirs(dst)
    shutil.move(src, dst)


def io_ctl_del(src):
    shutil.rmtree(src)


def io_ctl_list(src):
    return os.listdir(src)

def io_ctl_list_with_absolute_path(src):
    return list(map(lambda v:os.path.join(src, v), os.listdir(src)))

# 统计目录大小(单位:KB)
def io_ctl_du_path(src):
    cmd = "du -l --max-depth=1 {}".format(src)
    result = os.popen(cmd).read()
    return result


def io_ctl_decompress_to(src, dst):
    ad = ArchiveDecompression(src)
    ad.decompression_to(dst)


def io_ctl_decompression_to_with_system(src, dst):
    ad = ArchiveDecompression(src)
    ad.decompression_to_with_system(dst)
