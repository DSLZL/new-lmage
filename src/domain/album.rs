use serde::{Deserialize, Serialize};
use worker::d1::D1Database;
use worker::*;

// 相册实体
#[derive(Debug, Serialize, Deserialize)]
pub struct Album {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub password_hash: Option<String>,
    pub user_id: String,
    pub created_at: i64,
}

// 创建相册载荷
#[derive(Debug, Deserialize)]
pub struct CreateAlbumRequest {
    pub name: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub password: Option<String>,
}

// ==================== D1 CRUD 操作 ====================

pub async fn create(db: &D1Database, album: &Album) -> Result<()> {
    db.prepare(
        "INSERT INTO albums (id, name, description, cover_url, password_hash, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&[
        album.id.as_str().into(),
        album.name.as_str().into(),
        album.description.as_deref().into(),
        album.cover_url.as_deref().into(),
        album.password_hash.as_deref().into(),
        album.user_id.as_str().into(),
        album.created_at.into()
    ])?
    .run()
    .await?;
    Ok(())
}

pub async fn get_by_id(db: &D1Database, id: &str) -> Result<Option<Album>> {
    db.prepare("SELECT * FROM albums WHERE id = ?")
        .bind(&[id.into()])?
        .first::<Album>(None)
        .await
}

pub async fn delete(db: &D1Database, id: &str) -> Result<()> {
    db.prepare("DELETE FROM albums WHERE id = ?")
        .bind(&[id.into()])?
        .run()
        .await?;
    Ok(())
}
