use crate::domain::user::Claims;
use base64::prelude::*;
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use worker::*;

type HmacSha256 = Hmac<Sha256>;

// 1. 生成随机盐值
pub fn generate_salt() -> String {
    let now = Date::now().as_millis();
    let mut hasher = Sha256::new();
    hasher.update(now.to_string().as_bytes());
    let hash_result = hasher.finalize();
    format!("{:x}", hash_result)[..16].to_string()
}

// 2. 密码加盐哈希
pub fn hash_password(password: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}{}", salt, password).as_bytes());
    let hash_result = hasher.finalize();
    format!("{}:{:x}", salt, hash_result)
}

// 3. 验证密码
pub fn verify_password(password: &str, stored_hash: &str) -> bool {
    let parts: Vec<&str> = stored_hash.split(':').collect();
    if parts.len() != 2 {
        return false;
    }
    let salt = parts[0];
    let new_hash = hash_password(password, salt);
    new_hash == stored_hash
}

// 4. 生成 JWT 令牌 (HMAC-SHA256 Base64URL)
pub fn generate_jwt(claims: &Claims, secret: &str) -> Result<String> {
    let header_json = serde_json::json!({
        "alg": "HS256",
        "typ": "JWT"
    })
    .to_string();

    let payload_json = serde_json::to_string(claims)?;

    let encoded_header = BASE64_URL_SAFE_NO_PAD.encode(header_json.as_bytes());
    let encoded_payload = BASE64_URL_SAFE_NO_PAD.encode(payload_json.as_bytes());

    let signing_input = format!("{}.{}", encoded_header, encoded_payload);

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| Error::from("HMAC Key 初始化失败"))?;
    mac.update(signing_input.as_bytes());
    
    let signature = BASE64_URL_SAFE_NO_PAD.encode(&mac.finalize().into_bytes());

    Ok(format!("{}.{}.{}", encoded_header, encoded_payload, signature))
}

// 5. 验证 JWT 令牌
pub fn verify_jwt(token: &str, secret: &str) -> Result<Claims> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err(Error::from("无效的令牌格式"));
    }

    let encoded_header = parts[0];
    let encoded_payload = parts[1];
    let signature = parts[2];

    let signing_input = format!("{}.{}", encoded_header, encoded_payload);

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| Error::from("HMAC Key 初始化失败"))?;
    mac.update(signing_input.as_bytes());
    
    let expected_signature = BASE64_URL_SAFE_NO_PAD.encode(&mac.finalize().into_bytes());

    if signature != expected_signature {
        return Err(Error::from("签名验证失败"));
    }

    let payload_bytes = BASE64_URL_SAFE_NO_PAD
        .decode(encoded_payload.as_bytes())
        .map_err(|_| Error::from("Payload 解码失败"))?;
    
    let payload_str = String::from_utf8(payload_bytes)
        .map_err(|_| Error::from("Payload 非法 UTF-8 编码"))?;

    let claims: Claims = serde_json::from_str(&payload_str)?;

    // 检查是否过期
    let now = Date::now().as_millis() / 1000;
    if claims.exp < now {
        return Err(Error::from("登录令牌已过期"));
    }

    Ok(claims)
}

// 6. JWT 中间件级身份认证拦截
pub fn authenticate(req: &Request, secret: &str) -> Result<Claims> {
    let auth_header = match req.headers().get("Authorization")? {
        Some(val) => val,
        None => return Err(Error::from("未携带 Authorization 请求头")),
    };

    if !auth_header.starts_with("Bearer ") {
        return Err(Error::from("Authorization 格式错误，需为 Bearer <token>"));
    }

    let token = &auth_header[7..];
    verify_jwt(token, secret)
}
