document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('imageInput');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');
    const originalInfo = document.getElementById('originalInfo');
    const compressedInfo = document.getElementById('compressedInfo');
    const downloadBtn = document.getElementById('downloadBtn');
    const formatSelect = document.getElementById('format');
    const originalFilename = document.getElementById('originalFilename');
    const compressedFilename = document.getElementById('compressedFilename');

    let originalImage = null;
    let isDragging = false;

    // 添加拖拽上传功能
    const fileUploadContainer = document.querySelector('.file-upload-container');

    fileUploadContainer.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileUploadContainer.style.borderColor = '#4CAF50';
        fileUploadContainer.style.backgroundColor = '#f8fff8';
    });

    fileUploadContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileUploadContainer.style.borderColor = '#ccc';
        fileUploadContainer.style.backgroundColor = 'white';
    });

    fileUploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    fileUploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileUploadContainer.style.borderColor = '#ccc';
        fileUploadContainer.style.backgroundColor = 'white';
        
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            imageInput.files = files;
            // 触发 change 事件
            const event = new Event('change');
            imageInput.dispatchEvent(event);
        }
    });

    // 监听质量滑块变化
    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = this.value + '%';
        if (originalImage) {
            compressImage(originalImage);
        }
    });

    // 监听文件选择
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 显示原图信息
        originalInfo.textContent = `Size: ${(file.size / 1024).toFixed(2)} KB`;
        originalFilename.textContent = `Name: ${file.name}`;
        
        // 创建文件阅读器
        const reader = new FileReader();
        reader.onload = function(e) {
            originalImage = new Image();
            originalImage.src = e.target.result;
            originalPreview.src = e.target.result;

            originalImage.onload = function() {
                compressImage(originalImage);
            };
        };
        reader.readAsDataURL(file);
    });

    // 压缩图片
    function compressImage(image) {
        const quality = qualitySlider.value / 100;
        const selectedFormat = formatSelect.value;
        const originalFormat = imageInput.files[0].type;
        const originalSize = imageInput.files[0].size;
        
        // 优化压缩策略
        function getOptimizedQuality(quality, originalSize) {
            // 如果原图小于 200KB，使用较高质量
            if (originalSize < 200 * 1024) {
                return Math.min(0.92, quality);
            }
            // 如果原图大于 1MB，使用更激进的压缩
            if (originalSize > 1024 * 1024) {
                return Math.min(0.85, quality);
            }
            // 其他情况使用默认策略
            return Math.min(0.88, quality);
        }

        // 获取优化后的压缩质量
        const optimizedQuality = getOptimizedQuality(quality, originalSize);
        
        // 如果质量设置为100%，且格式相同，直接使用原图
        if (quality === 1 && selectedFormat === originalFormat) {
            compressedPreview.src = originalPreview.src;
            compressedInfo.textContent = originalInfo.textContent;
            compressedFilename.textContent = originalFilename.textContent;
            
            // 显示下载按钮
            downloadBtn.style.display = 'block';
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.download = imageInput.files[0].name;
                link.href = originalPreview.src;
                link.click();
            };
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 计算新的尺寸
        let width = image.width;
        let height = image.height;
        // 根据原图大小动态调整最大尺寸
        let maxSize = 1920;
        if (originalSize > 2 * 1024 * 1024) { // 如果大于2MB
            maxSize = 1600;
        }
        
        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
            } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
            }
        }

        // 设置画布尺寸
        canvas.width = width;
        canvas.height = height;

        // 使用双线性插值
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 绘制图片
        ctx.drawImage(image, 0, 0, width, height);

        // 将 Canvas 转换为 Blob
        canvas.toBlob((blob) => {
            // 如果压缩后的大小大于原图，使用原图
            if (blob.size > originalSize && selectedFormat === originalFormat) {
                compressedPreview.src = originalPreview.src;
                compressedInfo.textContent = originalInfo.textContent;
                compressedFilename.textContent = originalFilename.textContent;
                
                downloadBtn.style.display = 'block';
                downloadBtn.onclick = () => {
                    const link = document.createElement('a');
                    link.download = imageInput.files[0].name;
                    link.href = originalPreview.src;
                    link.click();
                };
                return;
            }

            // 创建 URL
            const compressedUrl = URL.createObjectURL(blob);
            
            // 显示压缩后的图片
            compressedPreview.src = compressedUrl;
            
            // 计算压缩后的大小
            compressedInfo.textContent = `Size: ${(blob.size / 1024).toFixed(2)} KB`;
            
            // 显示压缩后的文件名
            const extension = selectedFormat.split('/')[1];
            const originalName = imageInput.files[0].name.replace(/\.[^/.]+$/, "");
            const compressionRatio = Math.round((1 - blob.size / originalSize) * 100);
            const newFilename = `${originalName}_compressed_${compressionRatio}pct.${extension}`;
            compressedFilename.textContent = `Name: ${newFilename}`;
            
            // 显示下载按钮
            downloadBtn.style.display = 'block';
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.download = newFilename;
                link.href = compressedUrl;
                link.click();
                
                setTimeout(() => {
                    URL.revokeObjectURL(compressedUrl);
                }, 100);
            };
        }, selectedFormat, optimizedQuality);
    }

    // 监听格式选择变化
    formatSelect.addEventListener('change', function() {
        if (originalImage) {
            compressImage(originalImage);
        }
    });
}); 