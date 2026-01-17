/**
 * 用户标签管理相关API
 */
import { errorHandling, telemetryData } from '../utils/middleware';

// 获取用户标签列表
export async function getUserTags(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;

    // 获取用户标签列表
    const userTagsKey = `user:${userId}:tags`;
    let userTags = await c.env.img_url.get(userTagsKey, { type: "json" }) || [];

    // 计算每个标签的图片数量
    const userFilesKey = `user:${userId}:files`;
    const userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

    // 为每个标签计算图片数量和获取示例图片
    userTags = userTags.map(tag => {
      const taggedImages = userFiles.filter(file =>
        file.tags && file.tags.includes(tag.name)
      );

      return {
        ...tag,
        imageCount: taggedImages.length,
        images: taggedImages.slice(0, 5).map(file => ({
          id: file.id,
          thumbnailUrl: `/file/${file.id}`,
          name: file.fileName || file.id
        }))
      };
    });

    // 按创建时间倒序排列
    userTags.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return c.json({
      tags: userTags,
      total: userTags.length
    });
  } catch (error) {
    return c.json({ error: '获取标签列表失败' }, 500);
  }
}

// 创建新标签
export async function createTag(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;
    const { name, description, color } = await c.req.json();

    // 验证输入
    if (!name || !name.trim()) {
      return c.json({ error: '标签名称不能为空' }, 400);
    }

    if (!color) {
      return c.json({ error: '请选择标签颜色' }, 400);
    }

    const tagName = name.trim();

    // 获取用户现有标签
    const userTagsKey = `user:${userId}:tags`;
    let userTags = await c.env.img_url.get(userTagsKey, { type: "json" }) || [];

    // 检查标签名称是否已存在
    const existingTag = userTags.find(tag =>
      tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (existingTag) {
      return c.json({ error: '标签名称已存在' }, 409);
    }

    // 创建新标签
    const newTag = {
      id: crypto.randomUUID(),
      name: tagName,
      description: description?.trim() || '',
      color: color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageCount: 0,
      images: []
    };

    // 添加到用户标签列表
    userTags.push(newTag);

    // 保存更新后的标签列表
    await c.env.img_url.put(userTagsKey, JSON.stringify(userTags));

    return c.json({
      message: '标签创建成功',
      tag: newTag
    });
  } catch (error) {
    return c.json({ error: '创建标签失败' }, 500);
  }
}

// 更新标签
export async function updateTag(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;
    const tagId = c.req.param('id');
    const { name, description, color } = await c.req.json();

    if (!tagId) {
      return c.json({ error: '标签ID不能为空' }, 400);
    }

    // 验证输入
    if (!name || !name.trim()) {
      return c.json({ error: '标签名称不能为空' }, 400);
    }

    if (!color) {
      return c.json({ error: '请选择标签颜色' }, 400);
    }

    const tagName = name.trim();

    // 获取用户标签列表
    const userTagsKey = `user:${userId}:tags`;
    let userTags = await c.env.img_url.get(userTagsKey, { type: "json" }) || [];

    // 查找要更新的标签
    const tagIndex = userTags.findIndex(tag => tag.id === tagId);
    if (tagIndex === -1) {
      return c.json({ error: '标签不存在' }, 404);
    }

    const oldTag = userTags[tagIndex];

    // 检查新名称是否与其他标签冲突
    const existingTag = userTags.find(tag =>
      tag.id !== tagId && tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (existingTag) {
      return c.json({ error: '标签名称已存在' }, 409);
    }

    // 更新标签信息
    const updatedTag = {
      ...oldTag,
      name: tagName,
      description: description?.trim() || '',
      color: color,
      updatedAt: new Date().toISOString()
    };

    userTags[tagIndex] = updatedTag;

    // 如果标签名称发生变化，需要更新所有使用该标签的图片
    if (oldTag.name !== tagName) {
      const userFilesKey = `user:${userId}:files`;
      let userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

      // 更新图片中的标签名称
      userFiles = userFiles.map(file => {
        if (file.tags && file.tags.includes(oldTag.name)) {
          const updatedTags = file.tags.map(tag =>
            tag === oldTag.name ? tagName : tag
          );
          return { ...file, tags: updatedTags };
        }
        return file;
      });

      // 保存更新后的文件列表
      await c.env.img_url.put(userFilesKey, JSON.stringify(userFiles));

      // 同时更新每个文件的元数据
      for (const file of userFiles) {
        if (file.tags && file.tags.includes(tagName)) {
          const fileData = await c.env.img_url.getWithMetadata(file.id);
          if (fileData && fileData.metadata) {
            const updatedMetadata = {
              ...fileData.metadata,
              tags: file.tags,
              updatedAt: Date.now()
            };
            await c.env.img_url.put(file.id, "", { metadata: updatedMetadata });
          }
        }
      }
    }

    // 保存更新后的标签列表
    await c.env.img_url.put(userTagsKey, JSON.stringify(userTags));

    return c.json({
      message: '标签更新成功',
      tag: updatedTag
    });
  } catch (error) {
    return c.json({ error: '更新标签失败' }, 500);
  }
}

// 删除标签
export async function deleteTag(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;
    const tagId = c.req.param('id');

    if (!tagId) {
      return c.json({ error: '标签ID不能为空' }, 400);
    }

    // 获取用户标签列表
    const userTagsKey = `user:${userId}:tags`;
    let userTags = await c.env.img_url.get(userTagsKey, { type: "json" }) || [];

    // 查找要删除的标签
    const tagIndex = userTags.findIndex(tag => tag.id === tagId);
    if (tagIndex === -1) {
      return c.json({ error: '标签不存在' }, 404);
    }

    const tagToDelete = userTags[tagIndex];

    // 从标签列表中移除
    userTags.splice(tagIndex, 1);

    // 从所有图片中移除该标签
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

    // 更新图片标签
    userFiles = userFiles.map(file => {
      if (file.tags && file.tags.includes(tagToDelete.name)) {
        const updatedTags = file.tags.filter(tag => tag !== tagToDelete.name);
        return { ...file, tags: updatedTags };
      }
      return file;
    });

    // 保存更新后的文件列表
    await c.env.img_url.put(userFilesKey, JSON.stringify(userFiles));

    // 更新每个受影响文件的元数据
    for (const file of userFiles) {
      const fileData = await c.env.img_url.getWithMetadata(file.id);
      if (fileData && fileData.metadata && fileData.metadata.tags &&
          fileData.metadata.tags.includes(tagToDelete.name)) {
        const updatedMetadata = {
          ...fileData.metadata,
          tags: file.tags,
          updatedAt: Date.now()
        };
        await c.env.img_url.put(file.id, "", { metadata: updatedMetadata });
      }
    }

    // 保存更新后的标签列表
    await c.env.img_url.put(userTagsKey, JSON.stringify(userTags));

    return c.json({
      message: '标签删除成功',
      deletedTag: tagToDelete
    });
  } catch (error) {
    return c.json({ error: '删除标签失败' }, 500);
  }
}

// 批量标签操作
export async function batchTagOperation(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;
    const { operation, tagIds, targetTagId } = await c.req.json();

    if (!operation || !tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return c.json({ error: '操作类型和标签ID列表不能为空' }, 400);
    }

    // 获取用户标签列表
    const userTagsKey = `user:${userId}:tags`;
    let userTags = await c.env.img_url.get(userTagsKey, { type: "json" }) || [];

    switch (operation) {
      case 'delete':
        return await batchDeleteTags(c, userId, tagIds, userTags);
      case 'merge':
        if (!targetTagId) {
          return c.json({ error: '合并操作需要指定目标标签' }, 400);
        }
        return await batchMergeTags(c, userId, tagIds, targetTagId, userTags);
      default:
        return c.json({ error: '不支持的操作类型' }, 400);
    }
  } catch (error) {
    return c.json({ error: '批量操作失败' }, 500);
  }
}

// 批量删除标签
async function batchDeleteTags(c, userId, tagIds, userTags) {
  // 查找要删除的标签
  const tagsToDelete = userTags.filter(tag => tagIds.includes(tag.id));
  if (tagsToDelete.length === 0) {
    return c.json({ error: '没有找到要删除的标签' }, 404);
  }

  const tagNamesToDelete = tagsToDelete.map(tag => tag.name);

  // 从标签列表中移除
  userTags = userTags.filter(tag => !tagIds.includes(tag.id));

  // 从所有图片中移除这些标签
  const userFilesKey = `user:${userId}:files`;
  let userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

  userFiles = userFiles.map(file => {
    if (file.tags && file.tags.some(tag => tagNamesToDelete.includes(tag))) {
      const updatedTags = file.tags.filter(tag => !tagNamesToDelete.includes(tag));
      return { ...file, tags: updatedTags };
    }
    return file;
  });

  // 保存更新后的数据
  await c.env.img_url.put(`user:${userId}:tags`, JSON.stringify(userTags));
  await c.env.img_url.put(userFilesKey, JSON.stringify(userFiles));

  return c.json({
    message: `成功删除 ${tagsToDelete.length} 个标签`,
    deletedTags: tagsToDelete
  });
}

// 批量合并标签
async function batchMergeTags(c, userId, tagIds, targetTagId, userTags) {
  // 查找目标标签
  const targetTag = userTags.find(tag => tag.id === targetTagId);
  if (!targetTag) {
    return c.json({ error: '目标标签不存在' }, 404);
  }

  // 查找要合并的标签（排除目标标签）
  const tagsToMerge = userTags.filter(tag =>
    tagIds.includes(tag.id) && tag.id !== targetTagId
  );

  if (tagsToMerge.length === 0) {
    return c.json({ error: '没有找到要合并的标签' }, 404);
  }

  const tagNamesToMerge = tagsToMerge.map(tag => tag.name);

  // 从标签列表中移除要合并的标签
  userTags = userTags.filter(tag =>
    !tagIds.includes(tag.id) || tag.id === targetTagId
  );

  // 更新所有图片中的标签
  const userFilesKey = `user:${userId}:files`;
  let userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

  userFiles = userFiles.map(file => {
    if (file.tags && file.tags.some(tag => tagNamesToMerge.includes(tag))) {
      let updatedTags = file.tags.filter(tag => !tagNamesToMerge.includes(tag));
      // 如果还没有目标标签，添加它
      if (!updatedTags.includes(targetTag.name)) {
        updatedTags.push(targetTag.name);
      }
      return { ...file, tags: updatedTags };
    }
    return file;
  });

  // 更新目标标签的更新时间
  const targetTagIndex = userTags.findIndex(tag => tag.id === targetTagId);
  if (targetTagIndex !== -1) {
    userTags[targetTagIndex].updatedAt = new Date().toISOString();
  }

  // 保存更新后的数据
  await c.env.img_url.put(`user:${userId}:tags`, JSON.stringify(userTags));
  await c.env.img_url.put(userFilesKey, JSON.stringify(userFiles));

  return c.json({
    message: `成功将 ${tagsToMerge.length} 个标签合并到 "${targetTag.name}"`,
    targetTag: targetTag,
    mergedTags: tagsToMerge
  });
}

// 获取标签下的图片
export async function getTagImages(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const userId = user.id;
    const tagId = c.req.param('id');

    if (!tagId) {
      return c.json({ error: '标签ID不能为空' }, 400);
    }

    // 获取用户标签列表
    const userTagsKey = `user:${userId}:tags`;
    const userTags = await c.env.img_url.get(userTagsKey, { type: "json" }) || [];

    // 查找标签
    const tag = userTags.find(t => t.id === tagId);
    if (!tag) {
      return c.json({ error: '标签不存在' }, 404);
    }

    // 获取用户文件列表
    const userFilesKey = `user:${userId}:files`;
    const userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];

    // 过滤出包含该标签的图片
    const taggedImages = userFiles.filter(file =>
      file.tags && file.tags.includes(tag.name)
    );

    // 格式化图片信息
    const images = taggedImages.map(file => ({
      id: file.id,
      fileName: file.fileName || file.id,
      fileSize: file.fileSize || 0,
      uploadTime: file.uploadTime || Date.now(),
      url: `/file/${file.id}`,
      thumbnailUrl: `/file/${file.id}`,
      tags: file.tags || [],
      views: file.views || 0
    }));

    return c.json({
      tag: tag,
      images: images,
      total: images.length
    });
  } catch (error) {
    return c.json({ error: '获取标签图片失败' }, 500);
  }
}
