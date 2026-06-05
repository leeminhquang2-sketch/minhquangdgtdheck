const crypto = require('crypto');
const axios = require('axios');
const readline = require('readline');

const GAME_IP = "211.253.26.47";
const GAME_PORT = "8093";
const KEY_AES2 = "gksekfidjrqjfwk1";
const IV_AES2 = "towerdefense_amo";

const SERVERS = {
    "1": { name: "AMO", display: "AMO (Mobile)" },
    "2": { name: "ATV", display: "ATV (Android TV)" }
};

const SOUL_LIST = {
    "1": { id: "SOUL_1", name: "Loki" },
    "2": { id: "SOUL_2", name: "Gibongi" },
    "3": { id: "SOUL_3", name: "Hell Knight" },
    "4": { id: "SOUL_4", name: "Nan-cheon" },
    "5": { id: "SOUL_5", name: "Dalma" },
    "6": { id: "SOUL_6", name: "Muk-hyang" },
    "7": { id: "SOUL_7", name: "Wolf King" },
    "8": { id: "SOUL_8", name: "Jormungand" }
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise(resolve => rl.question(q, resolve));

function encryptAES2(data) {
    try {
        const cipher = crypto.createCipheriv("aes-128-cbc", KEY_AES2, IV_AES2);
        let encrypted = cipher.update(JSON.stringify(data), "utf8", "base64");
        encrypted += cipher.final("base64");
        return encrypted;
    } catch (e) { return null; }
}

function decryptAES2(cipherText) {
    try {
        const decipher = crypto.createDecipheriv("aes-128-cbc", KEY_AES2, IV_AES2);
        let decrypted = decipher.update(cipherText, "base64", "utf8");
        decrypted += decipher.final("utf8");
        return JSON.parse(decrypted.replace(/[\x00-\x1F\x7F-\x9F]/g, ""));
    } catch (e) { return null; }
}

async function sendRequest(url, data, isATV = false) {
    try {
        const postData = `DATA=${encodeURIComponent(data)}`;
        const headers = {
            'User-Agent': isATV ? 'busidol.atv.tower' : 'busidol.mobile.tower',
            'X-Requested-With': isATV ? 'busidol.atv.tower' : 'busidol.mobile.tower',
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        const response = await axios.post(url, postData, { headers, timeout: 30000 });
        return response.data;
    } catch (e) { return null; }
}

async function getUserData(uniq_id, host_id, isATV = false) {
    const url = isATV 
        ? `http://${GAME_IP}:${GAME_PORT}/TOWERDEFENCE_ATV/get_user_data_all_AES2.php`
        : `http://${GAME_IP}:${GAME_PORT}/TOWERDEFENCE_AMO/get_user_data_all_AES2.php`;
    
    const payload = {
        "UNIQ_ID": uniq_id,
        "HOST_ID": host_id,
        "MOBILE_CONNECT": "",
        "ANDROID_AD": "",
        "GICHAPO": isATV ? "선택된서버:한국서버 ping:205ms" : "선택된서버:베트남서버 ping:67ms",
        "LOCAL_KEY": null
    };
    if (isATV) payload.MODEL_NAME = "BeyondTV";
    
    const encrypted = encryptAES2(payload);
    if (!encrypted) return null;
    const response = await sendRequest(url, encrypted, isATV);
    if (!response) return null;
    const decrypted = decryptAES2(response);
    if (!decrypted) return null;
    
    let gichapo = decrypted.gichapo || decrypted.VALUE?.gichapo || decrypted.VALUE?.etc?.value?.gichapo;
    return {
        gichapo: gichapo,
        userName: decrypted.VALUE?.normal?.value?.USER_NAME || "",
        userLevel: decrypted.VALUE?.normal?.value?.SO_CODE || 0,
        runCount: decrypted.VALUE?.etc?.value?.run_count || 0,
        souls: decrypted.VALUE?.soul || {}
    };
}

async function addSoul(uniq_id, host_id, platform, soul_id, amount, run_count, comment, gichapo, isATV = false) {
    const url = isATV
        ? `http://${GAME_IP}:${GAME_PORT}/TOWERDEFENCE_ATV/put_myths_data_AES2.php`
        : `http://${GAME_IP}:${GAME_PORT}/TOWERDEFENCE_AMO/put_myths_data_AES2.php`;
    
    const payload = {
        "UNIQ_ID": uniq_id,
        "HOST_ID": host_id,
        "PLATFORM": platform,
        "HERO": soul_id,
        "QUEST": "0:0,0:0,0:0,0:0,0:0,0:0,0:0,0:0,0:0",
        "REWARD": "200000000:200000000:000000000",
        "FLOOR": 2,
        "PASS": "2000-01-01 00:00:00",
        "MAX_CLEAR": 0,
        "MAX_FIRST_CLEAR": 0,
        "SOUL": amount,
        "WHAT": ["SOUL"],
        "VALUE": { "SOUL": { [soul_id]: amount } },
        "RUN_COUNT": run_count,
        "COMMENT": comment,
        "MOBILE_CONNECT": "",
        "GICHAPO": gichapo
    };
    
    const encrypted = encryptAES2(payload);
    if (!encrypted) return null;
    const response = await sendRequest(url, encrypted, isATV);
    if (!response) return null;
    
    try {
        const decipher = crypto.createDecipheriv("aes-128-cbc", KEY_AES2, IV_AES2);
        let decrypted = decipher.update(response, "base64", "utf8");
        decrypted += decipher.final("utf8");
        return JSON.parse(decrypted.replace(/[\x00-\x1F\x7F-\x9F]/g, ""));
    } catch (e) {
        return { RESULT: "ERROR", VALUE: e.message };
    }
}

function formatNumber(num) {
    return num.toLocaleString('vi-VN');
}

async function main() {
    console.clear();
    console.log("╔════════════════════════════════════╗");
    console.log("║        SOUL HACK BOT              ║");
    console.log("╚════════════════════════════════════╝");
    console.log("\n⚠️  CẦN VPN HÀN QUỐC ĐỂ HOẠT ĐỘNG!\n");
    
    while (true) {
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📜 CHỌN CHỨC NĂNG:");
        console.log("1. Xem thông tin tài khoản");
        console.log("2. Thêm Soul");
        console.log("3. Danh sách Soul");
        console.log("4. Danh sách Server");
        console.log("0. Thoát");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        const choice = await question("👉 Nhập số: ");
        
        if (choice === "0") {
            console.log("👋 Tạm biệt!");
            rl.close();
            break;
        }
        
        if (choice === "1") {
            const uniq = await question("🆔 UNIQ_ID: ");
            const host = await question("📧 HOST_ID: ") || "gibongtran@gmail.com";
            const sv = await question("🖥️ Server (1=AMO, 2=ATV): ");
            
            console.log("🔄 Đang lấy thông tin...");
            const data = await getUserData(uniq, host, sv === "2");
            
            if (!data?.gichapo) {
                console.log("❌ Không tìm thấy! Kiểm tra UNIQ_ID/HOST_ID và VPN Hàn Quốc!");
            } else {
                console.log("\n✅ THÔNG TIN TÀI KHOẢN");
                console.log(`👤 Username: ${data.userName || 'Không có'}`);
                console.log(`📊 Level: ${data.userLevel}`);
                console.log(`🔄 Run Count: ${data.runCount}`);
                console.log(`🔑 GICHAPO: ${data.gichapo}`);
                console.log("\n💎 SOUL HIỆN TẠI:");
                for (const [k, soul] of Object.entries(SOUL_LIST)) {
                    const amount = data.souls[soul.id] || 0;
                    console.log(`  ${k}. ${soul.name}: ${formatNumber(amount)}`);
                }
            }
        }
        
        if (choice === "2") {
            const sv = await question("🖥️ Server (1=AMO, 2=ATV): ");
            const isATV = (sv === "2");
            const uniq = await question("🆔 UNIQ_ID: ");
            const host = await question("📧 HOST_ID: ");
            const soulChoice = await question("💎 Chọn Soul (1-8): ");
            const amount = parseInt(await question("🔢 Số lượng: "));
            
            if (!SOUL_LIST[soulChoice]) {
                console.log("❌ Soul không hợp lệ!");
                continue;
            }
            
            console.log("🔄 Đang lấy thông tin...");
            const userInfo = await getUserData(uniq, host, isATV);
            
            if (!userInfo?.gichapo) {
                console.log("❌ Không thể lấy thông tin!");
                continue;
            }
            
            let newRunCount = userInfo.runCount - 1;
            if (newRunCount < 0) newRunCount = 0;
            
            const comment = `${SOUL_LIST[soulChoice].id} 영혼석 우편함 수령 ${amount}`;
            
            console.log("\n🔔 XÁC NHẬN:");
            console.log(`  Server: ${SERVERS[sv].display}`);
            console.log(`  Soul: ${SOUL_LIST[soulChoice].name}`);
            console.log(`  Số lượng: ${formatNumber(amount)}`);
            console.log(`  Run Count: ${newRunCount}`);
            
            const confirm = await question("\n✅ Xác nhận? (yes/no): ");
            
            if (confirm.toLowerCase() === 'yes') {
                console.log("🚀 Đang thêm soul...");
                const result = await addSoul(
                    uniq, host, isATV ? 'ATV' : 'AMO',
                    SOUL_LIST[soulChoice].id, amount, newRunCount, comment,
                    userInfo.gichapo, isATV
                );
                
                if (!result) {
                    console.log("❌ LỖI! Cần VPN Hàn Quốc!");
                } else if (result.RESULT === 'OK') {
                    const newAmount = result.VALUE?.SOUL?.[SOUL_LIST[soulChoice].id] || '?';
                    console.log(`✅✅ THÀNH CÔNG!`);
                    console.log(`  Đã thêm: ${formatNumber(amount)}`);
                    console.log(`  Tổng: ${formatNumber(newAmount)}`);
                } else {
                    console.log(`❌ THẤT BẠI!\n  Lỗi: ${result.VALUE || 'Không rõ'}`);
                }
            } else {
                console.log("✅ Đã hủy!");
            }
        }
        
        if (choice === "3") {
            console.log("\n💎 DANH SÁCH SOUL:");
            for (const [k, soul] of Object.entries(SOUL_LIST)) {
                console.log(`  ${k}. ${soul.name} (${soul.id})`);
            }
        }
        
        if (choice === "4") {
            console.log("\n🖥️ DANH SÁCH SERVER:");
            console.log("  1. AMO (Mobile)");
            console.log("  2. ATV (Android TV)");
        }
        
        console.log("\n");
    }
}

main().catch(console.error);
