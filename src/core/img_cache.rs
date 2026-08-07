use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use crate::domain::image::Image;
use worker::*;

/// 图片行内存缓存（Worker isolate 级）
///
/// 背景：图片访问路径（/file/:filekey）每次请求都需串行查询 D1
/// 做封禁/回收站状态校验（校验必须先于缓存，防绕过），
/// 热图高频访问下查询次数爆炸（生产实测 24h 读查询 3460 次）。
///
/// 策略：30 秒 TTL 内存缓存吸收热路径；删除 / 移入回收站等写操作
/// 主动失效对应条目（即时生效），其余状态变化最长 30 秒最终一致。
struct ImageCache {
    map: Mutex<HashMap<String, (Image, i64)>>,
}

static IMAGE_CACHE: OnceLock<ImageCache> = OnceLock::new();

const TTL_MS: i64 = 30_000;

fn cache() -> &'static ImageCache {
    IMAGE_CACHE.get_or_init(|| ImageCache {
        map: Mutex::new(HashMap::new()),
    })
}

/// 命中且未过期则返回图片行（克隆，避免持锁）
pub fn get(id: &str) -> Option<Image> {
    let now = Date::now().as_millis() as i64;
    let guard = cache().map.lock().ok()?;
    if let Some((img, ts)) = guard.get(id) {
        if now - *ts < TTL_MS {
            return Some(img.clone());
        }
    }
    None
}

/// 写入缓存（TTL 滑动窗口）
pub fn set(id: &str, img: &Image) {
    if let Ok(mut guard) = cache().map.lock() {
        guard.insert(id.to_string(), (img.clone(), Date::now().as_millis() as i64));
    }
}

/// 主动失效（物理删除 / 移入回收站后调用，保证即时生效）
pub fn invalidate(id: &str) {
    if let Ok(mut guard) = cache().map.lock() {
        guard.remove(id);
    }
}
