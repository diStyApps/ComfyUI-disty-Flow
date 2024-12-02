export const componentTypes = {
    'prompt': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
        { name: 'default', label: 'Default Value', type: 'text' },
    ],
    'dropdown': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'url', label: 'URL', type: 'text' },
        { name: 'key', label: 'Key', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],
    'stepper': [
        { name: 'id', type: 'text', label: 'ID' },
        { name: 'label', type: 'text', label: 'Label' },
        { name: 'minValue', type: 'number', label: 'Min Value', value: 0.1 },
        { name: 'maxValue', type: 'number', label: 'Max Value', value: 100.0 },
        { name: 'step', type: 'number', label: 'Step', value: 0.1 },
        { name: 'defValue', type: 'number', label: 'Default Value', value: 6 },
        { name: 'precision', type: 'number', label: 'Precision', value: 1 },
        { name: 'scaleFactor', type: 'number', label: 'Scale Factor', value: 10 },
    ],
    'input': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
        { name: 'defValue', label: 'Default Value', type: 'text' },
    ],
    'toggle': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
        { name: 'defaultValue', label: 'Default Value' , value: true},
    ],
    'seeder': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],
    'multiComponent': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],
    'dimensionSelector': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'defaultWidth', label: 'Default Width', type: 'number' },
        { name: 'defaultHeight', label: 'Default Height', type: 'number' },
    ],
    'imageLoader': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],
    'canvasOutput': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],
    'canvasLoadedImage': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],
    'canvasAlphaOutput': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],
    'canvasSelectedMaskOutput': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],    
    'canvasCroppedMaskOutput': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],       
    'canvasCroppedImageOutput': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],  
    'canvasCroppedAlphaOnImageOutput': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'label', label: 'Label', type: 'text' },
    ],

    'dataComponent': [
        { name: 'id', label: 'ID', type: 'text' },
        { name: 'name', label: 'NAME', type: 'text' },
        { name: 'dataPath', label: 'Data Path', type: 'text'},
    ],
};