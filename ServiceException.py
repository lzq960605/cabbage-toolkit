SERVICE_EXCEPTION_CONST = {
    "user_password_not_set":{"user_password_not_set"}
}

SERVICE_EXCEPTION_USER_PASSWORD_NOT_SET = {
    "code": 10,
    "msg": "deck用户没设置密码",
}

# 自定义异常， 用法: raise ServiceException(SERVICE_EXCEPTION_USER_PASSWORD_NOT_SET)
class ServiceException(RuntimeError):
    def __init__(self, exception_data):
        self.code = exception_data['code']
        self.msg = exception_data['msg']
