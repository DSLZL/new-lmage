use serde::{Deserialize, Serialize};
use worker::d1::D1Database;
use worker::*;

use super::db::opt_str;

// 标签实体
#[derive(Debug, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub user_id: String,
}

// 创建标签载荷
#[derive(Debug, Deserialize)]
pub struct CreateTagRequest {
    pub name: String,
    pub color: Option<String>,
}

// ==================== D1 CRUD 操作 ====================

pub async fn create(db: &D1Database, tag: &Tag) -> Result<()> {
    db.prepare("INSERT INTO tags (id, name, color, user_id) VALUES (?, ?, ?, ?)")
        .bind(&[
            tag.id.as_str().into(),
            tag.name.as_str().into(),
            opt_str(tag.color.as_deref()),
            tag.user_id.as_str().into()
        ])?
        .run()
        .await?;
    Ok(())
}

pub async fn get_by_id(db: &D1Database, id: &str) -> Result<Option<Tag>> {
    db.prepare("SELECT * FROM tags WHERE id = ?")
        .bind(&[id.into()])?
        .first::<Tag>(None)
        .await
}

pub async fn get_by_name(db: &D1Database, name: &str, user_id: &str) -> Result<Option<Tag>> {
    db.prepare("SELECT * FROM tags WHERE name = ? AND user_id = ?")
        .bind(&[name.into(), user_id.into()])?
        .first::<Tag>(None)
        .await
}

pub async fn delete(db: &D1Database, id: &str) -> Result<()> {
    db.prepare("DELETE FROM tags WHERE id = ?")
        .bind(&[id.into()])?
        .run()
        .await?;
    Ok(())
}
