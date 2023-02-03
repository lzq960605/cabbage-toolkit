import logging
import os
import shutil
from pathlib import Path

__all__ = ("get_winetricks_path",)

logger = logging.getLogger("protontricks")

current_file_path = os.path.dirname(__file__)
def get_winetricks_path():
    """
    Return to the path to 'winetricks' executable or return None if not found
    """
    if os.environ.get('WINETRICKS'):
        path = Path(os.environ["WINETRICKS"])
        logger.info(
            "Winetricks path is set to %s", str(path)
        )
        if not path.is_file():
            logger.error(
                "The WINETRICKS path is invalid, please make sure "
                "Winetricks is installed in that path!"
            )
            return None

        return path

    logger.info(
        "WINETRICKS environment variable is not available. "
        "Searching from $PATH.")
    #winetricks_path = shutil.which("winetricks")
    #winetricks_path = "/home/deck/.local/share/Steam/compatibilitytools.d/GE-Proton7-36/protonfixes/winetricks"
    #winetricks_path = "/home/deck/.local/share/Steam/compatibilitytools.d/GE-Proton7-36/protonfixes/winetricks"
    winetricks_path = os.path.join(current_file_path, "../winetricks_tools/winetricks")
    

    if winetricks_path:
        return Path(winetricks_path)

    logger.error(
        "'winetricks' executable could not be found automatically."
    )
    return None
