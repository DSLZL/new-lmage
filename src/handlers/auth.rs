use crate::core::{cors, crypto};
use crate::domain::user::{self, ChangePasswordRequest, Claims, LoginRequest, RegisterRequest, UpdateProfileRequest, User};
use worker::*;

// 1. 用户注册
pub async fn register(mut req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let body: RegisterRequest = match req.json().await {
        Ok(b) => b,
        Err(_) => return Response::error("请求 JSON 格式非法", 400),
    };

    if body.username.trim().is_empty() || body.email.trim().is_empty() || body.password.len() < 6 {
        return Response::error("参数非法：用户名与邮箱不能为空，且密码至少6位", 400);
    }

    if user::get_by_username(&db, &body.username).await?.is_some() {
        return Response::error("用户名已存在", 409);
    }

    if user::get_by_email(&db, &body.email).await?.is_some() {
        return Response::error("邮箱已被注册", 409);
    }

    let salt = crypto::generate_salt();
    let hashed_password = crypto::hash_password(&body.password, &salt);

    let user_id = uuid::Uuid::new_v4().to_string();
    let now = Date::now().as_millis() as i64;

    let new_user = User {
        id: user_id.clone(),
        username: body.username.clone(),
        email: body.email.clone(),
        password_hash: hashed_password,
        avatar_url: None,
        bio: None,
        created_at: now,
        updated_at: now,
    };

    user::create(&db, &new_user).await?;

    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let exp = (Date::now().as_millis() / 1000) + (7 * 24 * 60 * 60);
    let claims = Claims {
        sub: user_id,
        username: body.username,
        exp,
    };

    let token = crypto::generate_jwt(&claims, &jwt_secret)?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let res = Response::from_json(&serde_json::json!({
        "message": "注册成功",
        "token": token,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "avatar_url": new_user.avatar_url,
            "bio": new_user.bio
        }
    }))?.with_headers(headers);

    Ok(res)
}

// 2. 用户登录
pub async fn login(mut req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let body: LoginRequest = match req.json().await {
        Ok(b) => b,
        Err(_) => return Response::error("请求 JSON 格式非法", 400),
    };

    let user = match user::get_by_username(&db, &body.username).await? {
        Some(u) => u,
        None => return Response::error("用户名或密码错误", 401),
    };

    if !crypto::verify_password(&body.password, &user.password_hash) {
        return Response::error("用户名或密码错误", 401);
    }

    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let exp = (Date::now().as_millis() / 1000) + (7 * 24 * 60 * 60);
    let claims = Claims {
        sub: user.id.clone(),
        username: user.username.clone(),
        exp,
    };

    let token = crypto::generate_jwt(&claims, &jwt_secret)?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let res = Response::from_json(&serde_json::json!({
        "message": "登录成功",
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "bio": user.bio
        }
    }))?.with_headers(headers);

    Ok(res)
}

// 3. 获取当前用户信息
pub async fn get_user(req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let u = match user::get_by_id(&db, &claims.sub).await? {
        Some(u) => u,
        None => return Response::error("用户已被物理删除", 404),
    };

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let res = Response::from_json(&serde_json::json!({
        "user": {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "avatar_url": u.avatar_url,
            "bio": u.bio
        }
    }))?.with_headers(headers);

    Ok(res)
}

// 4. 修改用户个人资料
pub async fn update_profile(mut req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let body: UpdateProfileRequest = match req.json().await {
        Ok(b) => b,
        Err(_) => return Response::error("请求 JSON 格式非法", 400),
    };

    let mut u = match user::get_by_id(&db, &claims.sub).await? {
        Some(u) => u,
        None => return Response::error("用户不存在", 404),
    };

    if let Some(ref new_uname) = body.username {
        if new_uname != &u.username {
            if user::get_by_username(&db, new_uname).await?.is_some() {
                return Response::error("该用户名已被占用", 409);
            }
            u.username = new_uname.clone();
        }
    }

    if let Some(ref new_email) = body.email {
        if new_email != &u.email {
            if user::get_by_email(&db, new_email).await?.is_some() {
                return Response::error("该邮箱已被绑定", 409);
            }
            u.email = new_email.clone();
        }
    }

    if let Some(ref bio) = body.bio {
        u.bio = Some(bio.clone());
    }

    if let Some(ref avatar) = body.avatar_url {
        u.avatar_url = Some(avatar.clone());
    }

    let now = Date::now().as_millis() as i64;
    user::update_profile(
        &db,
        &u.id,
        &u.username,
        &u.email,
        u.bio.as_deref(),
        u.avatar_url.as_deref(),
        now,
    )
    .await?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let res = Response::from_json(&serde_json::json!({
        "message": "个人资料更新成功",
        "user": {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "avatar_url": u.avatar_url,
            "bio": u.bio
        }
    }))?.with_headers(headers);

    Ok(res)
}

// 5. 修改密码
pub async fn change_password(mut req: Request, env: Env) -> Result<Response> {
    let db = env.d1("DB")?;
    let jwt_secret = env.var("JWT_SECRET")?.to_string();
    let claims = match crypto::authenticate(&req, &jwt_secret) {
        Ok(c) => c,
        Err(err) => return Response::error(err.to_string(), 401),
    };

    let body: ChangePasswordRequest = match req.json().await {
        Ok(b) => b,
        Err(_) => return Response::error("请求 JSON 格式非法", 400),
    };

    let u = match user::get_by_id(&db, &claims.sub).await? {
        Some(u) => u,
        None => return Response::error("用户不存在", 404),
    };

    if !crypto::verify_password(&body.current_password, &u.password_hash) {
        return Response::error("当前密码不正确", 401);
    }

    let salt = crypto::generate_salt();
    let new_password_hash = crypto::hash_password(&body.new_password, &salt);
    let now = Date::now().as_millis() as i64;

    user::update_password(&db, &u.id, &new_password_hash, now).await?;

    let mut headers = cors::apply_cors(Headers::new())?;
    headers.set("Content-Type", "application/json")?;

    let res = Response::from_json(&serde_json::json!({
        "message": "密码修改成功，请用新密码重新登录！"
    }))?.with_headers(headers);

    Ok(res)
}
