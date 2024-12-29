import shutil
import os
import re
import base64
import json
import hashlib
import urllib.parse
from pathlib import Path
from aiohttp import web
from typing import Any
from io import BytesIO
from PIL import Image

from .constants import (
    APP_CONFIGS, APP_VERSION, EXTENSION_NODE_MAP_PATH,
    CUSTOM_NODES_DIR, FLOWMSG, logger, FLOWS_PATH, WEBROOT, CORE_PATH,
    SAFE_FOLDER_NAME_REGEX, ALLOWED_EXTENSIONS, CUSTOM_THEMES_DIR, FLOWS_CONFIG_FILE
)

DATA_DIR = Path(__file__).parent / "data"
PREVIEWS_REGISTRY_DIR = DATA_DIR / "model_previews_registry"
PREVIEWS_IMAGES_DIR = DATA_DIR / "model_previews"

def ensure_data_folders():
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        PREVIEWS_REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
        PREVIEWS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"{FLOWMSG}: Could not create data dirs: {e}")

def pathToKey(model_path: str) -> str:
    return model_path.replace('\\', '/')

def get_filename_only(model_path: str) -> str:
    fwd = pathToKey(model_path)
    return os.path.basename(fwd)

def get_preview_id(model_path: str) -> str:
    filename = get_filename_only(model_path)
    h = hashlib.sha1(filename.encode('utf-8')).hexdigest()
    return h[:16]

def get_preview_paths(preview_id: str):
    sub1 = preview_id[0]
    sub2 = preview_id[:2]
    registry_json = PREVIEWS_REGISTRY_DIR / sub1 / sub2 / f"{preview_id}.json"
    image_folder = PREVIEWS_IMAGES_DIR / sub1 / sub2 / preview_id
    return registry_json, image_folder

async def set_model_preview_handler(request: web.Request) -> web.Response:
    try:
        ensure_data_folders()
        data = await request.json()
        rawPath = data.get("modelPath") 
        base64_data = data.get("base64Data")
        if not rawPath or not base64_data:
            return web.Response(status=400, text="Missing 'modelPath' or 'base64Data'")

        pid = get_preview_id(rawPath) 
        registry_json, image_folder = get_preview_paths(pid)

        match = re.match(r"data:(image/\w+);base64,(.+)", base64_data)
        if not match:
            return web.Response(status=400, text="Invalid data URL format")

        mime_type = match.group(1)
        encoded = match.group(2)
        try:
            raw_image = base64.b64decode(encoded)
        except:
            return web.Response(status=400, text="Error decoding base64 image")

        registry_json.parent.mkdir(parents=True, exist_ok=True)
        image_folder.mkdir(parents=True, exist_ok=True)

        full_path = image_folder / "full.jpg"
        with full_path.open("wb") as f:
            f.write(raw_image)

        thumb_path = image_folder / "thumbnail.jpg"
        img = Image.open(BytesIO(raw_image))
        w_percent = 128.0 / float(img.size[0])
        h_new = int(float(img.size[1]) * w_percent)
        img = img.convert("RGB").resize((128, h_new), Image.Resampling.LANCZOS)
        img.save(thumb_path, format="JPEG")

        reg_data = {
            "modelPath": rawPath,
            "previewId": pid,
            "timestamp": int(os.path.getmtime(full_path)),
            "mime_type": mime_type
        }
        with registry_json.open("w", encoding="utf-8") as jf:
            json.dump(reg_data, jf, indent=2)

        return web.json_response({"status": "success", "previewId": pid})

    except Exception as e:
        logger.error(f"{FLOWMSG}: Error in set_model_preview_handler: {e}")
        return web.Response(status=500, text=str(e))

async def clear_model_preview_handler(request: web.Request) -> web.Response:
    try:
        ensure_data_folders()
        rawPath = request.query.get("modelPath", None)
        if not rawPath:
            return web.Response(status=400, text="Missing 'modelPath'")

        pid = get_preview_id(rawPath)
        registry_json, image_folder = get_preview_paths(pid)

        if registry_json.exists():
            registry_json.unlink()
        if image_folder.exists() and image_folder.is_dir():
            shutil.rmtree(image_folder)

        return web.json_response({"status": "success", "previewId": pid})
    except Exception as e:
        logger.error(f"{FLOWMSG}: Error in clear_model_preview_handler: {e}")
        return web.Response(status=500, text=str(e))

async def list_model_previews_handler(request: web.Request) -> web.Response:
    try:
        ensure_data_folders()
        result_map = {}

        if request.method == 'POST':
            data = await request.json()
            raw_paths = data.get('paths', [])
            if not isinstance(raw_paths, list):
                return web.Response(status=400, text="Invalid JSON: 'paths' must be an array")

            for rp in raw_paths:
                rp = urllib.parse.unquote(rp).strip()
                if not rp:
                    continue
                pid = get_preview_id(rp)
                _, image_folder = get_preview_paths(pid)
                thumb = image_folder / "thumbnail.jpg"
                if thumb.exists():
                    with thumb.open("rb") as tf:
                        b = tf.read()
                    b64 = base64.b64encode(b).decode("utf-8")
                    data_url = f"data:image/jpeg;base64,{b64}"
                    result_map[rp] = data_url

            return web.json_response(result_map)

        paths_param = request.rel_url.query.get('paths', None)
        if paths_param:
            raw_split = paths_param.split(',')
            for rp in raw_split:
                rp = rp.strip()
                if not rp:
                    continue
                rp = urllib.parse.unquote(rp)
                pid = get_preview_id(rp)
                _, image_folder = get_preview_paths(pid)
                thumb = image_folder / "thumbnail.jpg"
                if thumb.exists():
                    with thumb.open("rb") as tf:
                        b = tf.read()
                    b64 = base64.b64encode(b).decode("utf-8")
                    result_map[rp] = f"data:image/jpeg;base64,{b64}"
            return web.json_response(result_map)

        for root, dirs, files in os.walk(PREVIEWS_REGISTRY_DIR):
            for filename in files:
                if filename.endswith(".json"):
                    regp = Path(root) / filename
                    try:
                        with regp.open("r", encoding="utf-8") as f:
                            reg_data = json.load(f)
                        mp = reg_data.get("modelPath")
                        pid = reg_data.get("previewId")
                        if not mp or not pid:
                            continue

                        _, folder = get_preview_paths(pid)
                        thumb = folder / "thumbnail.jpg"
                        if thumb.exists():
                            with thumb.open("rb") as tf:
                                b = tf.read()
                            b64 = base64.b64encode(b).decode("utf-8")
                            result_map[mp] = f"data:image/jpeg;base64,{b64}"
                    except Exception as ex:
                        logger.error(f"{FLOWMSG}: Error reading registry {regp}: {ex}")
                        continue

        return web.json_response(result_map)

    except Exception as e:
        logger.error(f"{FLOWMSG}: Error in list_model_previews_handler: {e}")
        return web.Response(status=500, text=str(e))

async def get_model_preview_handler(request: web.Request) -> web.Response:
    try:
        ensure_data_folders()
        rawPath = request.query.get("modelPath", None)
        if not rawPath:
            return web.Response(status=400, text="Missing 'modelPath'")

        pid = get_preview_id(rawPath)
        _, image_folder = get_preview_paths(pid)

        thumb = image_folder / "thumbnail.jpg"
        if thumb.exists():
            with thumb.open("rb") as tf:
                b = tf.read()
            b64 = base64.b64encode(b).decode("utf-8")
            data_url = f"data:image/jpeg;base64,{b64}"
            return web.json_response({rawPath: data_url})
        else:
            return web.Response(status=404, text="Preview not found")

    except Exception as e:
        logger.error(f"{FLOWMSG}: Error in get_model_preview_handler: {e}")
        return web.Response(status=500, text=str(e))

async def apps_handler(request: web.Request) -> web.Response:
    return web.json_response(APP_CONFIGS)

async def flow_version_handler(request: web.Request) -> web.Response:
    return web.json_response({'version': APP_VERSION})

async def extension_node_map_handler(request: web.Request) -> web.Response:
    if EXTENSION_NODE_MAP_PATH.exists():
        with EXTENSION_NODE_MAP_PATH.open('r') as f:
            extension_node_map = json.load(f)
        return web.json_response(extension_node_map)
    else:
        logger.error(f"{FLOWMSG}: extension-node-map.json not found at {EXTENSION_NODE_MAP_PATH}")
        return web.Response(status=404, text="extension-node-map.json not found")

async def installed_custom_nodes_handler(request: web.Request) -> web.Response:
    try:
        installed_nodes = [item.name for item in CUSTOM_NODES_DIR.iterdir() if item.is_dir()]
        return web.json_response({'installedNodes': installed_nodes})
    except Exception as e:
        logger.error(f"{FLOWMSG}: Error fetching installed custom nodes: {e}")
        return web.Response(status=500, text="Internal Server Error")

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
                    'message': f"Failed to install requirements for '{package_name}'. The package has been removed. Please try installing manually."
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
        shutil.rmtree(install_path, onerror=remove_readonly)
        logger.info(f"{FLOWMSG}: Custom node '{package_name}' uninstalled successfully.")
        return web.json_response({'status': 'success', 'message': f"Custom node '{package_name}' uninstalled successfully."})
    except Exception as e:
        logger.error(f"{FLOWMSG}: An error occurred while uninstalling '{package_name}': {e}")
        return web.json_response({'status': 'error', 'message': f"An error occurred while uninstalling custom node '{package_name}': {e}"}, status=500)

async def list_themes_handler(request: web.Request) -> web.Response:
    themes_dir = CUSTOM_THEMES_DIR
    try:
        if not themes_dir.exists():
            logger.warning(f"Custom themes directory does not exist: {themes_dir}")
            return web.json_response([], status=200)
        
        css_files = [file.name for file in themes_dir.iterdir() if file.is_file() and allowed_file(file.name)]
        return web.json_response(css_files)
    
    except Exception as e:
        logger.error(f"Error listing theme files: {e}")
        return web.json_response({'error': 'Failed to list theme files.'}, status=500)

async def get_theme_css_handler(request: web.Request) -> web.Response:
    filename = request.match_info.get('filename')
    
    if not allowed_file(filename):
        logger.warning(f"Attempt to access disallowed file type: {filename}")
        raise web.HTTPNotFound()
    
    file_path = CUSTOM_THEMES_DIR / filename
    
    if not file_path.exists() or not file_path.is_file():
        logger.warning(f"CSS file not found: {file_path}")
        raise web.HTTPNotFound()
    
    try:
        return web.FileResponse(path=file_path)
    except Exception as e:
        logger.error(f"Error serving CSS file '{filename}': {e}")
        raise web.HTTPInternalServerError(text="Internal Server Error")

async def preview_flow_handler(request: web.Request) -> web.Response:
    try:
        reader = await request.multipart()
        flow_config = None
        wf_file = None
        thumbnail_data = None
        thumbnail_extension = None

        while True:
            part = await reader.next()
            if part is None:
                break

            if part.name == 'flowConfig':
                flow_config_content = await part.read(decode=True)
                try:
                    flow_config = json.loads(flow_config_content)
                except json.JSONDecodeError:
                    return web.Response(status=400, text="Invalid JSON format in 'flowConfig'")
                
                flow_url = flow_config.get('url', None)
                if not flow_url:
                    return web.Response(status=400, text="Missing 'url' in 'flowConfig'")

            elif part.name == 'wf':
                wf_file = await part.read(decode=False)

            elif part.name == 'thumbnail':
                thumbnail_str = await part.text()
                match = re.match(r'data:(image/\w+);base64,(.+)', thumbnail_str)
                if match:
                    mime_type = match.group(1)
                    base64_data = match.group(2)
                    thumbnail_extension = mime_type.split('/')[1]

                    try:
                        thumbnail_data = base64.b64decode(base64_data)
                    except base64.binascii.Error:
                        return web.Response(status=400, text="Invalid Base64 encoding in 'thumbnail'")
                else:
                    return web.Response(status=400, text="Invalid data URL format for 'thumbnail'")

        if not flow_config or not wf_file:
            return web.Response(status=400, text="Missing 'flowConfig' or 'wf' in request")

        flow_id = "linker"
        if not flow_id:
            return web.Response(status=400, text="Missing 'id' in request body")

        if not SAFE_FOLDER_NAME_REGEX.match(flow_id):
            return web.Response(status=400, text="Invalid 'flow_id'. Only letters, numbers, dashes, and underscores are allowed.")

        flow_path = WEBROOT / flow_id
        if not flow_path.exists():
            return web.Response(status=404, text=f"Flow directory '{flow_id}' not found")

        config_path = flow_path / FLOWS_CONFIG_FILE
        with config_path.open('w', encoding='utf-8') as f:
            json.dump(flow_config, f, indent=2)

        if wf_file:
            wf_json_path = flow_path / 'wf.json'
            with wf_json_path.open('wb') as f:
                f.write(wf_file)

        if thumbnail_data and thumbnail_extension:
            thumbnail_filename = f"thumbnail.{thumbnail_extension}"
            thumbnail_path = flow_path / thumbnail_filename
            with thumbnail_path.open('wb') as f:
                f.write(thumbnail_data)
            flow_config['thumbnail'] = thumbnail_filename
            with config_path.open('w', encoding='utf-8') as f:
                json.dump(flow_config, f, indent=2)

            logger.info(f"Thumbnail saved as '{thumbnail_filename}' in flow '{flow_id}'")

        return web.json_response({
            'status': 'success',
            'message': f"Configuration for previewing flow '{flow_id}' saved successfully.",
            'thumbnail': f"thumbnail.{thumbnail_extension}" if thumbnail_extension else None
        })

    except Exception as e:
        logger.error(f"{FLOWMSG}: Error saving configuration: {e}")
        return web.Response(status=500, text=f"{FLOWMSG}: Error saving configuration: {str(e)}")

async def reset_preview_handler(request: web.Request) -> web.Response:
    try:
        flow_id = "linker"
        flow_path = WEBROOT / flow_id

        if not flow_path.exists():
            return web.Response(status=404, text=f"Flow directory '{flow_id}' not found")

        defwf_path = flow_path / 'defwf.json'
        wf_path = flow_path / 'wf.json'
        def_flow_config_path = flow_path / 'defFlowConfig.json'
        flow_config_path = flow_path / FLOWS_CONFIG_FILE

        if not defwf_path.exists():
            return web.Response(status=404, text=f"Default workflow file 'defwf.json' not found in '{flow_id}'")

        if not def_flow_config_path.exists():
            return web.Response(status=404, text=f"Default flow configuration file 'defFlowConfig.json' not found in '{flow_id}'")

        shutil.copy2(defwf_path, wf_path)
        shutil.copy2(def_flow_config_path, flow_config_path)

        logger.info(f"{FLOWMSG}: Preview reset successfully for flow '{flow_id}'.")
        return web.json_response({
            'status': 'success',
            'message': f"Preview has been reset successfully for flow '{flow_id}'."
        })

    except Exception as e:
        logger.error(f"{FLOWMSG}: Error resetting preview: {e}")
        return web.Response(status=500, text=f"{FLOWMSG}: Error resetting preview: {str(e)}")

async def create_flow_handler(request: web.Request) -> web.Response:
    try:
        reader = await request.multipart()
        flow_config = None
        wf_file = None
        flow_url = None
        thumbnail_data = None

        while True:
            part = await reader.next()
            if part is None:
                break

            if part.name == 'flowConfig':
                flow_config_content = await part.read(decode=True)
                try:
                    flow_config = json.loads(flow_config_content)
                except json.JSONDecodeError:
                    return web.Response(status=400, text="Invalid JSON format in 'flowConfig'")
                
                flow_url = flow_config.get('url', None)
                if not flow_url:
                    return web.Response(status=400, text="Missing 'url' in 'flowConfig'")

            elif part.name == 'wf':
                wf_file = await part.read(decode=False)

            elif part.name == 'thumbnail':
                thumbnail_str = await part.text()
                match = re.match(r'data:(image/\w+);base64,(.+)', thumbnail_str)
                if match:
                    mime_type = match.group(1)
                    base64_data = match.group(2)
                    try:
                        thumbnail_bytes = base64.b64decode(base64_data)
                        image = Image.open(BytesIO(thumbnail_bytes))
                        if image.mode in ("RGBA", "P"):
                            image = image.convert("RGB")
                        width_percent = (468 / float(image.size[0]))
                        new_height = int((float(image.size[1]) * float(width_percent)))
                        image = image.resize((468, new_height), Image.Resampling.LANCZOS)
                        buffered = BytesIO()
                        image.save(buffered, format="JPEG")
                        thumbnail_data = buffered.getvalue()
                    except Exception as e:
                        logger.error(f"{FLOWMSG}: Error processing thumbnail: {e}")
                        return web.Response(status=400, text="Invalid image data in 'thumbnail'")
                else:
                    return web.Response(status=400, text="Invalid data URL format for 'thumbnail'")

        if not flow_config or not wf_file:
            return web.Response(status=400, text="Missing 'flowConfig' or 'wf' in request")

        if not SAFE_FOLDER_NAME_REGEX.match(flow_url):
            return web.Response(status=400, text="Invalid 'url' in 'flowConfig'. Only letters, numbers, dashes, and underscores are allowed.")

        flow_folder = FLOWS_PATH / flow_url
        if flow_folder.exists():
            return web.Response(status=400, text=f"Flow with url '{flow_url}' already exists")

        flow_folder.mkdir(parents=True, exist_ok=False)

        flow_config_path = flow_folder / FLOWS_CONFIG_FILE
        with flow_config_path.open('w', encoding='utf-8') as f:
            json.dump(flow_config, f, indent=2)

        wf_json_path = flow_folder / 'wf.json'
        with wf_json_path.open('wb') as f:
            f.write(wf_file)

        if thumbnail_data:
            media_folder = flow_folder / 'media'
            media_folder.mkdir(exist_ok=True)
            thumbnail_filename = "thumbnail.jpg"
            thumbnail_path = media_folder / thumbnail_filename
            with thumbnail_path.open('wb') as f:
                f.write(thumbnail_data)

            with flow_config_path.open('w', encoding='utf-8') as f:
                json.dump(flow_config, f, indent=2)

            logger.info(f"Thumbnail saved as '{thumbnail_filename}' in flow '{flow_url}'")

        index_template_path = CORE_PATH / 'templates' / 'index.html'
        if not index_template_path.exists():
            return web.Response(status=500, text="Template 'index.html' not found")
        
        index_destination_path = flow_folder / 'index.html'
        shutil.copy2(index_template_path, index_destination_path)

        logger.info(f"{FLOWMSG}: Flow '{flow_url}' created successfully.")
        return web.json_response({'status': 'success', 'message': f"Flow '{flow_url}' created successfully."})

    except Exception as e:
        logger.error(f"{FLOWMSG}: Error creating flow: {e}")
        return web.Response(status=500, text=f"{FLOWMSG}: Error creating flow: {str(e)}")

async def update_flow_handler(request: web.Request) -> web.Response:
    try:
        reader = await request.multipart()
        flow_config = None
        wf_file = None
        flow_url = None
        thumbnail_data = None

        while True:
            part = await reader.next()
            if part is None:
                break

            if part.name == 'flowConfig':
                flow_config_content = await part.read(decode=True)
                try:
                    flow_config = json.loads(flow_config_content)
                except json.JSONDecodeError:
                    return web.Response(status=400, text="Invalid JSON format in 'flowConfig'")
                
                flow_url = flow_config.get('url', None)
                if not flow_url:
                    return web.Response(status=400, text="Missing 'url' in 'flowConfig'")

            elif part.name == 'wf':
                wf_file = await part.read(decode=False)

            elif part.name == 'thumbnail':
                thumbnail_str = await part.text()
                match = re.match(r'data:(image/\w+);base64,(.+)', thumbnail_str)
                if match:
                    mime_type = match.group(1)
                    base64_data = match.group(2)
                    try:
                        thumbnail_bytes = base64.b64decode(base64_data)
                        image = Image.open(BytesIO(thumbnail_bytes))
                        if image.mode in ("RGBA", "P"):
                            image = image.convert("RGB")
                        width_percent = (468 / float(image.size[0]))
                        new_height = int((float(image.size[1]) * float(width_percent)))
                        image = image.resize((468, new_height), Image.Resampling.LANCZOS)
                        buffered = BytesIO()
                        image.save(buffered, format="JPEG")
                        thumbnail_data = buffered.getvalue()
                    except Exception as e:
                        logger.error(f"{FLOWMSG}: Error processing thumbnail: {e}")
                        return web.Response(status=400, text="Invalid image data in 'thumbnail'")
                else:
                    return web.Response(status=400, text="Invalid data URL format for 'thumbnail'")

        if not flow_config:
            return web.Response(status=400, text="Missing 'flowConfig' in request")

        if not SAFE_FOLDER_NAME_REGEX.match(flow_url):
            return web.Response(status=400, text="Invalid 'url' in 'flowConfig'. Only letters, numbers, dashes, and underscores are allowed.")

        flow_folder = FLOWS_PATH / flow_url
        if not flow_folder.exists():
            return web.Response(status=400, text=f"Flow with url '{flow_url}' does not exist")

        flow_config_path = flow_folder / FLOWS_CONFIG_FILE
        with flow_config_path.open('w', encoding='utf-8') as f:
            json.dump(flow_config, f, indent=2)

        if wf_file:
            wf_json_path = flow_folder / 'wf.json'
            with wf_json_path.open('wb') as f:
                f.write(wf_file)

        if thumbnail_data:
            media_folder = flow_folder / 'media'
            media_folder.mkdir(exist_ok=True)
            thumbnail_filename = "thumbnail.jpg"
            thumbnail_path = media_folder / thumbnail_filename
            with thumbnail_path.open('wb') as f:
                f.write(thumbnail_data)

            with flow_config_path.open('w', encoding='utf-8') as f:
                json.dump(flow_config, f, indent=2)

            logger.info(f"Thumbnail updated as '{thumbnail_filename}' in flow '{flow_url}'")

        logger.info(f"{FLOWMSG}: Flow '{flow_url}' updated successfully.")
        return web.json_response({'status': 'success', 'message': f"Flow '{flow_url}' updated successfully."})

    except Exception as e:
        logger.error(f"{FLOWMSG}: Error updating flow: {e}")
        return web.Response(status=500, text=f"{FLOWMSG}: Error updating flow: {str(e)}")

async def delete_flow_handler(request: web.Request) -> web.Response:
    try:
        flow_url = request.query.get('url', None)
        if not flow_url:
            return web.Response(status=400, text="Missing 'url' parameter")

        if not SAFE_FOLDER_NAME_REGEX.match(flow_url):
            return web.Response(status=400, text="Invalid 'url' parameter.")

        flow_folder = FLOWS_PATH / flow_url
        if not flow_folder.exists():
            return web.Response(status=400, text=f"Flow with url '{flow_url}' does not exist")

        shutil.rmtree(flow_folder)

        logger.info(f"{FLOWMSG}: Flow '{flow_url}' deleted successfully.")
        return web.json_response({'status': 'success', 'message': f"Flow '{flow_url}' deleted successfully."})

    except Exception as e:
        logger.error(f"{FLOWMSG}: Error deleting flow: {e}")
        return web.Response(status=500, text=f"{FLOWMSG}: Error deleting flow: {str(e)}")

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def remove_readonly(func, path, excinfo):
    os.chmod(path, stat.S_IWRITE)
    func(path)