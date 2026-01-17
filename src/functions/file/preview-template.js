/**
 * Lo-Fi Doodle Diary 风格的图片预览页面模板
 */
export function createLoFiPreviewPage(baseUrl, id, rawUrl, downloadUrl) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>涂鸦预览 - Doodle Diary</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Comic Sans MS', 'Chalkboard SE', 'Bradley Hand', 'Marker Felt', 'Segoe Print', cursive, sans-serif;
            background: repeating-linear-gradient(
                0deg,
                #f5f5f5 0px,
                #f5f5f5 24px,
                #e0e0e0 24px,
                #e0e0e0 25px
            ),
            repeating-linear-gradient(
                90deg,
                #f5f5f5 0px,
                #f5f5f5 24px,
                #e0e0e0 24px,
                #e0e0e0 25px
            );
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #374151;
        }

        .paper-container {
            background: white;
            max-width: 90vw;
            max-height: 90vh;
            padding: 40px;
            box-shadow: 2px 3px 0px 0px rgba(55, 65, 81, 0.2);
            position: relative;
            transform: rotate(0.8deg);
            border: 1px solid #e5e7eb;
        }

        /* Tape decoration */
        .tape {
            position: absolute;
            width: 80px;
            height: 30px;
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(2px);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .tape-top {
            top: -15px;
            left: 50%;
            transform: translateX(-50%) rotate(-2deg);
        }

        .tape-bottom {
            bottom: -15px;
            right: 20%;
            transform: rotate(2deg);
        }

        .preview-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }

        .image-frame {
            border: 2px dashed #9ca3af;
            padding: 10px;
            background: #fafafa;
            max-width: 100%;
            max-height: 70vh;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(-0.5deg);
        }

        .preview-image {
            max-width: 100%;
            max-height: 65vh;
            object-fit: contain;
            display: block;
        }

        .controls {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 20px;
        }

        .btn {
            font-family: 'Patrick Hand', cursive;
            font-size: 18px;
            padding: 8px 16px;
            border: 2px dashed #374151;
            background: white;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s;
            transform: rotate(-1deg);
        }

        .btn:hover {
            background: #fef08a;
            transform: rotate(0deg) scale(1.05);
        }

        .btn:active {
            transform: rotate(1deg) scale(0.98);
        }

        .btn-primary {
            background: #fef08a;
            border-color: #374151;
            transform: rotate(1deg);
        }

        .loading {
            text-align: center;
            font-size: 24px;
            color: #6b7280;
        }

        .loading-spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 3px dashed #374151;
            border-radius: 50%;
            animation: spin 2s linear infinite;
            margin-bottom: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .info-box {
            background: #fffbeb;
            border: 2px dashed #fbbf24;
            padding: 16px;
            margin-top: 20px;
            transform: rotate(-0.8deg);
            font-size: 16px;
            line-height: 1.6;
        }

        .info-box.hidden {
            display: none;
        }

        .info-item {
            margin: 4px 0;
        }

        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: #10b981;
            color: white;
            padding: 12px 24px;
            font-size: 18px;
            box-shadow: 2px 3px 0px 0px rgba(55, 65, 81, 0.3);
            opacity: 0;
            transition: all 0.3s;
            z-index: 1000;
        }

        .toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        .brand {
            position: fixed;
            top: 20px;
            right: 20px;
            font-size: 20px;
            color: #9ca3af;
            transform: rotate(-2deg);
        }

        @media (max-width: 768px) {
            .paper-container {
                padding: 20px;
            }

            .btn {
                font-size: 16px;
                padding: 6px 12px;
            }

            .info-box {
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="brand">Doodle Diary</div>

    <div class="paper-container">
        <div class="tape tape-top"></div>
        <div class="tape tape-bottom"></div>

        <div class="preview-wrapper">
            <div id="loading" class="loading">
                <div class="loading-spinner"></div>
                <div>正在翻页...</div>
            </div>

            <div id="imageContainer" class="image-frame" style="display: none;">
                <img id="previewImage" class="preview-image" alt="涂鸦预览" />
            </div>

            <div class="controls" id="controls" style="display: none;">
                <button class="btn" onclick="toggleInfo()">📋 信息</button>
                <button class="btn" onclick="copyLink()">🔗 复制</button>
                <button class="btn btn-primary" onclick="downloadImage()">⬇️ 下载</button>
            </div>

            <div id="infoBox" class="info-box hidden">
                <div class="info-item">📁 文件: <strong id="fileName">${id}</strong></div>
                <div class="info-item">📐 尺寸: <strong id="dimensions">-</strong></div>
                <div class="info-item">🎨 类型: <strong id="fileType">-</strong></div>
            </div>
        </div>
    </div>

    <div id="toast" class="toast"></div>

    <script>
        const imageUrl = '${rawUrl}';
        const downloadUrl = '${downloadUrl}';
        const shareUrl = '${baseUrl}/file/${id}';

        const loading = document.getElementById('loading');
        const imageContainer = document.getElementById('imageContainer');
        const previewImage = document.getElementById('previewImage');
        const controls = document.getElementById('controls');
        const infoBox = document.getElementById('infoBox');
        const toast = document.getElementById('toast');

        // 加载图片
        previewImage.onload = function() {
            loading.style.display = 'none';
            imageContainer.style.display = 'flex';
            controls.style.display = 'flex';
            updateImageInfo();
        };

        previewImage.onerror = function() {
            loading.innerHTML = '<div style="color: #ef4444;">❌ 图片加载失败</div>';
        };

        previewImage.src = imageUrl;

        // 更新图片信息
        function updateImageInfo() {
            document.getElementById('dimensions').textContent =
                previewImage.naturalWidth + ' × ' + previewImage.naturalHeight + ' px';

            const ext = '${id}'.split('.').pop().toLowerCase();
            const typeMap = {
                'jpg': 'JPEG', 'jpeg': 'JPEG', 'png': 'PNG',
                'gif': 'GIF', 'webp': 'WebP', 'svg': 'SVG'
            };
            document.getElementById('fileType').textContent = typeMap[ext] || '图片';
        }

        // 切换信息显示
        function toggleInfo() {
            infoBox.classList.toggle('hidden');
        }

        // 复制链接
        function copyLink() {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('✅ 链接已复制！');
            }).catch(() => {
                showToast('❌ 复制失败');
            });
        }

        // 下载图片
        function downloadImage() {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = '${id}';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('⬇️ 开始下载...');
        }

        // 显示提示
        function showToast(message) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2000);
        }

        // 键盘快捷键
        document.addEventListener('keydown', function(e) {
            if (e.key === 'i' || e.key === 'I') toggleInfo();
            if (e.key === 'c' || e.key === 'C') copyLink();
            if (e.key === 'd' || e.key === 'D') downloadImage();
        });
    </script>
</body>
</html>`;
}
