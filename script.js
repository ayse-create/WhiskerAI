/* =========================================================
   WHISKER AI
   ========================================================= */

const STORAGE_KEY = "whiskerAI_chats";

let chats = [];
let currentChatId = null;
let isGenerating = false;


/* =========================================================
   ELEMENTLER
   ========================================================= */

const chatArea = document.getElementById("chatArea");
const messagesElement = document.getElementById("messages");
const welcomeElement = document.getElementById("welcome");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatList = document.getElementById("chatList");
const newChatButton = document.getElementById("newChat");
const headerNewChat = document.getElementById("headerNewChat");
const menuButton = document.getElementById("menuButton");
const closeSidebar = document.getElementById("closeSidebar");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");


/* =========================================================
   BAŞLAT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    loadChats();
    if (chats.length === 0) {
        createNewChat();
    } else {
        currentChatId = chats[0].id;
        renderChatList();
        renderCurrentChat();
    }
    setupEvents();
});


/* =========================================================
   STORAGE
   ========================================================= */

function loadChats() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            chats = JSON.parse(saved);
        }
    } catch (error) {
        console.error("Sohbetler yüklenemedi:", error);
        chats = [];
    }
}

function saveChats() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (error) {
        console.error("Sohbetler kaydedilemedi:", error);
    }
}


/* =========================================================
   YENİ SOHBET
   ========================================================= */

function createNewChat() {
    const chat = {
        id: Date.now() + "_" + Math.random().toString(36).slice(2),
        title: "Yeni sohbet",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    chats.unshift(chat);
    currentChatId = chat.id;
    saveChats();
    renderChatList();
    renderCurrentChat();
    closeMobileSidebar();
    setTimeout(() => messageInput.focus(), 100);
}


/* =========================================================
   AKTİF SOHBET
   ========================================================= */

function getCurrentChat() {
    return chats.find(chat => chat.id === currentChatId);
}


/* =========================================================
   SOHBET LİSTESİ
   ========================================================= */

function renderChatList() {
    chatList.innerHTML = "";
    chats.forEach(chat => {
        const item = document.createElement("div");
        item.className = "chat-item" + (chat.id === currentChatId ? " active" : "");
        item.innerHTML = `
            <span class="chat-item-icon">💬</span>
            <span class="chat-item-title">${escapeHTML(chat.title)}</span>
            <button class="delete-chat" data-delete="${chat.id}" aria-label="Sohbeti sil">×</button>
        `;
        item.addEventListener("click", event => {
            if (event.target.closest(".delete-chat")) return;
            currentChatId = chat.id;
            saveChats();
            renderChatList();
            renderCurrentChat();
            closeMobileSidebar();
        });
        const deleteButton = item.querySelector(".delete-chat");
        deleteButton.addEventListener("click", event => {
            event.stopPropagation();
            deleteChat(chat.id);
        });
        chatList.appendChild(item);
    });
}


/* =========================================================
   SOHBET SİL
   ========================================================= */

function deleteChat(id) {
    chats = chats.filter(chat => chat.id !== id);
    if (currentChatId === id) {
        if (chats.length > 0) {
            currentChatId = chats[0].id;
        } else {
            createNewChat();
            return;
        }
    }
    saveChats();
    renderChatList();
    renderCurrentChat();
}


/* =========================================================
   SOHBETİ GÖSTER
   ========================================================= */

function renderCurrentChat() {
    const chat = getCurrentChat();
    if (!chat) return;
    messagesElement.innerHTML = "";
    if (chat.messages.length === 0) {
        welcomeElement.style.display = "block";
    } else {
        welcomeElement.style.display = "none";
        chat.messages.forEach(message => {
            renderMessage(message.role, message.content, false);
        });
    }
    scrollToBottom();
}


/* =========================================================
   ⭐ MESAJ GÖSTER - DÜZELTİLDİ ⭐
   ========================================================= */

function renderMessage(role, content, animate = true) {
    const message = document.createElement("div");
    message.className = "message " + (role === "user" ? "user" : "ai");

    if (role === "user") {
        // KULLANICI MESAJI - SAĞDA, AVATAR YOK
        message.innerHTML = `
            <div class="message-content">
                <div class="message-wrapper">
                    <div class="message-bubble">${escapeHTML(content)}</div>
                </div>
            </div>
        `;
    } else {
        // AI MESAJI - SOLDA, AVATAR VAR
        message.innerHTML = `
            <div class="message-content">
                <div class="ai-avatar">
                    <img src="1.png" alt="Whisker AI">
                </div>
                <div class="message-wrapper">
                    <div class="message-bubble">${formatAIText(content)}</div>
                    <div class="message-actions">
                        <button class="copy-button">Kopyala</button>
                    </div>
                </div>
            </div>
        `;

        // KOPYALA BUTONU
        const copyButton = message.querySelector(".copy-button");
        copyButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(content);
                copyButton.textContent = "Kopyalandı ✓";
                setTimeout(() => {
                    copyButton.textContent = "Kopyala";
                }, 1500);
            } catch {
                copyButton.textContent = "Kopyalanamadı";
            }
        });
    }

    messagesElement.appendChild(message);
    if (!animate) message.style.animation = "none";
}


/* =========================================================
   MESAJ GÖNDER
   ========================================================= */

async function sendMessage(customText = null) {
    if (isGenerating) return;
    const message = customText !== null ? customText.trim() : messageInput.value.trim();
    if (!message) return;
    const chat = getCurrentChat();
    if (!chat) return;
    isGenerating = true;
    welcomeElement.style.display = "none";

    // KULLANICI MESAJI
    chat.messages.push({ role: "user", content: message, time: Date.now() });
    if (chat.title === "Yeni sohbet") {
        chat.title = createChatTitle(message);
    }
    chat.updatedAt = Date.now();
    saveChats();
    renderMessage("user", message);
    messageInput.value = "";
    autoResize();
    renderChatList();
    scrollToBottom();

    // TYPING
    const typing = createTypingIndicator();
    messagesElement.appendChild(typing);
    scrollToBottom();

    // CEVAP BEKLE
    await sleep(450 + Math.random() * 650);
    typing.remove();

    // AI CEVABI
    const answer = getAIResponse(message);
    renderMessage("ai", answer);
    chat.messages.push({ role: "assistant", content: answer, time: Date.now() });
    chat.updatedAt = Date.now();
    saveChats();
    isGenerating = false;
    scrollToBottom();
}


/* =========================================================
   AI CEVABI
   ========================================================= */

function getAIResponse(userMessage) {
    const normalized = normalizeText(userMessage);
    const casual = getCasualResponse(normalized);
    if (casual) return casual;
    if (typeof whiskerAIData === "undefined" || !Array.isArray(whiskerAIData)) {
        return "Whisker AI bilgi tabanına şu anda erişemiyor. 🐱";
    }
    const match = findBestMatch(userMessage);
    if (match) return match.output;
    return getFallbackResponse();
}


/* =========================================================
   EN UYGUN EŞLEŞME
   ========================================================= */

function findBestMatch(userMessage) {
    const userWords = getMeaningfulWords(normalizeText(userMessage));
    if (userWords.length === 0) return null;
    let bestItem = null;
    let bestScore = 0;
    for (const item of whiskerAIData) {
        if (!item || typeof item.instruction !== "string" || typeof item.output !== "string") continue;
        const instruction = normalizeText(item.instruction);
        const instructionWords = getMeaningfulWords(instruction);
        if (instructionWords.length === 0) continue;
        let matchedWords = 0;
        userWords.forEach(word => {
            if (instructionWords.includes(word)) matchedWords++;
        });
        let score = matchedWords / Math.max(userWords.length, instructionWords.length);
        if (instruction === normalizeText(userMessage)) score += 2;
        if (instruction.includes(normalizeText(userMessage))) score += 1;
        userWords.forEach(word => {
            if (word.length >= 5 && instruction.includes(word)) score += .08;
        });
        if (score > bestScore) {
            bestScore = score;
            bestItem = item;
        }
    }
    if (bestScore < .25) return null;
    return bestItem;
}


/* =========================================================
   GÜNLÜK SELAMLAŞMA
   ========================================================= */

function getCasualResponse(text) {
    const greetings = ["merhaba", "selam", "hey", "hello", "hi", "sa", "s a", "günaydın", "iyi sabahlar", "iyi akşamlar", "iyi geceler"];
    const howAreYou = ["nasılsın", "nasilsin", "iyi misin", "naber", "ne haber", "nasıl gidiyor", "nasıl gidiyo"];
    const thanks = ["teşekkürler", "teşekkür ederim", "sağ ol", "sag ol", "eyvallah", "çok teşekkürler"];
    const goodbye = ["görüşürüz", "gorusuruz", "hoşça kal", "hosca kal", "bay bay", "bye", "bb"];
    if (containsPhrase(text, greetings)) {
        if (text.includes("günaydın")) return "Günaydın! ☀️ Bugün sana nasıl yardımcı olabilirim?";
        if (text.includes("iyi akşamlar")) return "İyi akşamlar! 🌙 Nasıl yardımcı olabilirim?";
        if (text.includes("iyi geceler")) return "İyi geceler! 🌙 Umarım güzel bir gün geçirirsin.";
        return "Merhaba! 👋 Sana nasıl yardımcı olabilirim?";
    }
    if (containsPhrase(text, howAreYou)) {
        return "Gayet iyiyim! ✨ WhiskerHub hakkında konuşmaya hazırım. Sen nasılsın?";
    }
    if (containsPhrase(text, thanks)) {
        return "Rica ederim! ✨ Başka bir konuda yardıma ihtiyacın olursa buradayım.";
    }
    if (containsPhrase(text, goodbye)) {
        return "Görüşürüz! 👋 Tekrar beklerim.";
    }
    return null;
}


/* =========================================================
   BULAMADIĞINDA
   ========================================================= */

function getFallbackResponse() {
    const responses = [
        "Hmm, bunu bilgi tabanımda bulamadım. 🐱",
        "Bu konuda henüz bir bilgim yok gibi görünüyor. 🤔",
        "Bununla ilgili bilgi tabanında yeterli bir bilgi bulamadım.",
        "Bu soruyu henüz cevaplayamıyorum. Başka bir şekilde sormayı deneyebilirsin!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}


/* =========================================================
   TYPING
   ========================================================= */

function createTypingIndicator() {
    const message = document.createElement("div");
    message.className = "message ai";
    message.innerHTML = `
        <div class="message-content">
            <div class="ai-avatar">
                <img src="1.png" alt="Whisker AI">
            </div>
            <div class="message-wrapper">
                <div class="message-bubble">
                    <div class="typing">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>
    `;
    return message;
}


/* =========================================================
   SOHBET BAŞLIĞI
   ========================================================= */

function createChatTitle(message) {
    let title = message.replace(/\s+/g, " ").trim();
    if (title.length > 30) {
        title = title.substring(0, 30) + "...";
    }
    return title || "Yeni sohbet";
}


/* =========================================================
   NORMALIZE
   ========================================================= */

function normalizeText(text) {
    return text.toLocaleLowerCase("tr-TR")
        .replace(/[.,!?;:()[\]{}"'“”‘’]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


/* =========================================================
   ANLAMSIZ KELİMELER
   ========================================================= */

function getMeaningfulWords(text) {
    const stopWords = new Set([
        "bir", "bu", "şu", "ne", "nedir", "nasıl", "nasil",
        "mi", "mı", "mu", "mü", "ve", "ile", "için", "icin",
        "de", "da", "ben", "sen", "bana", "bunu", "hakkında",
        "hakkinda", "olan", "olarak", "şey", "şeyi", "şeyler"
    ]);
    return text.split(" ").filter(word => word.length > 1 && !stopWords.has(word));
}


/* =========================================================
   PHRASE
   ========================================================= */

function containsPhrase(text, phrases) {
    return phrases.some(phrase => {
        return text === phrase || text.includes(" " + phrase) || text.startsWith(phrase + " ");
    });
}


/* =========================================================
   HTML FORMAT
   ========================================================= */

function formatAIText(text) {
    return escapeHTML(text).replace(/\n/g, "<br>");
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: "smooth"
        });
    });
}


/* =========================================================
   BEKLE
   ========================================================= */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/* =========================================================
   TEXTAREA BOYUTU
   ========================================================= */

function autoResize() {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + "px";
}


/* =========================================================
   EVENTLER
   ========================================================= */

function setupEvents() {
    sendButton.addEventListener("click", () => sendMessage());
    messageInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    messageInput.addEventListener("input", autoResize);
    newChatButton.addEventListener("click", createNewChat);
    headerNewChat.addEventListener("click", createNewChat);
    document.querySelectorAll(".suggestion").forEach(button => {
        button.addEventListener("click", () => {
            sendMessage(button.dataset.message);
        });
    });
    menuButton.addEventListener("click", openMobileSidebar);
    closeSidebar.addEventListener("click", closeMobileSidebar);
    sidebarOverlay.addEventListener("click", closeMobileSidebar);
    messageInput.addEventListener("focus", () => {
        setTimeout(scrollToBottom, 250);
    });
}


/* =========================================================
   MOBİL SIDEBAR
   ========================================================= */

function openMobileSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("visible");
}

function closeMobileSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("visible");
}
