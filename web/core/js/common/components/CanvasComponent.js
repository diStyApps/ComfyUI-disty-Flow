import { showSpinner, hideSpinner } from './utils.js';
import { updateWorkflow } from './workflowManager.js';

function dataURLToBlob(dataURL) {
    const [header, data] = dataURL.split(',');
    const mimeMatch = header.match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL.');
    }
    const mime = mimeMatch[1];
    const binary = atob(data);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], { type: mime });
}

async function processAndUpload(items, getImage, uploadDescription, defaultErrorMessage, successMessagePrefix, workflow) {
    for (const item of items) {
        const { id, label, nodePath } = item;

        try {
            showSpinner();

            const imageDataURL = getImage();
            // console.log(`${uploadDescription} Data URL for ${id}:`, imageDataURL);
            if (!imageDataURL) {
                throw new Error(`${uploadDescription} data is unavailable.`);
            }

            const blob = dataURLToBlob(imageDataURL);

            const formData = new FormData();
            formData.append('image', blob, `${id}.png`);

            const response = await fetch('/upload/image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errorMessage = defaultErrorMessage;
                try {
                    const errorResponse = await response.json();
                    errorMessage = errorResponse.message || errorMessage;
                } catch (e) {
                    console.error('Failed to parse error response:', e);
                }
                throw new Error(errorMessage);
            }

            let result;
            try {
                result = await response.json();
                console.log(`Server Response for ${id}:`, result);
            } catch (e) {
                throw new Error('Invalid JSON response from server.');
            }

            console.log(`${successMessagePrefix} ${id} uploaded successfully:`, result);

            if (result && result.name) {
                updateWorkflow(workflow, nodePath, result.name);
                console.log(`Workflow updated at nodePath ${nodePath} with imageUrl: ${result.name}`);
            } else {
                throw new Error('Server response did not include imageUrl or imageName.');
            }
        } catch (error) {
            console.error(`Error uploading ${uploadDescription.toLowerCase()} ${id}:`, error);
            alert(`Error uploading ${label}: ${error.message}`);
        } finally {
            hideSpinner();
        }
    }
}

export default async function CanvasComponent(flowConfig, workflow, canvasLoader) {
    if (flowConfig.canvasOutputs && Array.isArray(flowConfig.canvasOutputs)) {
        await processAndUpload(
            flowConfig.canvasOutputs,
            () => canvasLoader.getCanvasOutImage(),
            'Canvas Output Image',
            'Canvas upload failed.',
            'Canvas',
            workflow
        );
    }

    // **Process canvasLoadedImages and canvasSelectedMaskOutputs (Case 1)**
    if (
        flowConfig.canvasLoadedImages && Array.isArray(flowConfig.canvasLoadedImages) &&
        flowConfig.canvasSelectedMaskOutputs && Array.isArray(flowConfig.canvasSelectedMaskOutputs)
    ) {
        await processAndUpload(
            flowConfig.canvasLoadedImages,
            () => canvasLoader.getOriginalImage(),
            'Original Image',
            'Original image upload failed.',
            'Original Image',
            workflow
        );

        await processAndUpload(
            flowConfig.canvasSelectedMaskOutputs,
            () => canvasLoader.getSelectedMaskAlphaOnImage(),
            'Selected Mask Alpha Image',
            'Selected mask alpha image upload failed.',
            'Selected Mask Alpha Image',
            workflow
        );
    }

    if (flowConfig.canvasMaskOutputs && Array.isArray(flowConfig.canvasMaskOutputs)) {
        await processAndUpload(
            flowConfig.canvasMaskOutputs,
            () => canvasLoader.getMaskImage(),
            'Mask Image',
            'Mask image upload failed.',
            'Mask Image',
            workflow
        );
    }

    if (flowConfig.canvasAlphaOutputs && Array.isArray(flowConfig.canvasAlphaOutputs)) {
        await processAndUpload(
            flowConfig.canvasAlphaOutputs,
            () => canvasLoader.getMaskAlphaOnImage(),
            'Mask Alpha Image',
            'Mask alpha image upload failed.',
            'Mask Alpha Image',
            workflow
        );
    }

    // **Process canvasSelectedMaskOutputs (New Functionality for Case 1)**
    if (flowConfig.canvasSelectedMaskOutputs && Array.isArray(flowConfig.canvasSelectedMaskOutputs)) {
        await processAndUpload(
            flowConfig.canvasSelectedMaskOutputs,
            () => canvasLoader.getSelectedMaskAlphaOnImage(),
            'Selected Mask Alpha Image',
            'Selected mask alpha image upload failed.',
            'Selected Mask Alpha Image',
            workflow
        );
    }
}
