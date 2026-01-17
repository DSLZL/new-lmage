import { createLoFiPreviewPage } from './preview-template.js';

export async function fileHandler(c) {
    const env = c.env;
    const id = c.req.param('id');
    const url = new URL(c.req.url);

    // 检查是否为下载请求
    const isDownload = url.searchParams.get('download') === 'true';

    // 检查是否为原图请求（直接嵌入）
    const isRaw = url.searchParams.get('raw') === 'true';

    // 检查是否为浏览器直接访问（而非嵌入、API调用等）
    const userAgent = c.req.header('User-Agent') || '';
    const accept = c.req.header('Accept') || '';
    const referer = c.req.header('Referer') || '';

    // 判断是否为浏览器直接访问：
    // 1. Accept头包含text/html（浏览器地址栏访问）
    // 2. 不是下载请求和原图请求
    // 3. 没有 referer 或 referer 是同域名（排除 <img> 标签嵌入）
    const currentHost = new URL(c.req.url).host;
    const refererHost = referer ? new URL(referer).host : '';
    const isBrowserDirectAccess = !isDownload && !isRaw &&
                                  accept.includes('text/html') &&
                                  (!referer || refererHost !== currentHost);

    try {
        let fileUrl = null;

        // 尝试处理通过Telegram Bot API上传的文件
        if (id.length > 30 || id.includes('.')) { // 长ID通常代表通过Bot上传的文件，或包含扩展名的文件
            const fileId = id.split('.')[0]; // 分离文件ID和扩展名
            const filePath = await getFilePath(env, fileId);

            if (filePath) {
                fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
            }
        } else {
            // 处理Telegraph链接
            fileUrl = `https://telegra.ph/file/${id}`;
        }

        // 如果找到文件URL
        if (fileUrl) {
            // 如果是下载请求，返回下载
            if (isDownload) {
                const response = await proxyFile(c, fileUrl);
                const headers = new Headers(response.headers);
                headers.set('Content-Disposition', 'attachment');
                return new Response(response.body, {
                    status: response.status,
                    headers
                });
            }

            // 如果是原图请求（图片嵌入），返回原图
            if (isRaw) {
                return await proxyFile(c, fileUrl);
            }

            // 其他所有情况，都返回预览页面
            const currentUrl = new URL(c.req.url);
            const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
            const downloadUrl = `${baseUrl}/file/${id}?download=true`;
            const rawUrl = `${baseUrl}/file/${id}?raw=true`;
            const html = createLoFiPreviewPage(baseUrl, id, rawUrl, downloadUrl);
            return c.html(html);
        }

        // 处理KV元数据
        if (env.img_url) {
            let record = await env.img_url.getWithMetadata(id);

            if (!record || !record.metadata) {
                // 初始化元数据（如不存在）
                record = {
                    metadata: {
                        ListType: "None",
                        Label: "None",
                        TimeStamp: Date.now(),
                        liked: false,
                        fileName: id,
                        fileSize: 0,
                    }
                };
                await env.img_url.put(id, "", { metadata: record.metadata });
            }

            const metadata = {
                ListType: record.metadata.ListType || "None",
                Label: record.metadata.Label || "None",
                TimeStamp: record.metadata.TimeStamp || Date.now(),
                liked: record.metadata.liked !== undefined ? record.metadata.liked : false,
                fileName: record.metadata.fileName || id,
                fileSize: record.metadata.fileSize || 0,
            };

            // 根据ListType和Label处理
            if (metadata.ListType === "Block" || metadata.Label === "adult") {
                if (referer) {
                    return c.redirect('/images/blocked.png');
                } else {
                    return c.redirect('/block-img.html');
                }
            }

            // 保存元数据
            await env.img_url.put(id, "", { metadata });
        }

        // 如果所有尝试都失败，返回404
        return c.text('文件不存在', 404);
    } catch (error) {
        return c.text('服务器错误', 500);
    }
}

/**
 * 获取Telegram文件路径
 */
async function getFilePath(env, fileId) {
    try {
        const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
        const res = await fetch(url, {
            method: 'GET',
        });

        if (!res.ok) {
            return null;
        }

        const responseData = await res.json();
        const { ok, result } = responseData;

        if (ok && result) {
            return result.file_path;
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

/**
 * 代理文件请求
 * 直接传递原始文件内容，不进行压缩，确保原图质量
 */
async function proxyFile(c, fileUrl) {
    const response = await fetch(fileUrl, {
        method: c.req.method,
        headers: c.req.headers
    });

    if (!response.ok) {
        return c.text('文件获取失败', response.status);
    }

    const headers = new Headers();
    response.headers.forEach((value, key) => {
        headers.set(key, value);
    });

    // 添加缓存控制
    headers.set('Cache-Control', 'public, max-age=31536000');

    // 确保设置正确的Content-Type，以便浏览器能够预览图片
    const contentType = response.headers.get('Content-Type');
    // 从请求ID中获取原始文件扩展名
    const requestId = c.req.param('id');
    const originalExtension = requestId.includes('.') ? requestId.split('.').pop().toLowerCase() : '';

    if (contentType) {
        // 特殊处理：如果原始文件是GIF但Telegram返回的是MP4，保持为video类型但添加特殊标记
        if (originalExtension === 'gif' && contentType.startsWith('video/')) {
            headers.set('Content-Type', contentType);
            headers.set('X-Original-Format', 'gif');
        } else {
            headers.set('Content-Type', contentType);
        }
    } else {
        // 根据URL推断内容类型
        const fileExtension = fileUrl.split('.').pop().toLowerCase();

        if (['jpg', 'jpeg'].includes(fileExtension)) {
            headers.set('Content-Type', 'image/jpeg');
        } else if (fileExtension === 'png') {
            headers.set('Content-Type', 'image/png');
        } else if (fileExtension === 'gif' || originalExtension === 'gif') {
            // 如果原始是GIF文件，但实际可能是MP4
            if (fileExtension === 'mp4' || contentType === 'video/mp4') {
                headers.set('Content-Type', 'video/mp4');
                headers.set('X-Original-Format', 'gif');
            } else {
                headers.set('Content-Type', 'image/gif');
            }
        } else if (fileExtension === 'webp') {
            headers.set('Content-Type', 'image/webp');
        } else if (fileExtension === 'svg') {
            headers.set('Content-Type', 'image/svg+xml');
        } else if (fileExtension === 'mp4') {
            headers.set('Content-Type', 'video/mp4');
        } else {
            // 默认设置为二进制流
            headers.set('Content-Type', 'application/octet-stream');
        }
    }

    // 移除Content-Disposition头或设置为inline，确保浏览器预览而不是下载
    headers.set('Content-Disposition', 'inline');

    return new Response(response.body, {
        status: response.status,
        headers
    });
}
