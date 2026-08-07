use crate::core::{cors, crypto};
use crate::domain::image::Image;
use crate::domain::tag::{self, Tag};
use worker::*;

// 1. 全量标签列表
pub async fn get_user_tags(req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let tags = db.prepare("SELECT * FROM tags WHERE user_id = ?")
        .bind(&[claims.sub.into()])?
        .all()
        .await?
        .results::<Tag>()?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({ "tags": tags }))?.with_headers(headers);
    Ok(response)
}

// 2. 创建标签
pub async fn create_tag(mut req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let body: tag::CreateTagRequest = match req.json().await {
        Ok(b) => b,
        Err(_) => return Response::error("请求 JSON 格式非法", 400),
    };

    if body.name.trim().is_empty() {
        return Response::error("标签名称不能为空", 400);
    }

    if tag::get_by_name(&db, &body.name, &claims.sub).await?.is_some() {
        return Response::error("标签名称已存在", 409);
    }

    let tag_id = uuid::Uuid::new_v4().to_string();
    let new_tag = Tag {
        id: tag_id.clone(),
        name: body.name,
        color: body.color,
        user_id: claims.sub,
    };

    tag::create(&db, &new_tag).await?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "success": true,
        "message": "标签创建成功",
        "tagid": tag_id
    }))?.with_headers(headers);

    Ok(response)
}

// 3. 批量图片标签绑定/解除
pub async fn batch_tag_images(mut req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let body: crate::domain::image::BatchImageTagRequest = match req.json().await {
        Ok(b) => b,
        Err(_) => return Response::error("请求 JSON 格式非法", 400),
    };

    let mut action_count = 0;

    for full_id in body.file_ids {
        // D1 存完整 id（纯 file_id + 后缀），查询与 image_tags 外键写入都用完整 id
        let img = match crate::domain::image::get_by_id(&db, &full_id).await {
            Ok(Some(i)) => i,
            _ => continue,
        };

        if img.user_id != claims.sub && claims.username != "admin" {
            continue;
        }

        for tag_name in &body.tags {
            let tag_opt = tag::get_by_name(&db, tag_name, &claims.sub).await?;
            let t = match tag_opt {
                Some(tag_item) => tag_item,
                None => continue,
            };

            if body.action == "add" {
                let _ = db.prepare("INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)")
                    .bind(&[full_id.clone().into(), t.id.into()])?
                    .run()
                    .await;
            } else {
                let _ = db.prepare("DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?")
                    .bind(&[full_id.clone().into(), t.id.into()])?
                    .run()
                    .await;
            }
        }
        action_count += 1;
    }

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "success": true,
        "message": format!("成功批量操作了 {} 张图片的标签", action_count)
    }))?.with_headers(headers);

    Ok(response)
}

// 4. 获取绑定了该标签的所有图片列表
pub async fn get_tag_images(req: Request, env: Env, tagid: String) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let tag_opt = tag::get_by_id(&db, &tagid).await?;
    match tag_opt {
        Some(t) => {
            if t.user_id != claims.sub && claims.username != "admin" {
                return Response::error("无权查看此标签的图片", 403);
            }
        }
        None => return Response::error("标签不存在", 404),
    }

    let images = db.prepare(
        "SELECT i.* FROM images i
         JOIN image_tags it ON i.id = it.image_id
         WHERE it.tag_id = ? AND i.is_trash = 0
         ORDER BY i.uploaded_at DESC"
    )
    .bind(&[tagid.into()])?
    .all()
    .await?
    .results::<Image>()?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({ "images": images }))?.with_headers(headers);
    Ok(response)
}
