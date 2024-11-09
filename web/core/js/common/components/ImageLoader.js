import { showSpinner, hideSpinner } from './utils.js';

export default class ImageLoader {
  static DEFAULT_CONFIG = {
    allowedFileType: 'video',
    defaultImageSrc: '/core/media/ui/drop_image_rect_no_border_trans.png',
    showIndicator: false,
  };

  constructor(containerId, config = {}, onImageLoaded = null) {
    this.containerId = containerId;
    this.config = { ...ImageLoader.DEFAULT_CONFIG, ...config };
    this.onImageLoaded = onImageLoaded;
    this.imageDropArea = null;
    this.init();
  }

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container with ID ${this.containerId} not found.`);
      return;
    }

    if (this.imageDropArea) {
      this.destroy();
    }

    this.imageDropArea = document.createElement('div');
    this.imageDropArea.classList.add('image-loader');

    this.imgElement = document.createElement('img');
    this.imgElement.src = this.config.defaultImageSrc;
    this.setElementStyles(this.imgElement);

    this.imageDropArea.appendChild(this.imgElement);
    this.container.appendChild(this.imageDropArea);

    this.fileInputElement = document.createElement('input');
    this.fileInputElement.type = 'file';
    // this.fileInputElement.accept = `${this.config.allowedFileType}/*`;
    this.fileInputElement.style.display = 'none'; 

    this.container.appendChild(this.fileInputElement);

    this.setupEventListeners();
  }

  destroy() {
    if (this.imageDropArea) {
      this.removeEventListeners();
      this.imageDropArea.remove();
      this.imageDropArea = null;
      this.imgElement = null;
      if (this.fileInputElement) {
        this.fileInputElement.remove();
        this.fileInputElement = null;
      }
    }
  }

  setElementStyles(element) {
    Object.assign(element.style, {
      maxWidth: '100%',
      maxHeight: '100%',
      width: 'auto',
      height: 'auto',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      objectFit: 'contain',
    });
  }

  setupEventListeners() {
    this.handleDragEnter = (e) => this.onDragEnter(e);
    this.handleDragOver = (e) => this.onDragOver(e);
    this.handleDragLeave = (e) => this.onDragLeave(e);
    this.handleDrop = (e) => this.onDrop(e);

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      this.imageDropArea.addEventListener(eventName, this.preventDefaults, false);
    });

    this.imageDropArea.addEventListener('dragenter', this.handleDragEnter, false);
    this.imageDropArea.addEventListener('dragover', this.handleDragOver, false);
    this.imageDropArea.addEventListener('dragleave', this.handleDragLeave, false);
    this.imageDropArea.addEventListener('drop', this.handleDrop, false);

    this.handleDoubleClick = (e) => this.onDoubleClick(e);
    this.imageDropArea.addEventListener('dblclick', this.handleDoubleClick, false);

    this.handleFileInputChange = (e) => this.onFileInputChange(e);
    this.fileInputElement.addEventListener('change', this.handleFileInputChange, false);
  }

  removeEventListeners() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      this.imageDropArea.removeEventListener(eventName, this.preventDefaults, false);
    });

    this.imageDropArea.removeEventListener('dragenter', this.handleDragEnter, false);
    this.imageDropArea.removeEventListener('dragover', this.handleDragOver, false);
    this.imageDropArea.removeEventListener('dragleave', this.handleDragLeave, false);
    this.imageDropArea.removeEventListener('drop', this.handleDrop, false);

    this.imageDropArea.removeEventListener('dblclick', this.handleDoubleClick, false);

    if (this.fileInputElement) {
      this.fileInputElement.removeEventListener('change', this.handleFileInputChange, false);
    }
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  onDragEnter(e) {
    this.imageDropArea.classList.add('highlight');
  }

  onDragOver(e) {
    this.imageDropArea.classList.add('highlight');
  }

  onDragLeave(e) {
    this.imageDropArea.classList.remove('highlight');
  }

  onDrop(e) {
    this.imageDropArea.classList.remove('highlight');
    const file = e.dataTransfer.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  onDoubleClick(e) {
    this.fileInputElement.click();
  }

  onFileInputChange(e) {
    const file = e.target.files[0];
    if (file) {
      this.handleFile(file);
    }
    e.target.value = '';
  }

  async handleFile(file) {
    // if (!this.isFileTypeAllowed(file)) {
    //   this.showErrorMessage(`Unsupported file type. Please select a ${this.config.allowedFileType} file.`);
    //   return;
    // }

    showSpinner();

    try {
      const localSrc = URL.createObjectURL(file);
      this.displayMedia(file, localSrc);
      const result = await this.uploadFile(file);
      this.handleUploadSuccess(localSrc, result);
    } catch (error) {
      this.handleUploadError(error);
    } finally {
      hideSpinner();
    }
  }

  // isFileTypeAllowed(file) {
  //   return file.type.startsWith(`${this.config.allowedFileType}/`);
  // }

  showErrorMessage(message) {
    console.error(message);
    alert(message);
  }

  displayMedia(file, src) {
    if (file.type.startsWith('image/')) {
      this.displayImage(src);
    } else if (file.type.startsWith('video/')) {
      this.displayVideo(src);
    }
  }

  displayImage(src) {
    if (!(this.imgElement instanceof HTMLImageElement)) {
      const newImgElement = document.createElement('img');
      this.setElementStyles(newImgElement);
      this.imageDropArea.replaceChild(newImgElement, this.imgElement);
      this.imgElement = newImgElement;
    }
    this.imgElement.src = src;
    this.imgElement.alt = 'Loaded Image';
  }

  displayVideo(src) {
    if (!(this.imgElement instanceof HTMLVideoElement)) {
      const videoElement = document.createElement('video');
      videoElement.controls = true;
      videoElement.autoplay = true;
      this.setElementStyles(videoElement);
      this.imageDropArea.replaceChild(videoElement, this.imgElement);
      this.imgElement = videoElement;
    }
    this.imgElement.src = src;
  }

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/upload/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Upload failed');
    }

    return response.json();
  }

  handleUploadSuccess(localSrc, result) {
    if (typeof this.onImageLoaded === 'function') {
      this.onImageLoaded(localSrc, result);
    }
  }

  handleUploadError(error) {
    console.error('Error during upload', error);
    this.showErrorMessage(`Error during upload: ${error.message}`);
  }
}
