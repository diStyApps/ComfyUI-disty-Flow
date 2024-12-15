from .flow.flow_node import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
from .flow.constants import WEB_DIRECTORY
from .flow.server_setup import setup_server
setup_server()
__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
