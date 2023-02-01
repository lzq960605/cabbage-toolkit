import time
from threading import Thread

from CmdHandler import CmdHandler
from bottle import request, response, route, post, run, template, static_file, WSGIRefServer
# toolkit数据目录定义
from util import create_app_default_path, get_app_template_path, get_system_folder_opener, runShellCommand

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
    response.content_type = 'application/json'
    category = request.json['category']
    command = request.json['command']
    params = request.json['params']
    handler = CmdHandler(category, command, params)
    code, msg, data = handler.handle()
    return {"code": code, "msg": msg, "data": data}


@route('/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root=get_app_template_path() + '/')


@route('/')
def index():
    return static_file('index.html', root=get_app_template_path() + '/')


def shutdown():
    time.sleep(1)
    server.srv.shutdown()

@route('/app/exit')
def app_exit():
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
    # run(host='localhost', port=1777)
    run(server=server)
    print("cabbage-toolkit exit.")
