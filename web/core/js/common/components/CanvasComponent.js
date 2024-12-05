import { showSpinner, hideSpinner } from './utils.js';
import { updateWorkflow } from './workflowManager.js';
import { messageHandler } from './messageHandler.js';

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

async function processAndUpload(
    items,
    getImage,
    uploadDescription,
    defaultErrorMessage,
    successMessagePrefix,
    workflow,
    postUploadCallback = null
) {
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
                // console.log(`Server Response for ${id}:`, result);
            } catch (e) {
                throw new Error('Invalid JSON response from server.');
            }

            // console.log(`${successMessagePrefix} ${id} uploaded successfully:`, result);
            if (result && result.name) {
                updateWorkflow(workflow, nodePath, result.name);
                switch (uploadDescription) {
                    case 'Original Image':
                        messageHandler.setOriginalImage(imageDataURL);
                        // console.log('Original Image set in MessageHandler');
                        break;
                    case 'Cropped Mask Image':
                        messageHandler.setCroppedMaskImage(imageDataURL);
                        // console.log('Cropped Mask Image set in MessageHandler');
                        break;                        
                    case 'Mask Alpha Image':
                        messageHandler.setAlphaMaskImage(imageDataURL);
                        // console.log('Mask Alpha Image set in MessageHandler');
                        break;
                    // case 'Mask Image':
                    //     messageHandler.setMaskImage(imageDataURL);
                    //     console.log('Mask Image set in MessageHandler');
                    //     break;
                    // case 'Selected Mask Alpha Image':
                    //     messageHandler.setCanvasSelectedMaskOutputs(imageDataURL);
                    //     // console.log('Selected Mask Alpha Image added to CanvasSelectedMaskOutputs in MessageHandler');
                    //     messageHandler.setMaskImage(imageDataURL);
                    //     // console.log('Mask Image set in MessageHandler');
                    //     break;
                    default:
                        // console.warn(`No setter defined for upload description: ${uploadDescription}`);
                }
            } else {
                throw new Error('Server response did not include imageUrl or imageName.');
            }
            if (postUploadCallback) {
                postUploadCallback(result);
            }
        } catch (error) {
            console.error(`Error uploading ${uploadDescription.toLowerCase()} ${id}:`, error);
            // alert(`Error uploading ${label}: ${error.message}`);
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

    if  (flowConfig.canvasCroppedMaskOutputs && Array.isArray(flowConfig.canvasCroppedMaskOutputs)) {
        await processAndUpload(
            flowConfig.canvasCroppedMaskOutputs,
            () => canvasLoader.getCroppedMask(),
            'Cropped Mask Image',
            'Cropped mask image upload failed.',
            'Cropped Mask Image',
            workflow
        );
    }

    if  (flowConfig.canvasCroppedImageOutputs && Array.isArray(flowConfig.canvasCroppedImageOutputs)) {
        await processAndUpload(
            flowConfig.canvasCroppedImageOutputs,
            () => canvasLoader.getCroppedImage(),
            'Cropped Image',
            'Cropped image upload failed.',
            'Cropped Image',
            workflow
        );
    }

    if  (flowConfig.canvasCroppedAlphaOnImageOutputs && Array.isArray(flowConfig.canvasCroppedAlphaOnImageOutputs)) {
        await processAndUpload(
            flowConfig.canvasCroppedAlphaOnImageOutputs,
            () => canvasLoader.getCroppedAlphaOnImage(),
            'Cropped Alpha Image',
            'Cropped alpha image upload failed.',
            'Cropped Alpha Image',
            workflow
        );
    }

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

    // ** ( Case 1 ) **
    if (
        flowConfig.canvasLoadedImages && Array.isArray(flowConfig.canvasLoadedImages) &&
        flowConfig.canvasAlphaOutputs && Array.isArray(flowConfig.canvasAlphaOutputs)
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
            flowConfig.canvasAlphaOutputs,
            () => canvasLoader.getMaskAlphaOnImage(),
            'Mask Alpha Image',
            'Mask alpha image upload failed.',
            'Mask Alpha Image',
            workflow
        );
    }

    // ** ( Case 3 ) **
    // if (
    //     flowConfig.canvasCroppedImageOutputs && Array.isArray(flowConfig.canvasCroppedImageOutputs) &&
    //     flowConfig.canvasCroppedMaskOutputs && Array.isArray(flowConfig.canvasCroppedMaskOutputs)
    // ) {
    //     await processAndUpload(
    //         flowConfig.canvasCroppedImageOutputs,
    //         () => canvasLoader.getCroppedImage(),
    //         'Cropped Image',
    //         'Cropped image upload failed.',
    //         'Cropped Image',
    //         workflow
    //     );

    //     await processAndUpload(
    //         flowConfig.canvasCroppedMaskOutputs,
    //         () => canvasLoader.getCroppedMask(),
    //         'Cropped Mask Image',
    //         'Cropped mask image upload failed.',
    //         'Cropped Mask Image',
    //         workflow
    //     );
    // }

    // ** ( Case 4 ) **
    if (
        flowConfig.canvasCroppedImageOutputs && Array.isArray(flowConfig.canvasCroppedImageOutputs) &&
        flowConfig.canvasCroppedMaskOutputs && Array.isArray(flowConfig.canvasCroppedMaskOutputs) &&
        flowConfig.canvasLoadedImages && Array.isArray(flowConfig.canvasLoadedImages)
    ) {
        await processAndUpload(
            flowConfig.canvasCroppedImageOutputs,
            () => canvasLoader.getCroppedImage(),
            'Cropped Image',
            'Cropped image upload failed.',
            'Cropped Image',
            workflow
        );

        await processAndUpload(
            flowConfig.canvasCroppedMaskOutputs,
            () => canvasLoader.getCroppedMask(),
            'Cropped Mask Image',
            'Cropped mask image upload failed.',
            'Cropped Mask Image',
            workflow
        );

        await processAndUpload(
            flowConfig.canvasLoadedImages,
            () => canvasLoader.getOriginalImage(),
            'Original Image',
            'Original image upload failed.',
            'Original Image',
            workflow
        );
    }

    // ** ( Case 5 ) **
    if (
        flowConfig.canvasCroppedImageOutputs && Array.isArray(flowConfig.canvasCroppedImageOutputs) &&
        flowConfig.canvasCroppedAlphaOnImageOutputs && Array.isArray(flowConfig.canvasCroppedAlphaOnImageOutputs) &&
        flowConfig.canvasLoadedImages && Array.isArray(flowConfig.canvasLoadedImages)
    ) {
        await processAndUpload(
            flowConfig.canvasCroppedImageOutputs,
            () => canvasLoader.getCroppedImage(),
            'Cropped Image',
            'Cropped image upload failed.',
            'Cropped Image',
            workflow
        );

        await processAndUpload(
            flowConfig.canvasCroppedAlphaOnImageOutputs,
            () => canvasLoader.getCroppedAlphaOnImage(),
            'Cropped Alpha Image',
            'Cropped alpha image upload failed.',
            'Cropped Alpha Image',
            workflow
        );

        await processAndUpload(
            flowConfig.canvasLoadedImages,
            () => canvasLoader.getOriginalImage(),
            'Original Image',
            'Original image upload failed.',
            'Original Image',
            workflow
        );
    }

}
