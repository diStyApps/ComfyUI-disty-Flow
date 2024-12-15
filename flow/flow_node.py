class Flow:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
            },
        }

    RETURN_TYPES = ("Flow",)
    FUNCTION = "flow"
    CATEGORY = '🅓 diSty/Flow'
    def flow(self):
        return "Flow"
    
NODE_CLASS_MAPPINGS = {
    "Flow": Flow
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Flow": "Flow"
}