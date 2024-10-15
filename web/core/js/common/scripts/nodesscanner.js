const BASE_URL = `${window.location.origin}/object_info/`;

async function fetchNodeInfo(classType) {
    try {
        const response = await fetch(`${BASE_URL}${encodeURIComponent(classType)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data[classType] || null;
    } catch (error) {
        console.error(`Error fetching data for ${classType}:`, error);
        return null;
    }
}

async function fetchExtensionNodeMap() {
    try {
        const response = await fetch('/api/extension-node-map');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching extension node map:', error);
        return {};
    }
}

async function processWorkflowNodes(workflow, filterCustomNodes = false) {
    const nodeToCustomNodeMap = {};
    const uniqueCustomNodesSet = new Set();
    const nodeTypeCount = {};
    const missingNodesSet = new Set();

    const extensionNodeMap = await fetchExtensionNodeMap();

    const processNode = async (nodeId, node) => {
        const classType = node.class_type;
        if (classType) {
            nodeTypeCount[classType] = (nodeTypeCount[classType] || 0) + 1;
            const nodeInfo = await fetchNodeInfo(classType);
            if (nodeInfo && nodeInfo.python_module) {
                if (!filterCustomNodes || nodeInfo.python_module.includes('custom_nodes')) {
                    const inputPaths = {};
                    for (const [inputName, inputValue] of Object.entries(node.inputs)) {
                        inputPaths[inputName] = `${nodeId}.inputs.${inputName}`;
                    }
                    nodeToCustomNodeMap[nodeId] = {
                        pythonModule: nodeInfo.python_module,
                        classType,
                        count: nodeTypeCount[classType],
                        inputPaths,
                        inputs: nodeInfo.input,
                        outputs: nodeInfo.output
                    };
                    uniqueCustomNodesSet.add(nodeInfo.python_module.split('.').pop());
                }
            } else {
                missingNodesSet.add(classType);
            }
        }
    };

    const nodeProcessingPromises = Object.entries(workflow).map(([nodeId, node]) => processNode(nodeId, node));
    await Promise.all(nodeProcessingPromises);

    const missingNodes = Array.from(missingNodesSet);
    const missingCustomPackagesMap = new Map();

    missingNodes.forEach(missingNode => {
        for (const [packageUrl, packageInfo] of Object.entries(extensionNodeMap)) {
            const [nodeClasses, extraInfo] = packageInfo;
            const title = extraInfo.title_aux;

            if (nodeClasses.includes(missingNode)) {
                if (!missingCustomPackagesMap.has(packageUrl)) {
                    missingCustomPackagesMap.set(packageUrl, { title: title, packageUrl: packageUrl });
                }
            }
        }
    });

    const missingCustomPackages = Array.from(missingCustomPackagesMap.values());

    return {
        nodeToCustomNodeMap,
        uniqueCustomNodesArray: Array.from(uniqueCustomNodesSet),
        nodeTypeCount,
        missingNodes,
        missingCustomPackages
    };
}

async function analyzeWorkflow(workflow) {
    const { nodeToCustomNodeMap, uniqueCustomNodesArray, nodeTypeCount, missingNodes, missingCustomPackages } = await processWorkflowNodes(workflow);
    const nodeAnalysis = Object.entries(workflow).map(([nodeId, node]) => ({
        id: nodeId,
        type: node.class_type,
        inputs: Object.keys(node.inputs).length,
        customNode: nodeToCustomNodeMap[nodeId] ? 'Yes' : 'No',
        title: node._meta?.title || 'Untitled',
        inputPaths: nodeToCustomNodeMap[nodeId]?.inputPaths || {}
    }));
    return {
        totalNodes: Object.keys(workflow).length,
        uniqueNodeTypes: Object.keys(nodeTypeCount).length,
        nodeTypeFrequency: nodeTypeCount,
        customNodes: uniqueCustomNodesArray,
        missingNodes,
        missingCustomPackages,
        nodeAnalysis,
        nodeToCustomNodeMap
    };
}

export { fetchNodeInfo, fetchExtensionNodeMap, processWorkflowNodes, analyzeWorkflow };
