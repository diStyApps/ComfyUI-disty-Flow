from aiohttp import web
import server
from .flow_manager import FlowManager
from .downloader import download_update_flows
from .constants import FLOWMSG, logger

def setup_server() -> None:
    try:
        server_instance = server.PromptServer.instance
    except Exception as e:
        logger.error(f"{FLOWMSG}: Failed to get server instance: {e}")
        return

    download_update_flows()

    try:
        FlowManager.setup_app_routes(server_instance.app)
    except Exception as e:
        logger.error(f"{FLOWMSG}: Failed to set up app routes: {e}")
