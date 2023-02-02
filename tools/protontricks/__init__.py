from .gui import *
from .steam import *
from .util import *
from .winetricks import *

try:
    from ._version import version as __version__
except ImportError:
    # Package not installed
    __version__ = "unknown"
