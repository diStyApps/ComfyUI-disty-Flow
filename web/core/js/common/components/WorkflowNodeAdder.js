class WorkflowNodeAdder {
    constructor(workflow) {
        if (typeof workflow !== 'object' || workflow === null || Array.isArray(workflow)) {
            throw new TypeError('Workflow must be a non-null object');
        }
        this.workflow = JSON.parse(JSON.stringify(workflow));
        this.existingIds = new Set(Object.keys(this.workflow).map(id => parseInt(id, 10)));
        this.highestId = this._getHighestNodeId();
    }

    addLora(modelLoaderId) {
        if (!this.workflow[modelLoaderId]) {
            throw new Error(`Model loader node with ID ${modelLoaderId} does not exist.`);
        }

        const modelLoader = this.workflow[modelLoaderId];
        if (!this._isModelLoader(modelLoader.class_type)) {
            throw new Error(`Node ID ${modelLoaderId} is not a recognized model loader.`);
        }

        const newLoraId = this._getNextNodeId();
        const loraNode = this._createLoraNode(newLoraId);

        const existingLoras = this._findLoraNodes(modelLoaderId);
        if (existingLoras.length === 0) {
            const firstConnectedNodes = this._findConnectedNodes(modelLoaderId);
            if (firstConnectedNodes.length === 0) {
                throw new Error(`No nodes are directly connected to model loader ID ${modelLoaderId}.`);
            }

            firstConnectedNodes.forEach(node => {
                node.inputs.model = [newLoraId.toString(), 0];
            });

            loraNode.inputs.model = [modelLoaderId.toString(), 0];
        } else {
            const lastLora = this._getLastLoraNode(existingLoras);
            const firstConnectedNodes = this._findConnectedNodes(lastLora.id);
            if (firstConnectedNodes.length === 0) {
                throw new Error(`No nodes are directly connected to the last LoRA node ID ${lastLora.id}.`);
            }

            firstConnectedNodes.forEach(node => {
                node.inputs.model = [newLoraId.toString(), 0];
            });

            loraNode.inputs.model = [lastLora.id.toString(), 0];
        }

        this.workflow[newLoraId.toString()] = loraNode;
        this.existingIds.add(newLoraId);
        this.highestId = newLoraId;

        return newLoraId;
    }

    getWorkflow() {
        return this.workflow;
    }

    _createLoraNode(id) {
        return {
            inputs: {
                lora_name: "lora.safetensors",
                strength_model: 1,
                model: []
            },
            class_type: "LoraLoaderModelOnly",
            _meta: {
                title: "LoraLoaderModelOnly"
            }
        };
    }

    _findLoraNodes(modelLoaderId) {
        return Object.entries(this.workflow)
            .filter(([_, node]) => node.class_type === "LoraLoaderModelOnly")
            .map(([id, node]) => ({ id: parseInt(id, 10), ...node }))
            .filter(lora => {
                const modelInput = lora.inputs.model;
                return Array.isArray(modelInput) && parseInt(modelInput[0], 10) === modelLoaderId;
            });
    }

    _findModelLoaders() {
        return Object.entries(this.workflow)
            .filter(([_, node]) => {
                const hasModelInput = node.inputs && node.inputs.model !== undefined;
                return !hasModelInput && this._isModelLoader(node.class_type);
            })
            .map(([id, node]) => ({ id: parseInt(id, 10), ...node }));
    }

    _isModelLoader(classType) {
        const modelLoaderTypes = ["UNETLoader","CheckpointLoaderSimple","DownloadAndLoadMochiModel","UnetLoaderGGUF"];
        return modelLoaderTypes.includes(classType);
    }

    _findConnectedNodes(nodeId) {
        return Object.entries(this.workflow)
            .filter(([_, node]) => {
                if (!node.inputs || !node.inputs.model) return false;
                const modelInput = node.inputs.model;
                return Array.isArray(modelInput) && parseInt(modelInput[0], 10) === nodeId;
            })
            .map(([id, node]) => ({ id: parseInt(id, 10), ...node }));
    }

    _getLastLoraNode(loraNodes) {
        return loraNodes.reduce((prev, current) => {
            return (prev.id > current.id) ? prev : current;
        }, loraNodes[0]);
    }

    _getNextNodeId() {
        return this.highestId + 1;
    }

    _getHighestNodeId() {
        return this.existingIds.size > 0 ? Math.max(...this.existingIds) : 0;
    }
}

export default WorkflowNodeAdder;
