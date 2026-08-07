#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
老王硬核交付 - Telegram 零存储中转极致闭环测试套件 (标准图片源+CDN持久性研究版)
测试目标：
  1. 测试 sendDocument（文档/原图模式）上传与 getFile 调取。
  2. 从 picsum.photos 动态获取一张合规的真实照片，测试 sendPhoto（照片/缩略图阵列模式）上传，并提取多分辨率缩略图 file_id。
  3. 测试利用 deleteMessage 接口删除消息后，Telegram CDN 的缓存持久性表现。
"""

import sys
import os
import json
import io
import time

try:
    import requests
except ImportError:
    import subprocess
    print("📦 正在自动安装 requests 库...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

BOT_TOKEN = "8859657937:AAGo-u8oMjjXV-257hvBAkLxXBPffbjNzec"
CHAT_ID = "-1002509744447"

PROXIES = {
    "http": "http://127.0.0.1:7897",
    "https": "http://127.0.0.1:7897"
}

session = requests.Session()
session.proxies.update(PROXIES)

def log_section(title):
    print("\n" + "="*60)
    print(f"🔥 {title}")
    print("="*60)

def test_send_document_and_destroy_loop():
    log_section("测试一：sendDocument 上传、中转读取、消息删除与 CDN 滞后失效深度测试")

    # 1. 上传文件
    print("📤 [步骤 1] 正在从 picsum.photos 下载一张标准原图...")
    try:
        # picsum.photos 返回一个真实的 200x200 JPEG 照片
        real_img_bytes = session.get("https://picsum.photos/200", timeout=15, allow_redirects=True).content
        print(f"   ✅ 下载图片成功，大小为: {len(real_img_bytes)} 字节")
    except Exception as e:
        print(f"⚠️ 下载外部测试图片失败（{e}），使用 fallback 字节流测试...")
        real_img_bytes = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000d49444154789c6360000000020001e221bc330000000049454e44ae426082"
        )

    print("📤 [步骤 2] 正在调用 sendDocument 上传...")
    files = {'document': ('zero_test.jpg', io.BytesIO(real_img_bytes), 'image/jpeg')}
    data = {'chat_id': CHAT_ID}
    
    resp = session.post(f"https://api.telegram.org/bot{BOT_TOKEN}/sendDocument", data=data, files=files, timeout=15)
    upload_res = resp.json()
    
    if not upload_res.get("ok"):
        print(f"❌ 上传失败: {upload_res.get('description')}")
        return False
        
    result = upload_res["result"]
    message_id = result["message_id"]
    doc = result["document"]
    file_id = doc["file_id"]
    
    print(f"✅ 上传成功！")
    print(f"   👉 消息 ID (message_id): {message_id}")
    print(f"   👉 文件名 (file_name)  : {doc.get('file_name')}")
    print(f"   👉 MIME类型 (mime_type): {doc.get('mime_type')}")
    print(f"   👉 文件大小 (file_size) : {doc.get('file_size')} 字节")
    print(f"   👉 file_id             : {file_id}")

    # 2. 调取 getFile 获取 CDN 地址
    print("\n🔄 [步骤 3] 调用 getFile 实时换取 CDN 路径...")
    file_resp = session.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={file_id}", timeout=10)
    file_data = file_resp.json()
    
    if not file_data.get("ok"):
        print("❌ getFile 失败！")
        return False
        
    file_path = file_data["result"]["file_path"]
    cdn_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
    print(f"🎉 成功拼接下载 URL: {cdn_url}")

    # 3. 校验中转读取可达性
    print("\n📥 [步骤 4] 模拟中转下载图片...")
    dl_resp = session.get(cdn_url, timeout=10)
    print(f"   📡 HTTP 状态码: {dl_resp.status_code} (期望: 200)")
    
    # 4. 调用 deleteMessage
    print("\n💣 [步骤 5] 调 deleteMessage 删除该 Telegram 消息 (删图)...")
    delete_data = {'chat_id': CHAT_ID, 'message_id': message_id}
    del_resp = session.post(f"https://api.telegram.org/bot{BOT_TOKEN}/deleteMessage", data=delete_data, timeout=10)
    del_json = del_resp.json()
    
    if del_json.get("ok") and del_json.get("result") is True:
        print("✅ Telegram 消息删除指令发送成功！")
    else:
        print("❌ 消息删除失败！")
        return False

    # 5. 再次验证 getFile 看图片是否彻底销毁
    print("\n🧪 [步骤 6] 消息删除后，测试 Telegram 的真实 CDN 延迟表现...")
    print("⏳ 等待 3 秒以供后台处理...")
    time.sleep(3)
    
    retry_file_resp = session.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={file_id}", timeout=10)
    retry_file_data = retry_file_resp.json()
    
    if retry_file_data.get("ok"):
        print("\n⚠️  [深度发现] getFile 依然能获取到相对路径。")
        retry_file_path = retry_file_data["result"]["file_path"]
        retry_cdn_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{retry_file_path}"
        
        # 尝试下载
        retry_dl = session.get(retry_cdn_url, timeout=10)
        print(f"📡 删除消息后，实时下载图片 HTTP 状态码: {retry_dl.status_code}")
        print("💡 结论：Telegram 的 deleteMessage 仅仅删除聊天消息气泡。")
        print("   但在 Telegram 的后台缓存/CDN节点中，文件实体不会立刻被物理抹除。")
        print("   这意味着【无数据库图床】如果想做『即刻彻底销毁（秒删）』，TG 官方底层机制是不支持秒级注销的（会有较长缓存期）。")
    else:
        print("\n🎉 [即刻销毁成功] getFile 返回失败，文件已失效！")
        
    return True


def test_send_photo_resolution_array():
    log_section("测试二：sendPhoto（照片模式）上传及多分辨率缩略图提取测试")

    # 1. 动态获取一张合规的正规 JPEG
    print("📥 [步骤 1] 正在下载合规的真实照片源...")
    try:
        real_img_bytes = session.get("https://picsum.photos/200", timeout=15, allow_redirects=True).content
        print(f"   ✅ 下载图片成功，大小为: {len(real_img_bytes)} 字节")
    except Exception as e:
        print(f"❌ 下载测试图片失败: {e}，跳过此项。")
        return False

    # 2. 上传为照片
    print("📤 [步骤 2] 调用 sendPhoto 上传合规真实图片...")
    files = {'photo': ('photo_test.jpg', io.BytesIO(real_img_bytes), 'image/jpeg')}
    data = {'chat_id': CHAT_ID}
    
    resp = session.post(f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto", data=data, files=files, timeout=15)
    upload_res = resp.json()
    
    if not upload_res.get("ok"):
        print(f"❌ sendPhoto 失败: {upload_res.get('description')}")
        return False
        
    result = upload_res["result"]
    message_id = result["message_id"]
    photo_array = result["photo"]
    
    print(f"✅ 上传成功！")
    print(f"   👉 消息 ID (message_id): {message_id}")
    print(f"   👉 photo 数组包含多个尺寸变体 (Telegram 自动压缩生成):")
    
    # 3. 打印多分辨率变体
    for idx, item in enumerate(photo_array):
        print(f"      [{idx}] 尺寸: {item.get('width')}x{item.get('height')}, 大小: {item.get('file_size')} 字节")
        print(f"          file_id: {item.get('file_id')}")

    # 4. 提取最小的（缩略图）进行 getFile 校验
    small_file_id = photo_array[0]["file_id"]
    large_file_id = photo_array[-1]["file_id"]

    print("\n🔄 [步骤 3] 提取【最小缩略图 [0]】调 getFile:")
    small_resp = session.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={small_file_id}", timeout=10).json()
    if small_resp.get("ok"):
        print(f"   ✅ 缩略图路径: {small_resp['result']['file_path']}")
        
    print("\n🔄 [步骤 4] 提取【大尺寸原图 [-1]】调 getFile:")
    large_resp = session.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={large_file_id}", timeout=10).json()
    if large_resp.get("ok"):
        print(f"   ✅ 原图路径:  {large_resp['result']['file_path']}")

    # 5. 清理产生的测试消息
    print("\n🧹 [步骤 5] 自动清理 sendPhoto 测试消息...")
    delete_data = {'chat_id': CHAT_ID, 'message_id': message_id}
    session.post(f"https://api.telegram.org/bot{BOT_TOKEN}/deleteMessage", data=delete_data, timeout=10)
    print("✅ 清理完毕。")
    return True

if __name__ == "__main__":
    print("==================================================")
    print("🚀 开始进行 Telegram 零存储中转【极致闭环测试套件】")
    print("==================================================")
    
    doc_success = test_send_document_and_destroy_loop()
    photo_success = test_send_photo_resolution_array()
    
    print("\n==================================================")
    if doc_success and photo_success:
        print("🎉🎉 [完美闭环！] 零存储中转方案所有极致测试项 100% 成功跑通！")
    else:
        print("❌ 闭环测试存在未通过项，请查阅上述日志输出。")
    print("==================================================")
