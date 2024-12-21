import logging
import mimetypes
from pathlib import Path
import re
APP_NAME = "Flow"
APP_VERSION = "0.4.9" 
FLOWMSG = f"\033[38;5;129mFlow - {APP_VERSION}\033[0m"
APP_CONFIGS = []

CURRENT_DIR = Path(__file__).parent
ROOT_DIR = CURRENT_DIR.parent
WEBROOT = ROOT_DIR / "web"
CORE_PATH = WEBROOT / "core"
FLOW_PATH = WEBROOT / "flow"
FLOWS_PATH = WEBROOT / "flows"
LINKER_PATH = WEBROOT / "linker"
CUSTOM_THEMES_DIR = WEBROOT / 'custom-themes'
WEB_DIRECTORY = "web/core/js/common/scripts"

CUSTOM_NODES_DIR = ROOT_DIR.parent
EXTENSION_NODE_MAP_PATH = ROOT_DIR.parent / "ComfyUI-Manager" / "extension-node-map.json"

FLOWS_DOWNLOAD_PATH = 'https://github.com/diStyApps/flows_lib'

SAFE_FOLDER_NAME_REGEX = re.compile(r'^[\w\-]+$')
ALLOWED_EXTENSIONS = {'css'}
mimetypes.add_type('application/javascript', '.js')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
FLOWS_CONFIG_FILE = 'flowConfig.json'
FLOWS_TO_REMOVE = [
    "afl_CogVideoX-Fun-i2v-es",
    "afl_CogVideoX-Fun-i2v",
    "afl_MimicMotioni2v",
    "afl_abase",
    "afl_abasei2i",
    "afl_abasesd35t3v",
    "afl_abasevea",
    "afl_abaseveai2i",
    "afl_base-fluxd_at2i",
    "afl_base-fluxdggufi2i",
    "afl_base-fluxdgguft2i",
    "afl_base-fluxdi2i",
    "afl_base-fluxs_ai2t",
    "afl_base-fluxsi2i",
    "afl_baseAD",
    "afl_baseAdLcm",
    "afl_cogvidx_at2v",
    "afl_cogvidxi2v",
    "afl_cogvidxinteri2v",
    "afl_flowup",
    "afl_flux_dev",
    "afl_flux_dev_lora",
    "afl_genfill",
    "afl_ipivsMorph",
    "afl_mochi2v",
    "afl_pulid_flux",
    "afl_pulid_flux_GGUF",
    "afl_reactor"
    "5otvy-cogvideox-orbit-left-lora",
    "umbi9-hunyuan-text-to-video"
]

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
