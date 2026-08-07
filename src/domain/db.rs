use worker::d1::D1Database;
use worker::*;

// 在 Worker 运行期间，自动检测并自动创建所有必需的 SQL 数据表 (零摩擦冷启动自愈)
pub async fn init_db(db: &D1Database) -> Result<()> {
    // 1. 创建用户表
    db.prepare(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar_url TEXT,
            bio TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );"
    ).run().await?;

    // 2. 创建相册表 (加入相册提取码密码支持)
    db.prepare(
        "CREATE TABLE IF NOT EXISTS albums (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            cover_url TEXT,
            password_hash TEXT,
            user_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );"
    ).run().await?;

    // 3. 创建图片表 (加入缩略图 file_id、点击统计、最后访问统计字段)
    db.prepare(
        "CREATE TABLE IF NOT EXISTS images (
            id TEXT PRIMARY KEY,
            file_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            mime_type TEXT NOT NULL,
            user_id TEXT NOT NULL,
            album_id TEXT,
            message_id INTEGER,
            thumb_file_id TEXT,
            views INTEGER DEFAULT 0,
            last_accessed_at INTEGER,
            is_trash INTEGER DEFAULT 0,
            is_blocked INTEGER DEFAULT 0,
            uploaded_at INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );"
    ).run().await?;

    // 4. 创建标签表
    db.prepare(
        "CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT,
            user_id TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id),
            UNIQUE(name, user_id)
        );"
    ).run().await?;

    // 5. 创建图片-标签关联多对多表
    db.prepare(
        "CREATE TABLE IF NOT EXISTS image_tags (
            image_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            PRIMARY KEY(image_id, tag_id),
            FOREIGN KEY(image_id) REFERENCES images(id) ON DELETE CASCADE,
            FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );"
    ).run().await?;

    Ok(())
}
