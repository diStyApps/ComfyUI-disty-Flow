import subprocess
import tempfile
import shutil
from pathlib import Path
from .constants import FLOWS_DOWNLOAD_PATH, FLOWS_PATH, FLOWS_TO_REMOVE, FLOWMSG, logger

def download_update_flows() -> None:
    try:
        for flow in FLOWS_TO_REMOVE:
            flow_path = FLOWS_PATH / flow
            if flow_path.exists() and flow_path.is_dir():
                # logger.info(f"{FLOWMSG}: Removing existing flow directory '{flow}'")
                shutil.rmtree(flow_path)
                # logger.debug(f"{FLOWMSG}: Successfully removed '{flow}'")

        with tempfile.TemporaryDirectory() as tmpdirname:
            temp_repo_path = Path(tmpdirname) / "Flows"
            logger.info(f"{FLOWMSG}: Downloading and Updating Flows")

            result = subprocess.run(
                ['git', 'clone', FLOWS_DOWNLOAD_PATH, str(temp_repo_path)],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                logger.error(f"{FLOWMSG}: Failed to clone flows repository:\n{result.stderr}")
                return
            else:
                # logger.debug(f"{FLOWMSG}: Successfully cloned flows repository")
                pass

            if not FLOWS_PATH.exists():
                FLOWS_PATH.mkdir(parents=True)
                # logger.debug(f"{FLOWMSG}: Created flows directory at '{FLOWS_PATH}'")

            for item in temp_repo_path.iterdir():
                if item.name in ['.git', '.github']:
                    # logger.debug(f"{FLOWMSG}: Skipping directory '{item.name}'")
                    continue
                dest_item = FLOWS_PATH / item.name
                if item.is_dir():
                    if dest_item.exists():
                        # logger.info(f"{FLOWMSG}: Updating existing directory '{item.name}'")
                        _copy_directory(item, dest_item)
                    else:
                        shutil.copytree(item, dest_item)
                        # logger.info(f"{FLOWMSG}: Copied new directory '{item.name}'")
                else:
                    shutil.copy2(item, dest_item)
                    # logger.info(f"{FLOWMSG}: Copied file '{item.name}'")

            logger.info(f"{FLOWMSG}: Flows have been updated successfully.")
    except Exception as e:
        logger.error(f"{FLOWMSG}: An error occurred while downloading or updating flows: {e}")

def _copy_directory(src: Path, dest: Path) -> None:
    for item in src.iterdir():
        if item.name in ['.git', '.github']:
            continue
        dest_item = dest / item.name
        if item.is_dir():
            if not dest_item.exists():
                dest_item.mkdir()
            _copy_directory(item, dest_item)
        else:
            shutil.copy2(item, dest_item)
