/**
 * 用户认证相关API
 */
import { generateToken, hashPassword, verifyPassword } from '../utils/auth';
import { errorHandling, telemetryData } from '../utils/middleware';

// 用户注册
export async function register(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const { username, password, email } = await c.req.json();
    
    // 验证输入
    if (!username || !password || !email) {
      return c.json({ error: '用户名、密码和邮箱都是必填项' }, 400);
    }
    
    // 检查用户名是否已存在
    const existingUser = await c.env.users.get(`user:${username}`);
    if (existingUser) {
      return c.json({ error: '用户名已存在' }, 409);
    }
    
    // 检查邮箱是否已存在
    const emailKey = `email:${email}`;
    const existingEmail = await c.env.users.get(emailKey);
    if (existingEmail) {
      return c.json({ error: '邮箱已被注册' }, 409);
    }
    
    // 哈希密码
    const hashedPassword = await hashPassword(password);
    
    // 创建用户对象
    const userId = crypto.randomUUID();
    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // 存储用户信息
    await c.env.users.put(`user:${username}`, JSON.stringify(user));
    await c.env.users.put(`userid:${userId}`, username);
    await c.env.users.put(emailKey, username);
    
    // 生成令牌
    const token = await generateToken({ id: userId, username }, c.env);
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    return c.json({ 
      message: '注册成功', 
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    return c.json({ error: '注册失败' }, 500);
  }
}

// 用户登录
export async function login(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const { username, password } = await c.req.json();
    
    // 验证输入
    if (!username || !password) {
      return c.json({ error: '用户名和密码都是必填项' }, 400);
    }
    
    // 获取用户信息
    const userJson = await c.env.users.get(`user:${username}`);
    if (!userJson) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }
    
    const user = JSON.parse(userJson);
    
    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }
    
    // 生成令牌
    const token = await generateToken({ id: user.id, username }, c.env);
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    return c.json({ 
      message: '登录成功', 
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    return c.json({ error: '登录失败' }, 500);
  }
}

// 获取当前用户信息
export async function getCurrentUser(c) {
  try {
    const user = c.get('user');
    
    // 获取完整的用户信息
    const username = user.username;
    const userJson = await c.env.users.get(`user:${username}`);
    
    if (!userJson) {
      return c.json({ error: '用户不存在' }, 404);
    }
    
    const userFull = JSON.parse(userJson);
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = userFull;
    return c.json({ user: userWithoutPassword });
  } catch (error) {
    return c.json({ error: '获取用户信息失败' }, 500);
  }
}

// 更新用户头像
export async function updateUserAvatar(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const { avatarUrl } = await c.req.json();
    
    // 验证输入
    if (!avatarUrl) {
      return c.json({ error: '头像链接不能为空' }, 400);
    }
    
    // 简单验证是否为有效的URL
    try {
      new URL(avatarUrl);
    } catch {
      return c.json({ error: '请提供有效的头像链接' }, 400);
    }
    
    // 获取用户信息
    const username = user.username;
    const userJson = await c.env.users.get(`user:${username}`);
    
    if (!userJson) {
      return c.json({ error: '用户不存在' }, 404);
    }
    
    const userFull = JSON.parse(userJson);
    
    // 更新用户头像
    const updatedUser = {
      ...userFull,
      avatarUrl,
      updatedAt: Date.now()
    };
    
    // 保存更新后的用户信息
    await c.env.users.put(`user:${username}`, JSON.stringify(updatedUser));
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = updatedUser;
    return c.json({ 
      message: '头像更新成功', 
      user: userWithoutPassword 
    });
  } catch (error) {
    return c.json({ error: '更新头像失败' }, 500);
  }
}

// 获取用户资料
export async function getUserProfile(c) {
  try {
    const user = c.get('user');
    
    // 获取完整的用户信息
    const username = user.username;
    const userJson = await c.env.users.get(`user:${username}`);
    
    if (!userJson) {
      return c.json({ error: '用户不存在' }, 404);
    }
    
    const userFull = JSON.parse(userJson);
    
    // 获取用户统计信息
    const userFilesKey = `user:${user.id}:files`;
    const userFiles = await c.env.img_url.get(userFilesKey, { type: "json" }) || [];
    
    const totalImages = userFiles.length;
    const totalSize = userFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = userFull;
    return c.json({ 
      user: {
        ...userWithoutPassword,
        stats: {
          totalImages,
          totalSize
        }
      }
    });
  } catch (error) {
    return c.json({ error: '获取用户资料失败' }, 500);
  }
}

// 更新用户资料
export async function updateUserProfile(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const { username: newUsername, email, bio } = await c.req.json();
    
    // 获取当前用户信息
    const currentUsername = user.username;
    const userJson = await c.env.users.get(`user:${currentUsername}`);
    
    if (!userJson) {
      return c.json({ error: '用户不存在' }, 404);
    }
    
    const userFull = JSON.parse(userJson);
    
    // 如果要更新用户名，检查新用户名是否已存在
    if (newUsername && newUsername !== currentUsername) {
      const existingUser = await c.env.users.get(`user:${newUsername}`);
      if (existingUser) {
        return c.json({ error: '用户名已存在' }, 409);
      }
    }
    
    // 如果要更新邮箱，检查新邮箱是否已被使用
    if (email && email !== userFull.email) {
      const emailKey = `email:${email}`;
      const existingEmail = await c.env.users.get(emailKey);
      if (existingEmail && existingEmail !== currentUsername) {
        return c.json({ error: '邮箱已被注册' }, 409);
      }
      
      // 删除旧邮箱映射
      await c.env.users.delete(`email:${userFull.email}`);
      // 创建新邮箱映射
      await c.env.users.put(emailKey, newUsername || currentUsername);
    }
    
    // 更新用户信息
    const updatedUser = {
      ...userFull,
      username: newUsername || currentUsername,
      email: email || userFull.email,
      bio: bio !== undefined ? bio : userFull.bio,
      updatedAt: Date.now()
    };
    
    // 如果用户名改变了，需要更新所有相关的键
    if (newUsername && newUsername !== currentUsername) {
      // 删除旧用户名的键
      await c.env.users.delete(`user:${currentUsername}`);
      // 创建新用户名的键
      await c.env.users.put(`user:${newUsername}`, JSON.stringify(updatedUser));
      // 更新用户ID映射
      await c.env.users.put(`userid:${userFull.id}`, newUsername);
    } else {
      // 只更新用户信息
      await c.env.users.put(`user:${currentUsername}`, JSON.stringify(updatedUser));
    }
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = updatedUser;
    return c.json({ 
      message: '资料更新成功', 
      user: userWithoutPassword 
    });
  } catch (error) {
    return c.json({ error: '更新资料失败' }, 500);
  }
}

// 修改密码
export async function changePassword(c) {
  try {
    // 错误处理和遥测数据
    await errorHandling(c);
    telemetryData(c);

    const user = c.get('user');
    const { currentPassword, newPassword } = await c.req.json();
    
    // 验证输入
    if (!currentPassword || !newPassword) {
      return c.json({ error: '当前密码和新密码都是必填项' }, 400);
    }
    
    // 验证新密码强度
    if (newPassword.length < 6) {
      return c.json({ error: '新密码长度至少为6个字符' }, 400);
    }
    
    // 获取用户信息
    const username = user.username;
    const userJson = await c.env.users.get(`user:${username}`);
    
    if (!userJson) {
      return c.json({ error: '用户不存在' }, 404);
    }
    
    const userFull = JSON.parse(userJson);
    
    // 验证当前密码
    const isPasswordValid = await verifyPassword(currentPassword, userFull.password);
    if (!isPasswordValid) {
      return c.json({ error: '当前密码错误' }, 401);
    }
    
    // 哈希新密码
    const hashedPassword = await hashPassword(newPassword);
    
    // 更新用户密码
    const updatedUser = {
      ...userFull,
      password: hashedPassword,
      updatedAt: Date.now()
    };
    
    // 保存更新后的用户信息
    await c.env.users.put(`user:${username}`, JSON.stringify(updatedUser));
    
    return c.json({ message: '密码修改成功' });
  } catch (error) {
    return c.json({ error: '修改密码失败' }, 500);
  }
}
