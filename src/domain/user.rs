use serde::{Deserialize, Serialize};
use worker::d1::D1Database;
use worker::*;

use super::db::{int_i64, opt_str};

// JWT Payload
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,       // user_id
    pub username: String,  // 用户名
    pub exp: u64,          // 过期时间
}

// 用户实体
#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

// 登录/注册/修改 载荷
#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

// ==================== D1 CRUD 操作 ====================

pub async fn get_by_username(db: &D1Database, username: &str) -> Result<Option<User>> {
    db.prepare("SELECT * FROM users WHERE username = ?")
        .bind(&[username.into()])?
        .first::<User>(None)
        .await
}

pub async fn get_by_id(db: &D1Database, id: &str) -> Result<Option<User>> {
    db.prepare("SELECT * FROM users WHERE id = ?")
        .bind(&[id.into()])?
        .first::<User>(None)
        .await
}

pub async fn get_by_email(db: &D1Database, email: &str) -> Result<Option<User>> {
    db.prepare("SELECT * FROM users WHERE email = ?")
        .bind(&[email.into()])?
        .first::<User>(None)
        .await
}

pub async fn create(db: &D1Database, user: &User) -> Result<()> {
    db.prepare(
        "INSERT INTO users (id, username, email, password_hash, avatar_url, bio, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&[
        user.id.as_str().into(),
        user.username.as_str().into(),
        user.email.as_str().into(),
        user.password_hash.as_str().into(),
        opt_str(user.avatar_url.as_deref()),
        opt_str(user.bio.as_deref()),
        int_i64(user.created_at),
        int_i64(user.updated_at),
    ])?
    .run()
    .await?;
    Ok(())
}

pub async fn update_profile(
    db: &D1Database,
    user_id: &str,
    username: &str,
    email: &str,
    bio: Option<&str>,
    avatar_url: Option<&str>,
    updated_at: i64,
) -> Result<()> {
    db.prepare(
        "UPDATE users SET username = ?, email = ?, bio = ?, avatar_url = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&[
        username.into(),
        email.into(),
        opt_str(bio),
        opt_str(avatar_url),
        int_i64(updated_at),
        user_id.into()
    ])?
    .run()
    .await?;
    Ok(())
}

pub async fn update_password(db: &D1Database, user_id: &str, password_hash: &str, updated_at: i64) -> Result<()> {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
        .bind(&[password_hash.into(), int_i64(updated_at), user_id.into()])?
        .run()
        .await?;
    Ok(())
}
