class WorkflowNodeAdder {
    constructor(workflow) {
        if (typeof workflow !== 'object' || workflow === null || Array.isArray(workflow)) {
            throw new TypeError('Workflow must be a non-null object');
        }
        this.workflow = { ...workflow };
        this.existingIds = new Set(Object.keys(this.workflow).map(id => parseInt(id, 10)));
        this.highestId = this._getHighestNodeId();
        this.loraCount = this._countExistingLoras();
    }

    addLora() {
        const newLoraId = this._getNextNodeId();
        const loraNode = this._createLoraNode(newLoraId);

        const existingLoras = this._findLoraNodes();

        if (existingLoras.length === 0) {
            const modelLoaders = this._findModelLoaders();
            if (modelLoaders.length === 0) {
                throw new Error('No model loader found in the workflow to attach LoRA');
            }

            modelLoaders.forEach(loader => {
                const originalModelInput = loader.inputs.model;
                loader.inputs.model = [newLoraId.toString(), 0];
                loraNode.inputs.model = originalModelInput;
            });
        } else {
            const lastLora = existingLoras[existingLoras.length - 1];
            const originalModelInput = lastLora.inputs.model;
            lastLora.inputs.model = [newLoraId.toString(), 0];
            loraNode.inputs.model = originalModelInput;
        }

        this.workflow[newLoraId.toString()] = loraNode;
        this.existingIds.add(newLoraId);
        this.highestId = newLoraId;
        this.loraCount += 1;

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

    _findLoraNodes() {
        return Object.entries(this.workflow)
            .filter(([_, node]) => node.class_type === "LoraLoaderModelOnly")
            .map(([id, node]) => ({ id: parseInt(id, 10), ...node }));
    }

    _findModelLoaders() {
        const modelLoaders = [];

        Object.entries(this.workflow).forEach(([id, node]) => {
            if (node.inputs && Array.isArray(node.inputs.model) && node.inputs.model.length === 2) {
                modelLoaders.push({ id: parseInt(id, 10), ...node });
            }
        });

        return modelLoaders;
    }

    _getNextNodeId() {
        return this.highestId + 1;
    }

    _getHighestNodeId() {
        return Math.max(...this.existingIds, 0);
    }

    _countExistingLoras() {
        return this._findLoraNodes().length;
    }
}

export default WorkflowNodeAdder;
