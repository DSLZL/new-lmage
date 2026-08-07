pub mod core;
pub mod domain;
pub mod handlers;

use worker::*;

/// D1 初始化标记：每个 Worker isolate 只执行一次建表/迁移，
/// 避免每次请求都跑 10+ 次 D1 查询拖慢图片代理等热路径
static DB_INIT: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[event(fetch)]
pub async fn main(req: Request, env: Env, _ctx: worker::Context) -> Result<Response> {
    // 1. 跨域 OPTIONS 预检请求快速放行
    if req.method() == Method::Options {
        let headers = core::cors::apply_cors(Headers::new())?;
        return Ok(Response::empty()?.with_headers(headers));
    }

    // 2. ⚡ 零摩擦自愈：首次冷启动自动初始化数据库所有必需数据表（仅一次）
    let d1_db = env.d1("DB")?;
    if !DB_INIT.load(std::sync::atomic::Ordering::Relaxed) {
        if let Err(err) = domain::db::init_db(&d1_db).await {
            console_log!("D1 数据库自动初始化失败: {:?}", err);
        }
        DB_INIT.store(true, std::sync::atomic::Ordering::Relaxed);
    }

    let router = Router::new();

    router
        // 健康检查与版本状态
        .get("/api/health", |_, _| {
            let headers = core::cors::apply_cors(Headers::new())?;
            let res = Response::from_json(&serde_json::json!({
                "status": "ok",
                "version": "rust-clean-architecture-3.0.0",
                "timestamp": Date::now().as_millis(),
                "message": "TG-Image Rust + D1 Clean Architecture 运行正常！"
            }))?.with_headers(headers);
            Ok(res)
        })

        // ==================== 1. 文件流中转网关 ====================
        // 原图上传 (可选鉴权)
        .post_async("/upload", |req, ctx| async move {
            handlers::upload::upload(req, ctx.env).await
        })
        // 流式代理读取 (带 D1 回收站/管理员封禁状态边缘拦截、缩略图支持，图床外链自由访问)
        .get_async("/file/:filekey", |req, ctx| async move {
            let filekey = ctx.param("filekey").unwrap().to_string();
            handlers::file::proxy_file(req, ctx.env, filekey).await
        })

        // ==================== 2. 鉴权中心 ====================
        .post_async("/api/auth/register", |req, ctx| async move {
            handlers::auth::register(req, ctx.env).await
        })
        .post_async("/api/auth/login", |req, ctx| async move {
            handlers::auth::login(req, ctx.env).await
        })
        .get_async("/api/auth/user", |req, ctx| async move {
            handlers::auth::get_user(req, ctx.env).await
        })
        .put_async("/api/auth/profile", |req, ctx| async move {
            handlers::auth::update_profile(req, ctx.env).await
        })
        .put_async("/api/auth/password", |req, ctx| async move {
            handlers::auth::change_password(req, ctx.env).await
        })

        // ==================== 3. 图片管理 ====================
        .get_async("/api/images", |req, ctx| async move {
            handlers::image::get_user_images(req, ctx.env).await
        })
        .get_async("/api/images/search", |req, ctx| async move {
            handlers::image::search_user_images(req, ctx.env).await
        })
        // 批量永久删除（纯图床模式：删除即永久，无回收站概念）
        .post_async("/api/images/batch/delete", |req, ctx| async move {
            handlers::image::batch_permanent_delete(req, ctx.env).await
        })
        // 单张详情
        .get_async("/api/images/:imageid", |req, ctx| async move {
            let imageid = ctx.param("imageid").unwrap().to_string();
            handlers::image::get_image_detail(req, ctx.env, imageid).await
        })
        // 物理永久注销删除 (删除 TG 频道消息且抹除 D1 记录)
        .delete_async("/api/images/:imageid", |req, ctx| async move {
            let imageid = ctx.param("imageid").unwrap().to_string();
            handlers::file::delete_file(req, ctx.env, imageid).await
        })
        // 单张图片的全部标签（光箱联动展示与同步编辑）
        .get_async("/api/images/:imageid/tags", |req, ctx| async move {
            let imageid = ctx.param("imageid").unwrap().to_string();
            handlers::tag::get_image_tags(req, ctx.env, imageid).await
        })

        // ==================== 4. 相册模块 ====================
        .get_async("/api/albums", |req, ctx| async move {
            handlers::album::get_user_albums(req, ctx.env).await
        })
        .post_async("/api/albums", |req, ctx| async move {
            handlers::album::create_album(req, ctx.env).await
        })
        // 相册详情与内含图片拉取
        .get_async("/api/albums/:albumid", |req, ctx| async move {
            let albumid = ctx.param("albumid").unwrap().to_string();
            handlers::album::get_album_detail(req, ctx.env, albumid).await
        })
        // 批量向相册添加/移除图片
        .post_async("/api/albums/:albumid/images", |req, ctx| async move {
            let albumid = ctx.param("albumid").unwrap().to_string();
            handlers::album::modify_album_images(req, ctx.env, albumid).await
        })
        // 删除相册
        .delete_async("/api/albums/:albumid", |req, ctx| async move {
            let albumid = ctx.param("albumid").unwrap().to_string();
            handlers::album::delete_album(req, ctx.env, albumid).await
        })

        // ==================== 5. 标签模块 ====================
        .get_async("/api/tags", |req, ctx| async move {
            handlers::tag::get_user_tags(req, ctx.env).await
        })
        .post_async("/api/tags", |req, ctx| async move {
            handlers::tag::create_tag(req, ctx.env).await
        })
        // 批量打标
        .post_async("/api/images/batch/tag", |req, ctx| async move {
            handlers::tag::batch_tag_images(req, ctx.env).await
        })
        // 获取绑定了该标签的所有图片
        .get_async("/api/tags/:tagid/images", |req, ctx| async move {
            let tagid = ctx.param("tagid").unwrap().to_string();
            handlers::tag::get_tag_images(req, ctx.env, tagid).await
        })

        // ==================== 6. 统计面板 ====================
        .get_async("/api/stats", |req, ctx| async move {
            handlers::stats::get_user_stats(req, ctx.env).await
        })

        .run(req, env)
        .await
}
