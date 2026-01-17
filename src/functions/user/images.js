/**
 * 用户图片管理相关API
 */
import { errorHandling, telemetryData } from '../utils/middleware';

// 获取用户图片列表
export async function getUserImages(c) {
  try {
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;

    // 获取分页参数
    const url = new URL(c.req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 获取用户的文件列表
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

    // 按上传时间倒序排序
    userFiles.sort((a, b) => b.uploadTime - a.uploadTime);

    // 分页
    const totalFiles = userFiles.length;
    const paginatedFiles = userFiles.slice(offset, offset + limit);

    return c.json({
      files: paginatedFiles,
      pagination: {
        total: totalFiles,
        page,
        limit,
        totalPages: Math.ceil(totalFiles / limit)
      }
    });
  } catch (error) {
    return c.json({ error: '获取用户图片失败' }, 500);
  }
}

// 删除用户图片
export async function deleteUserImage(c) {
  try {
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;
    const fileId = c.req.param('id');

    if (!fileId) {
      return c.json({ error: '文件ID不能为空' }, 400);
    }

    // 获取文件元数据
    const fileMetadata = await c.env.img_url.getWithMetadata(fileId);

    // 检查文件是否存在
    if (!fileMetadata || !fileMetadata.metadata) {
      return c.json({ error: '文件不存在' }, 404);
    }

    // 检查文件所有权
    if (fileMetadata.metadata.userId !== userId) {
      return c.json({ error: '无权删除此文件' }, 403);
    }

    // 获取用户的文件列表
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

    // 从列表中移除文件
    userFiles = userFiles.filter(file => file.id !== fileId);

    // 更新用户文件列表
    await c.env.img_url.put(userFilesKey, JSON.stringify(userFiles));

    // 删除文件元数据
    await c.env.img_url.delete(fileId);

    return c.json({ message: '文件删除成功' });
  } catch (error) {
    return c.json({ error: '删除用户图片失败' }, 500);
  }
}

// 更新图片信息
export async function updateImageInfo(c) {
  try {
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;
    const fileId = c.req.param('id');
    const { fileName, tags } = await c.req.json();

    if (!fileId) {
      return c.json({ error: '文件ID不能为空' }, 400);
    }

    // 获取文件元数据
    const fileData = await c.env.img_url.getWithMetadata(fileId);

    // 检查文件是否存在
    if (!fileData || !fileData.metadata) {
      return c.json({ error: '文件不存在' }, 404);
    }

    // 检查文件所有权
    if (fileData.metadata.userId !== userId) {
      return c.json({ error: '无权修改此文件' }, 403);
    }

    // 更新元数据
    const updatedMetadata = {
      ...fileData.metadata,
      fileName: fileName || fileData.metadata.fileName,
      tags: tags || fileData.metadata.tags,
      updatedAt: Date.now()
    };

    // 保存更新后的元数据
    await c.env.img_url.put(fileId, "", { metadata: updatedMetadata });

    // 更新用户文件列表中的文件信息
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

    userFiles = userFiles.map(file => {
      if (file.id === fileId) {
        return {
          ...file,
          fileName: fileName || file.fileName,
          tags: tags || file.tags
        };
      }
      return file;
    });

    // 保存更新后的文件列表
    await c.env.img_url.put(userFilesKey, JSON.stringify(userFiles));

    return c.json({
      message: '文件信息更新成功',
      file: {
        id: fileId,
        ...updatedMetadata
      }
    });
  } catch (error) {
    return c.json({ error: '更新图片信息失败' }, 500);
  }
}

// 搜索用户图片
export async function searchUserImages(c) {
  try {
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;

    // 获取搜索参数
    const url = new URL(c.req.url);
    const query = url.searchParams.get('q') || '';
    const tag = url.searchParams.get('tag') || '';

    // 获取用户的文件列表
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

    // 根据查询条件过滤
    if (query) {
      userFiles = userFiles.filter(file =>
        file.fileName.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (tag) {
      userFiles = userFiles.filter(file =>
        file.tags && file.tags.includes(tag)
      );
    }

    // 按上传时间倒序排序
    userFiles.sort((a, b) => b.uploadTime - a.uploadTime);

    return c.json({ files: userFiles });
  } catch (error) {
    return c.json({ error: '搜索用户图片失败' }, 500);
  }
}
