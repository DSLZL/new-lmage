use crate::core::{cors, crypto};
use crate::domain::image::{self, Image};
use worker::*;

// 1. 获取图片分页列表
pub async fn get_user_images(req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let url = req.url()?;
    let query = url.query_pairs();
    let mut page = 1;
    let mut limit = 20;

    for (k, v) in query {
        if k == "page" {
            page = v.parse::<i32>().unwrap_or(1);
        } else if k == "limit" {
            limit = v.parse::<i32>().unwrap_or(20);
        }
    }

    let offset = (page - 1) * limit;

    let images = db.prepare(
        "SELECT * FROM images WHERE user_id = ? AND is_trash = 0 ORDER BY uploaded_at DESC LIMIT ? OFFSET ?"
    )
    .bind(&[claims.sub.clone().into(), limit.into(), offset.into()])?
    .all()
    .await?
    .results::<Image>()?;

    let count_res = db.prepare("SELECT COUNT(*) as count FROM images WHERE user_id = ? AND is_trash = 0")
        .bind(&[claims.sub.into()])?
        .first::<serde_json::Value>(None)
        .await?;

    let total = match count_res {
        Some(val) => val.get("count").and_then(|v| v.as_i64()).unwrap_or(0),
        None => 0,
    };

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "images": images,
        "total": total,
        "page": page,
        "limit": limit
    }))?.with_headers(headers);

    Ok(response)
}

// 2. 获取单张图片元数据详情
pub async fn get_image_detail(req: Request, env: Env, imageid: String) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    // D1 存完整 id（纯 file_id + 后缀），直接用完整 imageid 查询
    let img = match image::get_by_id(&db, &imageid).await? {
        Some(i) => i,
        None => return Response::error("图片不存在", 404),
    };

    if img.user_id != claims.sub && claims.username != "admin" {
        return Response::error("无权查看此图片元数据", 403);
    }

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&img)?.with_headers(headers);
    Ok(response)
}

// 3. 搜索当前用户的图片
pub async fn search_user_images(req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let url = req.url()?;
    let query = url.query_pairs();
    let mut keyword = String::new();

    for (k, v) in query {
        if k == "keyword" || k == "q" {
            keyword = v.into_owned();
        }
    }

    let like_query = format!("%{}%", keyword);

    let images = db.prepare(
        "SELECT * FROM images WHERE user_id = ? AND is_trash = 0 AND file_name LIKE ? ORDER BY uploaded_at DESC"
    )
    .bind(&[claims.sub.into(), like_query.into()])?
    .all()
    .await?
    .results::<Image>()?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "images": images
    }))?.with_headers(headers);

    Ok(response)
}

// 4. 批量图片移动到回收站
pub async fn batch_move_to_trash(mut req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    #[derive(serde::Deserialize)]
    struct BatchRequest {
        #[serde(alias = "file_ids")]
        fileids: Vec<String>,
    }

    let body: BatchRequest = match req.json().await {
        Ok(b) => b,
        Err(_) => return Response::error("请求 JSON 格式错误", 400),
    };

    let mut success_count = 0;
    for full_id in body.fileids {
        // D1 存完整 id（纯 file_id + 后缀），查询与写入都用完整 id
        if let Ok(Some(img)) = image::get_by_id(&db, &full_id).await {
            if img.user_id == claims.sub || claims.username == "admin" {
                let _ = image::set_trash_status(&db, &full_id, 1).await;
                success_count += 1;
            }
        }
    }

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "success": true,
        "message": format!("成功将 {} 张图片移入回收站", success_count)
    }))?.with_headers(headers);

    Ok(response)
}
