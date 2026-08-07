use crate::core::{cors, crypto, tg};
use crate::domain::image::{self, Image};
use worker::*;

pub async fn upload(mut req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let bot_token = env.var("TG_Bot_Token")?.to_string();
    let chat_id = env.var("TG_Chat_ID")?.to_string();
    let jwt_secret = env.var("JWT_SECRET")?.to_string();

    // 1. 鉴权判定 (可选)
    let user_id = match crypto::authenticate(&req, &jwt_secret) {
        Ok(claims) => claims.sub,
        Err(_) => "anonymous".to_string(),
    };

    // 2. 文件上传体限制 (20MB)
    if let Some(content_length) = req.headers().get("content-length")? {
        if let Ok(size) = content_length.parse::<usize>() {
            if size > 20 * 1024 * 1024 {
                return Response::error("文件超过 20MB 限制", 413);
            }
        }
    }

    // 3. 读取表单数据
    let form = match req.form_data().await {
        Ok(f) => f,
        Err(_) => return Response::error("表单解析错误", 400),
    };

    let file_entry = match form.get("file") {
        Some(FormEntry::File(file)) => file,
        _ => return Response::error("未检测到文件字段 'file'", 400),
    };

    let filename = file_entry.name();
    let mime_type = file_entry.type_();
    let file_bytes = file_entry.bytes().await?;
    let file_size = file_bytes.len() as i64;

    // 可选归属相册参数
    let album_id = match form.get("albumid") {
        Some(FormEntry::Field(id)) => {
            if id.trim().is_empty() {
                None
            } else {
                Some(id.trim().to_string())
            }
        }
        _ => None,
    };

    // 4. 调用 TG 基建发送文档并解析响应
    let tg_result = match tg::send_document(&bot_token, &chat_id, &filename, &mime_type, &file_bytes).await {
        Ok(res) => res,
        Err(err) => return Response::error(format!("TG 中转异常: {}", err), 502),
    };

    let message_id = tg_result.message_id;
    let doc = match tg_result.document {
        Some(d) => d,
        None => return Response::error("TG 中转元数据提取失败", 502),
    };

    let thumb_file_id = doc.thumbnail.as_ref().map(|t| t.file_id.clone());
    let ext = filename.split('.').last().unwrap_or("png");
    let image_id = format!("{}.{}", doc.file_id, ext);
    let now = Date::now().as_millis() as i64;

    // 5. 写入 D1 数据库
    let new_image = Image {
        id: image_id.clone(),
        file_id: doc.file_id,
        file_name: filename,
        file_size,
        mime_type,
        user_id,
        album_id,
        message_id: Some(message_id),
        thumb_file_id,
        views: 0,
        last_accessed_at: None,
        is_trash: 0,
        is_blocked: 0,
        uploaded_at: now,
    };

    image::create(&db, &new_image).await?;

    let output = serde_json::json!([{
        "src": format!("/file/{}", image_id)
    }]);

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let response = Response::from_json(&output)?.with_headers(headers);
    Ok(response)
}
