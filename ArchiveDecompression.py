import os
import shutil
import tarfile
import zipfile


class ArchiveDecompression(object):
    TAR_FILE_LIST = ["tar", "tar.xz", "tar.gz", "tar.gz", "tar.bz2", "tar.Z", "tgz"]
    ZIP_FILE_LIST = ["zip"]

    def __init__(self, target_file):
        self.target_file = target_file

    def is_tar_compression(self, target_file):
        file_name = os.path.basename(target_file)
        for v in self.TAR_FILE_LIST:
            if file_name.endswith(v):
                return True

        return False

    def is_zip_compression(self, target_file):
        file_name = os.path.basename(target_file)
        for v in self.ZIP_FILE_LIST:
            if file_name.endswith(v):
                return True

        return False

    # 根据后缀名判断压缩包类型来解压到指定目录
    def decompression_to(self, target_path):
        if not os.path.exists(target_path):
            os.makedirs(target_path)
        if self.is_tar_compression(self.target_file):
            t = tarfile.open(self.target_file)
            t.extractall(path = target_path)
            t.close()
        if self.is_zip_compression(self.target_file):
            zfile = zipfile.ZipFile(self.target_file, 'r')
            zfile.extractall(path = target_path)
            zfile.close()



    # 将文件拷贝到指定文件夹, 并根据后缀名判断压缩包类型来解压
    def copy_file_and_decompression(self, target_path):
        if not os.path.exists(target_path):
            os.makedirs(target_path)
        shutil.copy(self.target_file, target_path)
        target_file_copy = os.path.join(target_path, os.path.basename(self.target_file))
        if self.is_tar_compression(self.target_file):
            t = tarfile.open(target_file_copy)
            t.extractall(path = target_path)
            t.close()
        if self.is_zip_compression(self.target_file):
            zfile = zipfile.ZipFile(target_file_copy, 'r')
            zfile.extractall(path = target_path)
            zfile.close()

        # 删除拷贝的压缩文件
        os.remove(target_file_copy)
