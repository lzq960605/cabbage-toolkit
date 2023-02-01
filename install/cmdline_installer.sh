#!/usr/bin/env bash

APP_HOME="${HOME}/.cabbage_toolkit"
APP_CODE_REPOSITORY="https://gitee.com/cabbage-v50-steamdeck/cabbage-toolkit.git"

main_func(){
  if [[ -d "${APP_HOME}/program" ]];then
    echo "Found cabbage_toolkit installed, if you to reinstall it, please delete the folder at: ${APP_HOME}/program"
    exit 0
  fi
  mkdir -p "${APP_HOME}/program"
  git clone ${APP_CODE_REPOSITORY} "${APP_HOME}/program"
  cp -f "${APP_HOME}/program/install/cabbage.desktop" "${HOME}/Desktop/大白菜工具集.desktop"
  echo "install ok!"
}

main_func
