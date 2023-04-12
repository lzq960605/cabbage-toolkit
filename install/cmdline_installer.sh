#!/usr/bin/env bash

APP_HOME="${HOME}/.cabbage_toolkit"
APP_CODE_REPOSITORY="https://gitee.com/cabbage-v50-steamdeck/cabbage-toolkit.git"

main_func(){
  if [[ -d "${APP_HOME}/program" ]];then
    # echo "Found cabbage_toolkit installed, if you to reinstall it, please delete the folder at: ${APP_HOME}/program"
    # exit 0
    zenity  --width="320" --question --text="检测到之前已安装过大白菜工具箱, 是否重新安装?"
    result="$?"
    if [[ "${result}" != "0" ]];then
     exit 0
    fi
    rm -rf "${APP_HOME}/program"
  fi
  mkdir -p "${APP_HOME}/program"
  git clone ${APP_CODE_REPOSITORY} "${APP_HOME}/program"
  cp -f "${APP_HOME}/program/install/cabbage.desktop" "${HOME}/Desktop/大白菜工具箱.desktop"
  echo "install ok!"
  zenity --width="320" --info --text="安装完成, 请在桌面点击'大白菜工具箱'图标, 信任该应用来启动"
}


if [[ $EUID -eq 0 || -n "$SUDO_USER" ]]; then
  zenity --width="320" --error --text="请使用普通用户身份来执行脚本."
  exit 1
fi

main_func
