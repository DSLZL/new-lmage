use serde::Deserialize;
use worker::*;

// Telegram API 内部交互响应模型
#[derive(Debug, Deserialize)]
pub struct TgResponse<T> {
    pub ok: bool,
    pub result: Option<T>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TgPhotoSize {
    pub file_id: String,
    pub width: u32,
    pub height: u32,
    pub file_size: Option<u64>,
}

#[derive(Debug)]
pub struct TgDocument {
    pub file_id: String,
    pub file_name: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<u64>,
    pub thumbnail: Option<TgPhotoSize>,
}

// TG 新版接口同时返回 thumbnail 与 thumb 两个缩略图字段，
// 若用 alias 会触发 serde "duplicate field" 错误，这里手动合并取其一
impl<'de> Deserialize<'de> for TgDocument {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        struct TgDocumentRaw {
            file_id: String,
            file_name: Option<String>,
            mime_type: Option<String>,
            file_size: Option<u64>,
            thumbnail: Option<TgPhotoSize>,
            thumb: Option<TgPhotoSize>,
        }

        let raw = TgDocumentRaw::deserialize(deserializer)?;
        Ok(TgDocument {
            file_id: raw.file_id,
            file_name: raw.file_name,
            mime_type: raw.mime_type,
            file_size: raw.file_size,
            thumbnail: raw.thumbnail.or(raw.thumb),
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct TgSendResult {
    pub message_id: i64,
    pub document: Option<TgDocument>,
}

#[derive(Debug, Deserialize)]
pub struct TgFile {
    pub file_path: String,
}

// 手动构建标准 Multipart/Form-Data 报文体
fn build_multipart_body(
    boundary: &str,
    chat_id: &str,
    filename: &str,
    mime_type: &str,
    file_bytes: &[u8],
) -> Vec<u8> {
    let mut body = Vec::new();

    // 1) chat_id
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(b"Content-Disposition: form-data; name=\"chat_id\"\r\n\r\n");
    body.extend_from_slice(chat_id.as_bytes());
    body.extend_from_slice(b"\r\n");

    // 2) document
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(
        format!(
            "Content-Disposition: form-data; name=\"document\"; filename=\"{}\"\r\n",
            filename
        )
        .as_bytes(),
    );
    body.extend_from_slice(format!("Content-Type: {}\r\n\r\n", mime_type).as_bytes());
    body.extend_from_slice(file_bytes);
    body.extend_from_slice(b"\r\n");

    // 3) end boundary
    body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());

    body
}

// 1. 发送原图到 Telegram
pub async fn send_document(
    bot_token: &str,
    chat_id: &str,
    filename: &str,
    mime_type: &str,
    file_bytes: &[u8],
) -> Result<TgSendResult> {
    let boundary = "LaowangRustMultipartBoundary9527";
    let body = build_multipart_body(boundary, chat_id, filename, mime_type, file_bytes);

    let headers = Headers::new();
    headers.set("Content-Type", &format!("multipart/form-data; boundary={}", boundary))?;

    let req = Request::new_with_init(
        &format!("https://api.telegram.org/bot{}/sendDocument", bot_token),
        &RequestInit::new()
            .with_method(Method::Post)
            .with_headers(headers)
            .with_body(Some(body.into())),
    )?;

    let mut resp = Fetch::Request(req).send().await?;
    let text = resp.text().await?;
    let json: TgResponse<TgSendResult> = match serde_json::from_str(&text) {
        Ok(j) => j,
        Err(e) => {
            console_log!("[debug] tg sendDocument raw resp: {}", text);
            return Err(Error::from(format!("TG 响应解析失败: {}", e)));
        }
    };

    if !json.ok || json.result.is_none() {
        let desc = json.description.unwrap_or_else(|| "未知错误".to_string());
        return Err(Error::from(format!("TG 接口返回异常: {}", desc)));
    }

    Ok(json.result.unwrap())
}

// 2. 获取文件物理路径
pub async fn get_file_path(bot_token: &str, file_id: &str) -> Result<String> {
    let url = format!("https://api.telegram.org/bot{}/getFile?file_id={}", bot_token, file_id);
    let mut resp = Fetch::Url(Url::parse(&url)?).send().await?;
    let text = resp.text().await?;
    let json: TgResponse<TgFile> = serde_json::from_str(&text)
        .map_err(|e| Error::from(format!("TG 响应解析失败: {}", e)))?;

    if !json.ok || json.result.is_none() {
        return Err(Error::from("物理文件不存在或在 TG 侧已过期"));
    }

    Ok(json.result.unwrap().file_path)
}

// 3. 流式读取物理文件二进制
pub async fn fetch_file_stream(bot_token: &str, file_path: &str) -> Result<Response> {
    let url = format!("https://api.telegram.org/file/bot{}/{}", bot_token, file_path);
    let resp = Fetch::Url(Url::parse(&url)?).send().await?;
    if resp.status_code() != 200 {
        return Err(Error::from("拉取 TG 真实图片资源失败"));
    }
    Ok(resp)
}

// 4. 删除 Telegram 频道的消息气泡
pub async fn delete_message(bot_token: &str, chat_id: &str, message_id: i64) -> Result<()> {
    let url = format!(
        "https://api.telegram.org/bot{}/deleteMessage?chat_id={}&message_id={}",
        bot_token, chat_id, message_id
    );
    let _ = Fetch::Url(Url::parse(&url)?).send().await;
    Ok(())
}
