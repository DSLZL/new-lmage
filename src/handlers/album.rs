use crate::core::{cors, crypto};
use crate::domain::album::{self, Album, CreateAlbumRequest};
use crate::domain::image::Image;
use worker::*;

// 1. 相册列表
pub async fn get_user_albums(req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let albums = db.prepare("SELECT * FROM albums WHERE user_id = ? ORDER BY created_at DESC")
        .bind(&[claims.sub.into()])?
        .all()
        .await?
        .results::<Album>()?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({ "albums": albums }))?.with_headers(headers);
    Ok(response)
}

// 2. 创建相册 (支持密码加盐)
pub async fn create_album(mut req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let body: CreateAlbumRequest = match req.json().await {
        Ok(b) => b,
        Err(_) => return Response::error("请求 JSON 格式非法", 400),
    };

    if body.name.trim().is_empty() {
        return Response::error("相册名称不能为空", 400);
    }

    let password_hash = match body.password {
        Some(ref pwd) => {
            if pwd.trim().is_empty() {
                None
            } else {
                let salt = crypto::generate_salt();
                Some(crypto::hash_password(pwd, &salt))
            }
        }
        None => None,
    };

    let album_id = uuid::Uuid::new_v4().to_string();
    let now = Date::now().as_millis() as i64;

    let new_album = Album {
        id: album_id.clone(),
        name: body.name,
        description: body.description,
        cover_url: body.cover_url,
        password_hash,
        user_id: claims.sub,
        created_at: now,
    };

    album::create(&db, &new_album).await?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "success": true,
        "message": "相册创建成功",
        "albumid": album_id
    }))?.with_headers(headers);

    Ok(response)
}

// 3. 相册详情与内含图片拉取 (带提取码密码安全比对)
pub async fn get_album_detail(req: Request, env: Env, albumid: String) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let album_opt = album::get_by_id(&db, &albumid).await?;
    let album_data = match album_opt {
        Some(a) => {
            if a.user_id != claims.sub && claims.username != "admin" {
                if let Some(ref hash) = a.password_hash {
                    let url = req.url()?;
                    let query = url.query_pairs();
                    let mut input_pwd = String::new();
                    for (k, v) in query {
                        if k == "password" || k == "code" {
                            input_pwd = v.into_owned();
                            break;
                        }
                    }
                    if input_pwd.is_empty() || !crypto::verify_password(&input_pwd, hash) {
                        let mut headers = cors::apply_cors(Headers::new())?;
                        headers.set("Content-Type", "application/json")?;
                        return Ok(Response::error("此相册受密码保护，请提供正确的相册提取码", 403)?.with_headers(headers));
                    }
                }
            }
            a
        }
        None => return Response::error("相册不存在", 404),
    };

    let images = db.prepare("SELECT * FROM images WHERE album_id = ? AND is_trash = 0 ORDER BY uploaded_at DESC")
        .bind(&[albumid.into()])?
        .all()
        .await?
        .results::<Image>()?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "album": {
            "id": album_data.id,
            "name": album_data.name,
            "description": album_data.description,
            "cover_url": album_data.cover_url,
            "has_password": album_data.password_hash.is_some(),
            "user_id": album_data.user_id,
            "created_at": album_data.created_at
        },
        "images": images
    }))?.with_headers(headers);

    Ok(response)
}

// 4. 批量修改相册内图片关联
pub async fn modify_album_images(mut req: Request, env: Env, albumid: String) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let album_opt = album::get_by_id(&db, &albumid).await?;
    match album_opt {
        Some(a) => {
            if a.user_id != claims.sub && claims.username != "admin" {
                return Response::error("无权操作此相册", 403);
            }
        }
        None => return Response::error("相册不存在", 404),
    }

    #[derive(serde::Deserialize)]
    struct ModifyAlbumImagesRequest {
        #[serde(alias = "image_ids")]
        imageids: Vec<String>,
        action: String,
    }

    let body: ModifyAlbumImagesRequest = match req.json().await {
        Ok(b) => b,
        Err(_) => return Response::error("请求 JSON 格式非法", 400),
    };

    let target_album_id = if body.action == "add" {
        Some(albumid)
    } else {
        None
    };

    let mut modified_count = 0;
    for full_id in body.imageids {
        // D1 存完整 id（纯 file_id + 后缀），查询与写入都用完整 id
        if let Ok(Some(img)) = crate::domain::image::get_by_id(&db, &full_id).await {
            if img.user_id == claims.sub || claims.username == "admin" {
                db.prepare("UPDATE images SET album_id = ? WHERE id = ?")
                    .bind(&[crate::domain::db::opt_str(target_album_id.as_deref()), full_id.into()])?
                    .run()
                    .await?;
                modified_count += 1;
            }
        }
    }

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "success": true,
        "message": format!("成功修改 {} 张图片的相册归属", modified_count)
    }))?.with_headers(headers);

    Ok(response)
}

// 5. 删除相册 (级联置空)
pub async fn delete_album(req: Request, env: Env, albumid: String) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let album_opt = album::get_by_id(&db, &albumid).await?;
    match album_opt {
        Some(a) => {
            if a.user_id != claims.sub && claims.username != "admin" {
                return Response::error("无权删除此相册", 403);
            }
        }
        None => return Response::error("相册不存在", 404),
    }

    db.prepare("UPDATE images SET album_id = NULL WHERE album_id = ?")
        .bind(&[albumid.as_str().into()])?
        .run()
        .await?;

    album::delete(&db, &albumid).await?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "success": true,
        "message": "相册删除成功，相册内图片已自动解除相册归属"
    }))?.with_headers(headers);

    Ok(response)
}
