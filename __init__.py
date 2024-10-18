import os
import json
import logging
import shutil
import subprocess
import tempfile
from typing import List, Dict, Any
from pathlib import Path
from aiohttp import web
import server
import sys
import stat
import mimetypes
mimetypes.add_type('application/javascript', '.js')
WEBROOT = Path(__file__).parent / "web"
FLOWS_PATH = WEBROOT / "flows"
CORE_PATH = WEBROOT / "core"
FLOWER_PATH = WEBROOT / "flower"
FLOW_PATH = WEBROOT / "flow"
CUSTOM_NODES_DIR = Path(__file__).parent.parent
EXTENSION_NODE_MAP_PATH = Path(__file__).parent.parent / "ComfyUI-Manager" / "extension-node-map.json"
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
AppConfig = Dict[str, Any]
Routes = web.RouteTableDef
FLOWS_DOWNLOAD_PATH = 'https://github.com/diStyApps/flows_lib'
NODE_CLASS_MAPPINGS: Dict[str, Any] = {}
NODE_DISPLAY_NAME_MAPPINGS: Dict[str, str] = {}
APP_CONFIGS: List[AppConfig] = []
APP_NAME: str = "Flow"
APP_VERSION: str = "0.1.2"
PURPLE = "\033[38;5;129m"
RESET = "\033[0m"
FLOWMSG = f"{PURPLE}Flow{RESET}"


class RouteManager:
    @staticmethod
    def create_routes(base_path: str, app_dir: Path) -> Routes:
        routes = web.RouteTableDef()
        index_html = app_dir / 'index.html'

        @routes.get(f"/{base_path}")
        async def serve_html(request: web.Request) -> web.FileResponse:
            return web.FileResponse(index_html)

        for static_dir in ['css', 'js', 'media']:
            static_path = app_dir / static_dir
            if static_path.is_dir():
                routes.static(f"/{static_dir}/", path=static_path)

        routes.static(f"/{base_path}/", path=app_dir, show_index=True)
        return routes

class AppManager:
    @staticmethod
    def setup_app_routes(app: web.Application) -> None:
        try:
            for item in FLOWS_PATH.iterdir():
                if item.is_dir():
                    conf_file = item / 'flowConfig.json'
                    if conf_file.is_file():
                        try:
                            conf = AppManager._load_config(conf_file)
                            url = conf.get('url', '')
                            flow_url_path = "flow/" + url
                            routes = RouteManager.create_routes(flow_url_path, item)
                            app.add_routes(routes)
                            APP_CONFIGS.append(conf)
                        except Exception as e:
                            logger.error(f"{FLOWMSG}: Error setting up routes for {item}: {e}")
                    else:
                        # logger.warning(f"{FLOWMSG}: No conf.json found in {item}, skipping.")
                        pass
                else:
                    # logger.debug(f"{FLOWMSG}: {item} is not a directory, skipping.")
                    pass
        except Exception as e:
            logger.error(f"{FLOWMSG}: Failed to iterate over flows directory: {e}")

        if CORE_PATH.is_dir():
            app.router.add_static('/core/', path=CORE_PATH, name='core')

        if FLOWER_PATH.is_dir():
            flow_builder_routes = RouteManager.create_routes('flow/flower', FLOWER_PATH)
            app.add_routes(flow_builder_routes)

        if FLOW_PATH.is_dir():
            flow_routes = RouteManager.create_routes('flow', FLOW_PATH)
            app.add_routes(flow_routes)

    @staticmethod
    def _load_config(conf_file: Path) -> Dict[str, Any]:
        with conf_file.open('r') as f:
            return json.load(f)

async def apps_handler(request: web.Request) -> web.Response:
    return web.json_response(APP_CONFIGS)

async def app_version_handler(request: web.Request) -> web.Response:
    return web.json_response({'version': APP_VERSION})

async def extension_node_map_handler(request: web.Request) -> web.Response:
    if EXTENSION_NODE_MAP_PATH.exists():
        with EXTENSION_NODE_MAP_PATH.open('r') as f:
            extension_node_map = json.load(f)
        return web.json_response(extension_node_map)
    else:
        return web.Response(status=404, text="extension-node-map.json not found")

async def install_package_handler(request: web.Request) -> web.Response:
    data = await request.json()
    package_url = data.get('packageUrl')
    if not package_url:
        return web.Response(status=400, text="Missing 'packageUrl' in request body")
    
    package_name = package_url.rstrip('/').split('/')[-1]
    install_path = CUSTOM_NODES_DIR / package_name

    if install_path.exists():
        return web.json_response({'status': 'already_installed', 'message': f"Custom node '{package_name}' is already installed."})

    try:
        subprocess.check_call(['git', 'clone', package_url, str(install_path)])
        logger.info(f"{FLOWMSG}: Custom node '{package_name}' cloned successfully.")
        requirements_file = install_path / 'requirements.txt'
        if requirements_file.exists():
            try:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)])
                logger.info(f"{FLOWMSG}: Requirements for '{package_name}' installed successfully.")
            except subprocess.CalledProcessError as e:
                logger.error(f"{FLOWMSG}: Failed to install requirements for '{package_name}': {e}")
                shutil.rmtree(install_path)
                return web.json_response({
                    'status': 'error',
                    'message': f"{FLOWMSG}: Failed to install requirements for '{package_name}'. The package has been removed. Please try installing manually."
                }, status=500)
        else:
            logger.info(f"{FLOWMSG}: No requirements.txt found for '{package_name}'.")
       
        return web.json_response({'status': 'success', 'message': f"Custom node '{package_name}' installed successfully."})
    except subprocess.CalledProcessError as e:
        if install_path.exists():
            shutil.rmtree(install_path)
        logger.error(f"{FLOWMSG}: Failed to install package '{package_name}': {e}")
        return web.json_response({'status': 'error', 'message': f"Failed to install custom node '{package_name}': {e}"}, status=500)
    except Exception as e:
        if install_path.exists():
            shutil.rmtree(install_path)
        logger.error(f"{FLOWMSG}: An unexpected error occurred while installing '{package_name}': {e}")
        return web.json_response({'status': 'error', 'message': f"An unexpected error occurred while installing '{package_name}': {e}"}, status=500)

async def update_package_handler(request: web.Request) -> web.Response:
    data = await request.json()
    package_url = data.get('packageUrl')
    if not package_url:
        return web.Response(status=400, text="Missing 'packageUrl' in request body")
    
    package_name = package_url.rstrip('/').split('/')[-1]
    install_path = CUSTOM_NODES_DIR / package_name

    if not install_path.exists():
        return web.json_response({'status': 'not_installed', 'message': f"Package '{package_name}' is not installed."})

    try:
        result = subprocess.run(['git', '-C', str(install_path), 'pull'], capture_output=True, text=True)
        if result.returncode == 0:
            return web.json_response({'status': 'success', 'message': f"Package '{package_name}' updated successfully."})
        else:
            logger.error(f"{FLOWMSG}: Failed to update package '{package_name}':\n{result.stderr}")
            return web.json_response({'status': 'error', 'message': f"Failed to update package '{package_name}': {result.stderr}"}, status=500)
    except Exception as e:
        logger.error(f"{FLOWMSG}: An error occurred while updating package '{package_name}': {e}")
        return web.json_response({'status': 'error', 'message': f"An error occurred while updating package '{package_name}': {e}"}, status=500)

def remove_readonly(func, path, excinfo):
    # This makes the file writable and retries the removal
    os.chmod(path, stat.S_IWRITE)
    func(path)

async def uninstall_package_handler(request: web.Request) -> web.Response:
    data = await request.json()
    package_url = data.get('packageUrl')
    if not package_url:
        logger.warning(f"{FLOWMSG}: Uninstall request received with missing 'packageUrl'.")
        return web.Response(status=400, text="Missing 'packageUrl' in request body")
    
    package_name = package_url.rstrip('/').split('/')[-1]
    install_path = CUSTOM_NODES_DIR / package_name

    if not install_path.exists():
        logger.info(f"{FLOWMSG}: Attempt to uninstall non-existent package '{package_name}'.")
        return web.json_response({'status': 'not_installed', 'message': f"Custom node '{package_name}' is not installed."})

    try:
        logger.info(f"{FLOWMSG}: Uninstalling custom node '{package_name}'...")

        # Attempt to remove the directory with retry and handling of access errors
        shutil.rmtree(install_path, onerror=remove_readonly)
        logger.info(f"{FLOWMSG}: Custom node '{package_name}' uninstalled successfully.")

        return web.json_response({'status': 'success', 'message': f"Custom node '{package_name}' uninstalled successfully."})
    except Exception as e:
        logger.error(f"{FLOWMSG}: An error occurred while uninstalling '{package_name}': {e}")
        return web.json_response({'status': 'error', 'message': f"An error occurred while uninstalling custom node '{package_name}': {e}"}, status=500)

async def installed_custom_nodes_handler(request: web.Request) -> web.Response:
    try:
        installed_nodes = []
        if CUSTOM_NODES_DIR.exists():
            for item in CUSTOM_NODES_DIR.iterdir():
                if item.is_dir():
                    installed_nodes.append(item.name)
        return web.json_response({'installedNodes': installed_nodes})
    except Exception as e:
        logger.error(f"{FLOWMSG}: Error fetching installed custom nodes: {e}")
        return web.Response(status=500, text="Internal Server Error")

async def save_config_handler(request: web.Request) -> web.Response:
    try:
        data = await request.json()
        flow_id = "afl_aflower"
        if not flow_id:
            return web.Response(status=400, text="Missing 'id' in request body")

        flow_path = FLOWS_PATH / flow_id
        if not flow_path.exists():
            return web.Response(status=404, text=f"Flow directory '{flow_id}' not found")

        config_path = flow_path / 'flowConfig.json'
        with config_path.open('w') as f:
            json.dump(data, f, indent=2)

        return web.json_response({'status': 'success', 'message': f"Configuration for flow '{flow_id}' saved successfully."})
    except Exception as e:
        logger.error(f"{FLOWMSG}: Error saving configuration: {e}")
        return web.Response(status=500, text=f"{FLOWMSG}: Error saving configuration: {str(e)}")

def download_or_update_flows() -> None:
    try:
        with tempfile.TemporaryDirectory() as tmpdirname:
            temp_repo_path = Path(tmpdirname) / "Flows"
            # logger.info(f"{FLOWMSG}:Cloning flows repository into temporary directory {temp_repo_path}")
            logger.info(f"{FLOWMSG}: Downloading Flows")

            result = subprocess.run(['git', 'clone', FLOWS_DOWNLOAD_PATH, str(temp_repo_path)],
                                    capture_output=True, text=True)
            if result.returncode != 0:
                logger.error(f"{FLOWMSG}: Failed to clone flows repository:\n{result.stderr}")

                return
            else:
                # logger.info(f"{FLOWMSG}: Flows repository cloned successfully into {temp_repo_path}")
                pass
            if not FLOWS_PATH.exists():
                FLOWS_PATH.mkdir(parents=True)
                # logger.info(f"{FLOWMSG}: Created flows directory at {FLOWS_PATH}")
            for item in temp_repo_path.iterdir():
                if item.name == '.git':
                    continue
                dest_item = FLOWS_PATH / item.name
                if item.is_dir():
                    if dest_item.exists():
                        # logger.info(f"{FLOWMSG}: Updating existing directory {dest_item}")
                        _copy_directory(item, dest_item)
                    else:
                        # logger.info(f"{FLOWMSG}: Copying new directory {item.name} to {dest_item}")
                        shutil.copytree(item, dest_item)
                else:
                    # logger.info(f"{FLOWMSG}: Copying file {item.name} to {dest_item}")
                    shutil.copy2(item, dest_item)
            logger.info(f"{FLOWMSG}: Flows have been updated successfully.")
    except Exception as e:
        logger.error(f"{FLOWMSG}: An error occurred while downloading or updating flows: {e}")

def _copy_directory(src: Path, dest: Path) -> None:
    for item in src.iterdir():
        if item.name == '.git':
            continue
        dest_item = dest / item.name
        if item.is_dir():
            if not dest_item.exists():
                dest_item.mkdir()
            _copy_directory(item, dest_item)
        else:
            shutil.copy2(item, dest_item)

def setup_server() -> None:
    try:
        server_instance = server.PromptServer.instance
    except Exception as e:
        logger.error(f"{FLOWMSG}: Failed to get server instance: {e}")
        return

    try:
        download_or_update_flows()
    except Exception as e:
        logger.error(f"{FLOWMSG}: Failed to download or update flows: {e}")

    try:
        AppManager.setup_app_routes(server_instance.app)
    except Exception as e:
        logger.error(f"{FLOWMSG}: Failed to set up app routes: {e}")
    
    try:
        server_instance.app.router.add_get('/api/apps', apps_handler)
        server_instance.app.router.add_get('/api/extension-node-map', extension_node_map_handler)
        server_instance.app.router.add_post('/api/install-package', install_package_handler)
        server_instance.app.router.add_post('/api/update-package', update_package_handler)
        server_instance.app.router.add_post('/api/uninstall-package', uninstall_package_handler)        
        server_instance.app.router.add_get('/api/flow-version', app_version_handler)
        server_instance.app.router.add_post('/api/save-config', save_config_handler)
    except Exception as e:
        logger.error(f"{FLOWMSG}: Failed to add API routes: {e}")

    try:
        server_instance.app.router.add_get('/api/installed-custom-nodes', installed_custom_nodes_handler)
    except Exception as e:
        logger.error(f"{FLOWMSG}: Failed to add installed custom nodes API route: {e}")

setup_server()

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
