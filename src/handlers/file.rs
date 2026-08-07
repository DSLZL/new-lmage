use crate::core::{cors, crypto, tg};
use crate::domain::image;
use worker::*;

// 1. 流式图片代理网关（打通 Cloudflare Cache API 全球边缘节点物理缓存，点击量统计，多尺寸缩略图）
pub async fn proxy_file(req: Request, env: Env, filekey: String) -> Result<Response> {
    let db = env.d1("DB")?;
    let bot_token = env.var("TG_Bot_Token")?.to_string();

    // ⚡ 状态校验必须先于缓存检查：封禁/回收站必须立即生效，
    // 否则被边缘缓存兜住的图片可绕过拦截继续读取
    let raw_file_id = filekey.split('.').next().unwrap_or(&filekey).to_string();
    let mut target_file_id = raw_file_id.clone();

    let img_opt = image::get_by_id(&db, &filekey).await.unwrap_or(None);

    if let Some(ref img) = img_opt {
        if img.is_blocked == 1 {
            let mut headers = cors::apply_cors(Headers::new())?;
            headers.set("Content-Type", "application/json")?;
            return Ok(Response::error("图片已被封禁", 403)?.with_headers(headers));
        }
        if img.is_trash == 1 {
            let mut headers = cors::apply_cors(Headers::new())?;
            headers.set("Content-Type", "application/json")?;
            return Ok(Response::error("图片已被移入回收站", 404)?.with_headers(headers));
        }

        // size=thumb 缩略图快速白嫖
        let url = req.url()?;
        let query = url.query_pairs();
        let mut request_thumb = false;
        for (k, v) in query {
            if k == "size" && v == "thumb" {
                request_thumb = true;
                break;
            }
        }

        if request_thumb {
            if let Some(ref thumb_id) = img.thumb_file_id {
                target_file_id = thumb_id.clone();
            }
        }
    }

    // ⚡ 极致白嫖：第一关，尝试直接从 Cloudflare 边缘物理缓存中拿！
    let cache_key = req.url()?.to_string();
    if let Ok(Some(cached_resp)) = Cache::default().get(&cache_key, true).await {
        // 🚀 物理秒开击中：直接跳过 TG CDN 穿透，零时延输出！
        return Ok(cached_resp);
    }

    // 1) 换取物理路径
    let file_path = match tg::get_file_path(&bot_token, &target_file_id).await {
        Ok(path) => path,
        Err(err) => return Response::error(err.to_string(), 404),
    };

    // 2) 调取真实流
    let mut cdn_resp = tg::fetch_file_stream(&bot_token, &file_path).await?;

    // 3) 注入强缓存，Cloudflare Cache API 必须携带 max-age 才能缓存成功！
    let mut res_headers = cors::apply_cors(Headers::new())?;
    res_headers.set(
        "Cache-Control",
        "public, s-maxage=31536000, max-age=31536000, immutable",
    )?;
    res_headers.set("X-Content-Type-Options", "nosniff")?;

    let ext = filekey.split('.').last().unwrap_or("").to_lowercase();
    let mime_type = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "mp3" => "audio/mpeg",
        _ => "application/octet-stream",
    };
    res_headers.set("Content-Type", mime_type)?;

    // 4) 物理流写入成功后，累计 Views (D1 写入)
    if img_opt.is_some() {
        let now = Date::now().as_millis() as i64;
        let _ = image::increment_views(&db, &raw_file_id, now).await;
    }

    let bytes = cdn_resp.bytes().await?;
    let mut response = Response::from_bytes(bytes)?.with_headers(res_headers);

    // ⚡ 极致白嫖：将流克隆一份，异步在后台写入 Cloudflare Cache 节点，不阻塞当前响应输出！
    if let Ok(resp_for_cache) = response.cloned() {
        let cache_key_clone = cache_key.clone();
        wasm_bindgen_futures::spawn_local(async move {
            let _ = Cache::default().put(cache_key_clone, resp_for_cache).await;
        });
    }

    Ok(response)
}

// 2. 物理永久彻底删除
pub async fn delete_file(req: Request, env: Env, imageid: String) -> Result<Response> {
    let db = env.d1("DB")?;
    let bot_token = env.var("TG_Bot_Token")?.to_string();
    let chat_id = env.var("TG_Chat_ID")?.to_string();
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
        return Response::error("无权操作此资源", 403);
    }

    // 1) 彻底在 TG 频道销毁消息
    if let Some(msg_id) = img.message_id {
        let _ = tg::delete_message(&bot_token, &chat_id, msg_id).await;
    }

    // 2) 清掉边缘缓存（原图 + 缩略图），防止已删图片被缓存继续吐给用户
    if let Ok(url) = req.url() {
        let origin = format!("{}://{}", url.scheme(), url.host_str().unwrap_or(""));
        for suffix in ["", "?size=thumb"] {
            let cache_key = format!("{}/file/{}{}", origin, imageid, suffix);
            let _ = Cache::default().delete(&cache_key, true).await;
        }
    }

    // 3) 彻底从 D1 清理元数据
    image::delete_physically(&db, &imageid).await?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&serde_json::json!({
        "success": true,
        "message": "图片已物理永久删除，频道底图消息已销毁！"
    }))?.with_headers(headers);

    Ok(response)
}
