from CmdHandler import CmdHandler
from bottle import request, response, route, post, run, template, static_file

# toolkit数据目录定义
from util import create_app_default_path, get_app_template_path

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
    return static_file(filepath, root = get_app_template_path() + '/')

@route('/')
def index():
    return static_file('index.html', root = get_app_template_path() + '/')


# http://localhost:8080/hello/world
if __name__ == '__main__':
    # main()
    create_app_default_path()
    run(host='localhost', port=8080)
