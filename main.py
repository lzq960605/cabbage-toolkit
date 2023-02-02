import os
import platform
import time
from queue import Queue, LifoQueue
from threading import Thread

from CmdHandler import CmdHandler
from bottle import request, response, route, post, run, template, static_file, WSGIRefServer
# toolkit数据目录定义
from util import create_app_default_path, get_app_template_path, get_system_folder_opener, runShellCommand

api_ticket = LifoQueue()

"""
$HOME/.cabbage_toolkit
                |-- app.conf  # app 配置
                |-- ge_proton_conf  # 兼容层游戏配置
                |   `-- 240.conf   # 以gameId命名
                `-- program
                `-- downloads
                `-- windows_app
                    `-- wechat
"""


@route('/hello/<name>')
def hello(name):
    return template('<b>Hello {{name}}</b>!', name=name)


@post('/api/cmd')
def api_cmd():
    api_ticket.put({
        "uri" : request.path,
        "time" : str(time.time()),
    })
    print("/api/cmd, command: " + request.json['command'])
    response.content_type = 'application/json'
    category = request.json['category']
    command = request.json['command']
    params = request.json['params']
    async_task = request.json['async_task']
    api_id = request.json['api_id']
    handler = CmdHandler(category, command, params, async_task, api_id)
    code, msg, data = handler.handle()
    return {"code": code, "msg": msg, "data": data}


@route('/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root=get_app_template_path() + '/')


@route('/')
def index():
    return static_file('index.html', root=get_app_template_path() + '/')


def shutdown():
    time.sleep(10)
    real_exit = True
    try:
        recently_api_ticket = api_ticket.get()
        print('shutdown:last accept uri=' + recently_api_ticket['uri'])
        if recently_api_ticket['uri'] != "/app/exit":
            real_exit = False
    except Queue.Empty:
        pass
    if real_exit:
        server.srv.shutdown()
        plat = platform.system().lower()
        if plat == 'linux':
            cmd="ps -ef | grep '.cabbage_toolkit/program/main.py' | grep -v 'grep' | awk '{print $2}' | xargs kill -9"
            result = os.popen(cmd).read()
            print("linux kill task result:" + result)




@route('/app/exit')
def app_exit():
    api_ticket.put({
        "uri" : request.path,
        "time" : str(time.time()),
    })
    Thread(target=shutdown).start()
    return {"code": 0, "msg": '', "data": None}


server = WSGIRefServer(port=1777)


def open_browser_with_url():
    time.sleep(1)
    opener = get_system_folder_opener()
    if not opener:
        raise Exception("Couldn't found opener, open url failed!")
    runShellCommand(opener + " http://localhost:1777")


if __name__ == '__main__':
    # main()
    create_app_default_path()
    Thread(target=open_browser_with_url).start()
    run(server=server)
    print("cabbage-toolkit exit.")


