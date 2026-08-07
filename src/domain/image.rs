use serde::{Deserialize, Serialize};
use worker::d1::D1Database;
use worker::*;

// 图片实体
#[derive(Debug, Serialize, Deserialize)]
pub struct Image {
    pub id: String,
    pub file_id: String,
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
    pub user_id: String,
    pub album_id: Option<String>,
    pub message_id: Option<i64>,
    pub thumb_file_id: Option<String>,
    pub views: i64,
    pub last_accessed_at: Option<i64>,
    pub is_trash: i32,
    pub is_blocked: i32,
    pub uploaded_at: i64,
}

// 批量打标载荷
#[derive(Debug, Deserialize)]
pub struct BatchImageTagRequest {
    #[serde(alias = "file_ids")]
    pub file_ids: Vec<String>,
    pub tags: Vec<String>,
    pub action: String,
}

// ==================== D1 CRUD 操作 ====================

pub async fn create(db: &D1Database, img: &Image) -> Result<()> {
    db.prepare(
        "INSERT INTO images (id, file_id, file_name, file_size, mime_type, user_id, album_id, message_id, thumb_file_id, views, last_accessed_at, is_trash, is_blocked, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&[
        img.id.as_str().into(),
        img.file_id.as_str().into(),
        img.file_name.as_str().into(),
        img.file_size.into(),
        img.mime_type.as_str().into(),
        img.user_id.as_str().into(),
        img.album_id.as_deref().into(),
        img.message_id.into(),
        img.thumb_file_id.as_deref().into(),
        img.views.into(),
        img.last_accessed_at.into(),
        img.is_trash.into(),
        img.is_blocked.into(),
        img.uploaded_at.into(),
    ])?
    .run()
    .await?;
    Ok(())
}

pub async fn get_by_id(db: &D1Database, id: &str) -> Result<Option<Image>> {
    db.prepare("SELECT * FROM images WHERE id = ?")
        .bind(&[id.into()])?
        .first::<Image>(None)
        .await
}

pub async fn delete_physically(db: &D1Database, id: &str) -> Result<()> {
    db.prepare("DELETE FROM images WHERE id = ?")
        .bind(&[id.into()])?
        .run()
        .await?;
    Ok(())
}

pub async fn set_trash_status(db: &D1Database, id: &str, is_trash: i32) -> Result<()> {
    db.prepare("UPDATE images SET is_trash = ? WHERE id = ?")
        .bind(&[is_trash.into(), id.into()])?
        .run()
        .await?;
    Ok(())
}

pub async fn set_block_status(db: &D1Database, id: &str, is_blocked: i32) -> Result<()> {
    db.prepare("UPDATE images SET is_blocked = ? WHERE id = ?")
        .bind(&[is_blocked.into(), id.into()])?
        .run()
        .await?;
    Ok(())
}

pub async fn increment_views(db: &D1Database, id: &str, now: i64) -> Result<()> {
    db.prepare("UPDATE images SET views = views + 1, last_accessed_at = ? WHERE id = ?")
        .bind(&[now.into(), id.into()])?
        .run()
        .await?;
    Ok(())
}
