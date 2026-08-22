/* =========================================================
   WHISKER AI
   Interface + Chat System
   Data source: whisker_ai_data.js
   ========================================================= */

const STORAGE_KEY = "whiskerAI_chats";

let chats = [];
let currentChatId = null;
let isGenerating = false;


/* =========================================================
   ELEMENTS
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
   INITIALIZATION
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
   CHAT STORAGE
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

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(chats)
        );

    } catch (error) {

        console.error("Sohbetler kaydedilemedi:", error);

    }

}


/* =========================================================
   CREATE CHAT
   ========================================================= */

function createNewChat() {

    const chat = {

        id:
            Date.now().toString() +
            Math.random().toString(36).slice(2),

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

    setTimeout(() => {
        messageInput.focus();
    }, 100);

}


/* =========================================================
   GET CURRENT CHAT
   ========================================================= */

function getCurrentChat() {

    return chats.find(
        chat => chat.id === currentChatId
    );

}


/* =========================================================
   RENDER CHAT LIST
   ========================================================= */

function renderChatList() {

    chatList.innerHTML = "";

    if (chats.length === 0) {

        chatList.innerHTML = `
            <div style="
                padding: 15px 10px;
                color: #89999a;
                font-size: 11px;
            ">
                Henüz sohbet yok.
            </div>
        `;

        return;
    }

    chats.forEach(chat => {

        const item = document.createElement("div");

        item.className =
            "chat-item" +
            (chat.id === currentChatId ? " active" : "");

        item.innerHTML = `
            <span class="chat-item-icon">💬</span>

            <span class="chat-item-title">
                ${escapeHTML(chat.title)}
            </span>

            <button
                class="delete-chat"
                title="Sohbeti sil"
                data-delete="${chat.id}"
            >
                ×
            </button>
        `;

        item.addEventListener("click", event => {

            if (
                event.target.closest(".delete-chat")
            ) {
                return;
            }

            currentChatId = chat.id;

            saveChats();

            renderChatList();
            renderCurrentChat();

            closeMobileSidebar();

        });

        const deleteButton =
            item.querySelector(".delete-chat");

        deleteButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                deleteChat(chat.id);

            }
        );

        chatList.appendChild(item);

    });

}


/* =========================================================
   DELETE CHAT
   ========================================================= */

function deleteChat(id) {

    chats = chats.filter(
        chat => chat.id !== id
    );

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
   RENDER CURRENT CHAT
   ========================================================= */

function renderCurrentChat() {

    const chat = getCurrentChat();

    if (!chat) {
        return;
    }

    messagesElement.innerHTML = "";

    if (chat.messages.length === 0) {

        welcomeElement.style.display = "block";

    } else {

        welcomeElement.style.display = "none";

        chat.messages.forEach(message => {

            renderMessage(
                message.role,
                message.content,
                false
            );

        });

    }

    scrollToBottom();

}


/* =========================================================
   RENDER MESSAGE
   ========================================================= */

function renderMessage(
    role,
    content,
    animate = true
) {

    const message = document.createElement("div");

    message.className =
        "message " +
        (role === "user" ? "user" : "ai");

    if (role === "user") {

        message.innerHTML = `
            <div class="message-content">
                <div>
                    <div class="message-bubble">
                        ${escapeHTML(content)}
                    </div>
                </div>
            </div>
        `;

    } else {

        message.innerHTML = `
            <div class="message-content">

                <div class="ai-avatar">
                    🐱
                </div>

                <div>

                    <div class="message-bubble">
                        ${formatAIText(content)}
                    </div>

                    <div class="message-actions">
                        <button class="copy-button">
                            Kopyala
                        </button>
                    </div>

                </div>

            </div>
        `;

        const copyButton =
            message.querySelector(".copy-button");

        copyButton.addEventListener(
            "click",
            () => {

                navigator.clipboard.writeText(content);

                copyButton.textContent = "Kopyalandı ✓";

                setTimeout(() => {
                    copyButton.textContent = "Kopyala";
                }, 1500);

            }
        );

    }

    messagesElement.appendChild(message);

    if (!animate) {
        message.style.animation = "none";
    }

}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage(text = null) {

    if (isGenerating) {
        return;
    }

    const message =
        text !== null
            ? text.trim()
            : messageInput.value.trim();

    if (!message) {
        return;
    }

    const chat = getCurrentChat();

    if (!chat) {
        return;
    }

    isGenerating = true;

    welcomeElement.style.display = "none";

    /* USER MESSAGE */

    chat.messages.push({
        role: "user",
        content: message,
        time: Date.now()
    });

    if (
        chat.title === "Yeni sohbet"
    ) {

        chat.title = createChatTitle(message);

    }

    chat.updatedAt = Date.now();

    saveChats();

    renderMessage("user", message);

    messageInput.value = "";
    autoResize();

    renderChatList();

    scrollToBottom();


    /* TYPING */

    const typingElement =
        createTypingIndicator();

    messagesElement.appendChild(
        typingElement
    );

    scrollToBottom();


    /* AI RESPONSE */

    const delay =
        500 +
        Math.random() * 700;

    await sleep(delay);

    typingElement.remove();

    const answer =
        getAIResponse(message);

    renderMessage(
        "ai",
        answer
    );

    chat.messages.push({
        role: "assistant",
        content: answer,
        time: Date.now()
    });

    chat.updatedAt = Date.now();

    saveChats();

    isGenerating = false;

    scrollToBottom();

}


/* =========================================================
   AI RESPONSE
   ========================================================= */

function getAIResponse(userMessage) {

    const normalized =
        normalizeText(userMessage);


    /* -----------------------------------------
       DAILY / CASUAL CONVERSATION
       ----------------------------------------- */

    const casualResponse =
        getCasualResponse(normalized);

    if (casualResponse) {
        return casualResponse;
    }


    /* -----------------------------------------
       DATASET SEARCH
       ----------------------------------------- */

    if (
        typeof whiskerAIData === "undefined" ||
        !Array.isArray(whiskerAIData)
    ) {

        console.error(
            "whiskerAIData bulunamadı."
        );

        return "Üzgünüm 🐱 Bilgi tabanına şu anda erişemiyorum.";

    }


    const result =
        findBestMatch(userMessage);


    if (result) {

        return result.output;

    }


    /* -----------------------------------------
       FALLBACK
       ----------------------------------------- */

    return getFallbackResponse();

}


/* =========================================================
   BEST MATCH
   ========================================================= */

function findBestMatch(userMessage) {

    const userWords =
        getMeaningfulWords(
            normalizeText(userMessage)
        );

    if (userWords.length === 0) {
        return null;
    }

    let bestItem = null;
    let bestScore = 0;

    for (
        const item of whiskerAIData
    ) {

        if (
            !item ||
            typeof item.instruction !== "string" ||
            typeof item.output !== "string"
        ) {
            continue;
        }

        const instruction =
            normalizeText(
                item.instruction
            );

        const instructionWords =
            getMeaningfulWords(
                instruction
            );

        if (
            instructionWords.length === 0
        ) {
            continue;
        }


        /* WORD MATCH */

        let matchedWords = 0;

        userWords.forEach(word => {

            if (
                instructionWords.includes(word)
            ) {
                matchedWords++;
            }

        });


        let score =
            matchedWords /
            Math.max(
                userWords.length,
                instructionWords.length
            );


        /* EXACT PHRASE */

        if (
            instruction.includes(
                normalizeText(userMessage)
            )
        ) {

            score += 1;

        }


        /* IMPORTANT WORDS */

        userWords.forEach(word => {

            if (
                word.length >= 5 &&
                instruction.includes(word)
            ) {

                score += 0.08;

            }

        });


        if (score > bestScore) {

            bestScore = score;

            bestItem = item;

        }

    }


    /*
       Minimum threshold.

       Böylece tamamen alakasız soruların
       rastgele bir cevaba eşleşmesi önlenir.
    */

    if (bestScore < 0.25) {
        return null;
    }

    return bestItem;

}


/* =========================================================
   CASUAL RESPONSES
   ========================================================= */

function getCasualResponse(text) {

    const greetings = [
        "merhaba",
        "selam",
        "hey",
        "hello",
        "hi",
        "sa",
        "s.a",
        "günaydın",
        "iyi sabahlar",
        "iyi akşamlar",
        "iyi geceler"
    ];

    const howAreYou = [
        "nasılsın",
        "nasilsin",
        "iyi misin",
        "naber",
        "ne haber",
        "nasıl gidiyor",
        "nasıl gidiyo"
    ];

    const thanks = [
        "teşekkürler",
        "teşekkür ederim",
        "sağ ol",
        "sag ol",
        "eyvallah",
        "çok teşekkürler"
    ];

    const goodbye = [
        "görüşürüz",
        "gorusuruz",
        "hoşça kal",
        "hosca kal",
        "bay bay",
        "bye",
        "bb"
    ];

    if (
        containsPhrase(text, greetings)
    ) {

        if (
            text.includes("günaydın") ||
            text.includes("iyi sabahlar")
        ) {
            return "Günaydın! ☀️🐱 Bugün WhiskerHub'da neler keşfedeceğiz?";
        }

        if (
            text.includes("iyi akşamlar")
        ) {
            return "İyi akşamlar! 🌙🐱 Nasıl yardımcı olabilirim?";
        }

        if (
            text.includes("iyi geceler")
        ) {
            return "İyi geceler! 🌙🐱 Umarım güzel bir gün geçirmişsindir.";
        }

        return "Merhaba! 🐱✨ Sana nasıl yardımcı olabilirim?";

    }


    if (
        containsPhrase(text, howAreYou)
    ) {

        return "Gayet iyiyim! 😺✨ WhiskerHub hakkında konuşmaya hazırım. Sen nasılsın?";

    }


    if (
        containsPhrase(text, thanks)
    ) {

        return "Rica ederim! 🐱💚 Başka bir konuda yardıma ihtiyacın olursa buradayım.";

    }


    if (
        containsPhrase(text, goodbye)
    ) {

        return "Görüşürüz! 👋🐱 WhiskerHub'da tekrar beklerim.";

    }


    return null;

}


/* =========================================================
   FALLBACK
   ========================================================= */

function getFallbackResponse() {

    const responses = [

        "Hmm, bunu bilgi tabanımda bulamadım. 🐱",

        "Bu konuda henüz bilgim yok gibi görünüyor. 🤔🐱",

        "Bununla ilgili Whisker AI bilgi tabanında yeterli bir bilgi bulamadım. 🐱",

        "Bu soruyu henüz cevaplayamıyorum. Başka bir şekilde sormayı deneyebilirsin! 💡"

    ];

    return responses[
        Math.floor(
            Math.random() *
            responses.length
        )
    ];

}


/* =========================================================
   TYPING INDICATOR
   ========================================================= */

function createTypingIndicator() {

    const message =
        document.createElement("div");

    message.className = "message ai";

    message.innerHTML = `
        <div class="message-content">

            <div class="ai-avatar">
                🐱
            </div>

            <div class="message-bubble">

                <div class="typing">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>

            </div>

        </div>
    `;

    return message;

}


/* =========================================================
   CHAT TITLE
   ========================================================= */

function createChatTitle(message) {

    let title =
        message
            .replace(/\s+/g, " ")
            .trim();

    if (title.length > 30) {

        title =
            title.substring(0, 30) +
            "...";

    }

    return title || "Yeni sohbet";

}


/* =========================================================
   TEXT NORMALIZATION
   ========================================================= */

function normalizeText(text) {

    return text
        .toLocaleLowerCase("tr-TR")
        .replace(/[.,!?;:()[\]{}"'“”‘’]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


function getMeaningfulWords(text) {

    const stopWords = new Set([

        "bir",
        "bu",
        "şu",
        "ne",
        "nedir",
        "nasıl",
        "nasil",
        "mi",
        "mı",
        "mu",
        "mü",
        "ve",
        "ile",
        "için",
        "icin",
        "de",
        "da",
        "ben",
        "sen",
        "bana",
        "bunu",
        "hakkında",
        "hakkinda",
        "olan",
        "olarak",
        "the",
        "a",
        "an",
        "is",
        "what",
        "how"
    ]);

    return text
        .split(" ")
        .filter(
            word =>
                word.length > 1 &&
                !stopWords.has(word)
        );

}


/* =========================================================
   PHRASE CHECK
   ========================================================= */

function containsPhrase(
    text,
    phrases
) {

    return phrases.some(
        phrase =>
            text === phrase ||
            text.includes(
                " " + phrase
            ) ||
            text.startsWith(
                phrase + " "
            )
    );

}


/* =========================================================
   FORMAT AI TEXT
   ========================================================= */

function formatAIText(text) {

    return escapeHTML(text)
        .replace(
            /\n/g,
            "<br>"
        );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

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
   SLEEP
   ========================================================= */

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(resolve, ms)
    );

}


/* =========================================================
   TEXTAREA AUTO RESIZE
   ========================================================= */

function autoResize() {

    messageInput.style.height = "auto";

    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            150
        ) + "px";

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    /* SEND */

    sendButton.addEventListener(
        "click",
        () => sendMessage()
    );


    /* ENTER */

    messageInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );


    /* RESIZE */

    messageInput.addEventListener(
        "input",
        autoResize
    );


    /* NEW CHAT */

    newChatButton.addEventListener(
        "click",
        createNewChat
    );

    headerNewChat.addEventListener(
        "click",
        createNewChat
    );


    /* SUGGESTIONS */

    document
        .querySelectorAll(".suggestion")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    sendMessage(
                        button.dataset.message
                    );

                }
            );

        });


    /* MOBILE SIDEBAR */

    menuButton.addEventListener(
        "click",
        openMobileSidebar
    );

    closeSidebar.addEventListener(
        "click",
        closeMobileSidebar
    );

    sidebarOverlay.addEventListener(
        "click",
        closeMobileSidebar
    );

}


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

function openMobileSidebar() {

    sidebar.classList.add("open");

    sidebarOverlay.classList.add(
        "visible"
    );

}


function closeMobileSidebar() {

    sidebar.classList.remove("open");

    sidebarOverlay.classList.remove(
        "visible"
    );

}
