const componentTemplates = {
    Prompt: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'prompt',
            params: {
                label: 'Prompt',
                nodePath: '{nodeId}.inputs.text',
            }
        }
    },
    Negative_Prompt: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'prompt',
            params: {
                label: 'Negative Prompt',
                nodePath: '{nodeId}.inputs.text',
            }
        }
    }, 
    prompt_clip_l: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'prompt',
            params: {
                label: 'Prompt CLIP L',
                nodePath: '{nodeId}.inputs.clip_l',
                default: 'A cartoon happy goat with purple eyes and a black horn in the jungle',
            }
        }
    },
    prompt_t5xxl: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'prompt',
            params: {
                label: 'Prompt T5 XXL',
                nodePath: '{nodeId}.inputs.t5xxl',
                default: 'A cartoon happy goat with purple eyes and a black horn in the jungle',
            }
        }
    },
    CLIPTextEncodeFlux: {
        type: 'components',
        nodeClass: 'CLIPTextEncodeFlux',
        components: [
            {
                type: 'prompt',
                params: {
                    label: 'Prompt CLIP L',
                    nodePath: '{nodeId}.inputs.clip_l',
                    default: 'A cartoon happy goat with purple eyes and a black horn in the jungle',
                },
            },
            {
                type: 'prompt',
                params: {
                    label: 'Prompt T5 XXL',
                    nodePath: '{nodeId}.inputs.t5xxl',
                    default: 'A cartoon happy goat with purple eyes and a black horn in the jungle',
                },
            },
        ],
    },
    imageLoader: {
        type: 'component',
        nodeClass: null, 
        component: {
            type: 'imageLoader',
            params: {
                label: 'ImageLoader',           
                nodePath: '{nodeId}.inputs.image' 
            }
        }
    },
    Seed: {
        type: 'component',
        nodeClass: null, 
        component: {
            type: 'seeder',
            params: {
                label: 'Seed',
                nodePath: '{nodeId}.inputs.seed',
                minValue: 0,
                maxValue: Number.MAX_SAFE_INTEGER,
                step: 1,
                defValue: 0,
                precision: 0,
                scaleFactor: 1,
            },
        },
    },
    steps: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Steps',
                nodePath: '{nodeId}.inputs.steps',
                minValue: 1,
                maxValue: 100,
                step: 1,
                defValue: 20,
                precision: 0,
                scaleFactor: 1,
            },
        },
    },
    CFG: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'CFG',
                nodePath: '{nodeId}.inputs.cfg',
                minValue: 0.1,
                maxValue: 100,
                step: 0.1,
                defValue: 7.5,
                precision: 1,
                scaleFactor: 1,
            },
        },
    },
    Sampler: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dropdown',
            params: {
                label: 'Sampler',
                nodePath: '{nodeId}.inputs.sampler_name',
                key: 'sampler_name',
                url: 'KSampler',
            },
        },
    },
    Scheduler: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dropdown',
            params: {
                label: 'Scheduler',
                nodePath: '{nodeId}.inputs.scheduler',
                key: 'scheduler',
                url: 'KSampler',
            },
        },
    },
    Denoise: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Denoise',
                nodePath: '{nodeId}.inputs.denoise',
                minValue: 0,
                maxValue: 1,
                step: 0.01,
                defValue: 1,
                precision: 2,
                scaleFactor: 1,
            },
        },
    },
    num_inference_steps: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Num Inference Steps',
                nodePath: '{nodeId}.inputs.num_inference_steps',
                minValue: 1,
                maxValue: 100,  
                step: 1,
                defValue: 50,
                precision: 0,
                scaleFactor: 1,
            },
        },
    },
    guidance_scale: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Guidance Scale',
                nodePath: '{nodeId}.inputs.guidance_scale',
                minValue: 0.1,
                maxValue: 100,
                step: 0.1,
                defValue: 7.5,
                precision: 1,
                scaleFactor: 1,
            },
        },
    },
    img_guidance_scale: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Image Guidance Scale',
                nodePath: '{nodeId}.inputs.img_guidance_scale',
                minValue: 0.1,
                maxValue: 100,
                step: 0.1,
                defValue: 1,
                precision: 1,
                scaleFactor: 1,
            },
        },
    },
    height: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Height',
                nodePath: '{nodeId}.inputs.height',
                minValue: 1,
                maxValue: 2048,
                step: 32,
                defValue: 512,
                precision: 0,
                scaleFactor: 1,
            },
        },
    },
    width: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Width',
                nodePath: '{nodeId}.inputs.width',
                minValue: 1,
                maxValue: 2048,
                step: 32,
                defValue: 512,
                precision: 0,
                scaleFactor: 1,
            },
        },
    },
    dimensionSelector: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dimensionSelector',
            params: {
                label: 'Dimension Selector',
                nodePath: '{nodeId}.inputs.width',    
                defaultWidth: 1024,              
                defaultHeight: 768,              
            }
        }
    },
    KSampler: {
        type: 'components',
        nodeClass: 'KSampler', 
        components: [
            {
                type: 'dropdown',
                params: {
                    label: 'Sampler',
                    nodePath: '{nodeId}.inputs.sampler_name',
                    key: 'sampler_name',
                    url: 'KSampler',
                },
            },
            {
                type: 'dropdown',
                params: {
                    label: 'Scheduler',
                    nodePath: '{nodeId}.inputs.scheduler',
                    key: 'scheduler',
                    url: 'KSampler',
                },
            },               
            {
                type: 'stepper',
                params: {
                    label: 'CFG',
                    nodePath: '{nodeId}.inputs.cfg',
                    minValue: 0.1,
                    maxValue: 100,
                    step: 0.1,
                    defValue: 7.5,
                    precision: 1,
                    scaleFactor: 1,
                },
            },                          
            {
                type: 'stepper',
                params: {
                    label: 'Steps',
                    nodePath: '{nodeId}.inputs.steps',
                    minValue: 1,
                    maxValue: 100,
                    step: 1,
                    defValue: 20,
                    precision: 0,
                    scaleFactor: 1,
                },
            },
            {
                type: 'seeder',
                params: {
                    label: 'Seed',
                    nodePath: '{nodeId}.inputs.seed',
                    minValue: 0,
                    maxValue: Number.MAX_SAFE_INTEGER,
                    step: 1,
                    defValue: 0,
                    precision: 0,
                    scaleFactor: 1,
                },
            },  

        ],
    },
    KSampler_Denoise: {
        type: 'components',
        nodeClass: 'KSampler', 
        components: [
            {
                type: 'dropdown',
                params: {
                    label: 'Sampler',
                    nodePath: '{nodeId}.inputs.sampler_name',
                    key: 'sampler_name',
                    url: 'KSampler',
                },
            },
            {
                type: 'dropdown',
                params: {
                    label: 'Scheduler',
                    nodePath: '{nodeId}.inputs.scheduler',
                    key: 'scheduler',
                    url: 'KSampler',
                },
            },               
            {
                type: 'stepper',
                params: {
                    label: 'CFG',
                    nodePath: '{nodeId}.inputs.cfg',
                    minValue: 0.1,
                    maxValue: 100,
                    step: 0.1,
                    defValue: 7.5,
                    precision: 1,
                    scaleFactor: 1,
                },
            },                          
            {
                type: 'stepper',
                params: {
                    label: 'Steps',
                    nodePath: '{nodeId}.inputs.steps',
                    minValue: 1,
                    maxValue: 100,
                    step: 1,
                    defValue: 20,
                    precision: 0,
                    scaleFactor: 1,
                },
            },
            {
                type: 'stepper',
                params: {
                    label: 'Denoise',
                    nodePath: '{nodeId}.inputs.denoise',
                    minValue: 0,
                    maxValue: 1,
                    step: 0.01,
                    defValue: 1,
                    precision: 2,
                    scaleFactor: 1,
                },
            }, 
            {
                type: 'seeder',
                params: {
                    label: 'Seed',
                    nodePath: '{nodeId}.inputs.seed',
                    minValue: 0,
                    maxValue: Number.MAX_SAFE_INTEGER,
                    step: 1,
                    defValue: 0,
                    precision: 0,
                    scaleFactor: 1,
                },
            },  

        ],
    },  
    LoraLoaderModelOnly: {
        type: 'multiComponent',
        nodeClass: 'LoraLoaderModelOnly',
        label: 'LoRA',
        components: [
            {
                type: 'dropdown',
                params: {
                    label: '',
                    nodePath: '{nodeId}.inputs.lora_name',
                    key: 'lora_name',
                    url: 'LoraLoaderModelOnly',
                },
            },
            {
                type: 'stepper',
                params: {
                    label: 'Strength',
                    nodePath: '{nodeId}.inputs.strength_model',
                    minValue: 0.1,
                    maxValue: 5,
                    step: 0.1,
                    defValue: 1,
                    precision: 2,
                    scaleFactor: 1,
                },
            },
        ],
    },
    ModelSamplingFlux: {
        type: 'multiComponent',
        nodeClass: 'ModelSamplingFlux',
        label: 'ModelSamplingFlux',
        components: [
            {
                type: 'stepper',
                params: {
                    label: 'Max Shift',
                    nodePath: '{nodeId}.inputs.max_shift',
                    minValue: 0.1,
                    maxValue: 100,
                    step: 0.1,
                    defValue: 1.15,
                    precision: 2,
                    scaleFactor: 1,
                },
            },
            {
                type: 'stepper',
                params: {
                    label: 'Base Shift',
                    nodePath: '{nodeId}.inputs.base_shift',
                    minValue: 0.1,
                    maxValue: 100,
                    step: 0.1,
                    defValue: 0.5,
                    precision: 2,
                    scaleFactor: 1,
                },
            },
            {
                type: 'stepper',
                params: {
                    label: 'Width',
                    nodePath: '{nodeId}.inputs.width',
                    minValue: 1,
                    maxValue: 2048,
                    step: 32,
                    defValue: 1024,
                    precision: 0,
                    scaleFactor: 1,
                },
            },
            {
                type: 'stepper',
                params: {
                    label: 'Height',
                    nodePath: '{nodeId}.inputs.height',
                    minValue: 1,
                    maxValue: 2048,
                    step: 32,
                    defValue: 1024,
                    precision: 0,
                    scaleFactor: 1,
                },
            },
        ],
    },
    DualCLIPLoader: {
        type: 'components',
        nodeClass: 'DualCLIPLoader',
        components: [
            {
                type: 'dropdown',
                params: {
                    label: 'CLIP 1',
                    nodePath: '{nodeId}.inputs.clip_name1',
                    key: 'clip_name1',
                    url: 'DualCLIPLoader',
                },
            },
            {
                type: 'dropdown',
                params: {
                    label: 'CLIP 2',
                    nodePath: '{nodeId}.inputs.clip_name2',
                    key: 'clip_name2',
                    url: 'DualCLIPLoader',
                },
            },
            {
                type: 'dropdown',
                params: {
                    label: 'Type',
                    nodePath: '{nodeId}.inputs.type',
                    key: 'type',
                    url: 'DualCLIPLoader',
                },
            },
        ],
    },
    DualCLIPLoader_multiComponent: {
        type: 'multiComponent',
        nodeClass: 'DualCLIPLoader',
        label: 'Dual CLIP Loader',
        components: [
            {
                type: 'dropdown',
                params: {
                    label: 'CLIP 1',
                    nodePath: '{nodeId}.inputs.clip_name1',
                    key: 'clip_name1',
                    url: 'DualCLIPLoader',
                },
            },
            {
                type: 'dropdown',
                params: {
                    label: 'CLIP 2',
                    nodePath: '{nodeId}.inputs.clip_name2',
                    key: 'clip_name2',
                    url: 'DualCLIPLoader',
                },
            },
            {
                type: 'dropdown',
                params: {
                    label: 'Type',
                    nodePath: '{nodeId}.inputs.type',
                    key: 'type',
                    url: 'DualCLIPLoader',
                },
            },
        ],
    },
    CLIP1: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dropdown',
            params: {
                label: 'CLIP 1',
                nodePath: '{nodeId}.inputs.clip_name1',
                key: 'clip_name1',
                url: 'DualCLIPLoader'
            }
        }
    },
    CLIP2: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dropdown',
            params: {
                label: 'CLIP 2',
                nodePath: '{nodeId}.inputs.clip_name2',
                key: 'clip_name2',
                url: 'DualCLIPLoader'
            }
        }
    },
    CLIP3: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dropdown',
            params: {
                label: 'CLIP 3',
                nodePath: '{nodeId}.inputs.clip_name3',
                key: 'clip_name3',
                url: 'DualCLIPLoader'
            }
        }
    },
    Type: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dropdown',
            params: {
                label: 'Type',
                nodePath: '{nodeId}.inputs.type',
                key: 'type',
                url: 'DualCLIPLoader'
            }
        }
    },
    TripleCLIPLoader: {
        type: 'multiComponent',
        nodeClass: 'TripleCLIPLoader',
        label: 'Triple CLIP Loader',
        components: [
            {
                type: 'dropdown',
                params: {
                    label: 'CLIP 1',
                    nodePath: '{nodeId}.inputs.clip_name1',
                    key: 'clip_name1',
                    url: 'TripleCLIPLoader',
                },
            },
            {
                type: 'dropdown',
                params: {
                    label: 'CLIP 2',
                    nodePath: '{nodeId}.inputs.clip_name2',
                    key: 'clip_name2',
                    url: 'TripleCLIPLoader',
                },
            },
            {
                type: 'dropdown',
                params: {
                    label: 'CLIP 3',
                    nodePath: '{nodeId}.inputs.clip_name3',
                    key: 'clip_name3',
                    url: 'TripleCLIPLoader',
                },
            },
        ],
    },
    VHS_LoadVideo: {
        type: 'components',
        nodeClass: 'VHS_LoadVideo',
        components: [
            {
                type: 'stepper',
                params: {
                    label: 'Frame Load Cap',
                    nodePath: '{nodeId}.inputs.frame_load_cap',
                    minValue: 1,
                    maxValue: 10000,
                    step: 1,
                    defValue: 16,
                    precision: 0,
                    scaleFactor: 1,
                },
            },
            {
                type: 'stepper',
                params: {
                    label: 'Skip First Frames',
                    nodePath: '{nodeId}.inputs.skip_first_frames',
                    minValue: 0,
                    maxValue: 1000,
                    step: 1,
                    defValue: 0,
                    precision: 0,
                    scaleFactor: 1,
                },
            },
            {
                type: 'stepper',
                params: {
                    label: 'Select Every Nth',
                    nodePath: '{nodeId}.inputs.select_every_nth',
                    minValue: 1,
                    maxValue: 100,
                    step: 1,
                    defValue: 1,
                    precision: 0,
                    scaleFactor: 1,
                },
            },
        ],
    },
    CheckpointLoaderSimple: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dropdown',
            params: {
                label: 'Model',
                nodePath: '{nodeId}.inputs.ckpt_name',
                key: 'ckpt_name',
                url: 'CheckpointLoaderSimple'
            }
        }
    },
    UNETLoader: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dropdown',
            params: {
                label: 'Model',
                nodePath: '{nodeId}.inputs.unet_name',
                key: 'unet_name',
                url: 'UNETLoader'
            }
        }
    },
    KSamplerSelect: {
        type: 'component',
        nodeClass: 'KSamplerSelect',
        component: {
            type: 'dropdown',
            params: {
                label: 'Sampler Name',
                nodePath: '{nodeId}.inputs.sampler_name',
                key: 'sampler_name',
                url: 'KSamplerSelect',
            },
        },
    },
    VAELoader: {
        type: 'component',
        nodeClass: 'VAELoader',
        component: {
            type: 'dropdown',
            params: {
                label: 'VAE',
                nodePath: '{nodeId}.inputs.vae_name',
                key: 'vae_name',
                url: 'VAELoader',
            },
        },
    },
    CLIPLoader: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'dropdown',
            params: {
                label: 'CLIP',
                nodePath: '{nodeId}.inputs.clip_name',
                key: 'clip_name',
                url: 'CLIPLoader'
            }
        }
    },
    Frame_Rate: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Frame Rate',
                nodePath: '{nodeId}.inputs.frame_rate',
                minValue: 1,
                maxValue: 120,
                step: 1,
                defValue: 24,
                precision: 0,
                scaleFactor: 1,
            }
        }
    },
    Length: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Length',
                nodePath: '{nodeId}.inputs.length',
                minValue: 1,
                maxValue: 10000,
                step: 6,
                defValue: 13,
                precision: 0,
                scaleFactor: 1,
            }
        }
    },
    Batch_Size: {
        type: 'component',
        nodeClass: null,
        component: {
            type: 'stepper',
            params: {
                label: 'Batch Size',
                nodePath: '{nodeId}.inputs.batch_size',
                minValue: 1,
                maxValue: 100,
                step: 1,
                defValue: 1,
                precision: 0,
                scaleFactor: 1,
            }
        }
    },
    DownloadAndLoadMochiModel: {
        type: 'multiComponent',
        nodeClass: 'DownloadAndLoadMochiModel',
        components: [
            {
                type: 'dropdown',
                params: {
                    label: 'Model',
                    nodePath: '{nodeId}.inputs.model',
                    key: 'model',
                    url: 'DownloadAndLoadMochiModel',
                },
            },
            {
                type: 'dropdown',
                params: {
                    label: 'VAE',
                    nodePath: '{nodeId}.inputs.vae',
                    key: 'vae',
                    url: 'DownloadAndLoadMochiModel',
                },
            },
        ],
    },
};
export { componentTemplates };
