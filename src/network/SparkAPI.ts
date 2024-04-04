import {nanoid} from 'nanoid'
import CryptoJS from 'crypto-js'


export interface ResponseChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }

export interface RequestChatParameters {
    temperature?: number;   // [0-1], default: 0.5
    max_tokens?: number;    // [1-8192], default: 2048, PS: v1.5 up to 4096
    top_k?: 1 | 2 | 3 | 4 | 5;  // [1-6], default 4
}


interface RequestTypes {
    header: { app_id: string; uid: string; };
    parameter: { chat: {domain: string; chat_id?: string} & RequestChatParameters; };
    payload: { message: { text: ResponseChatMessage[] } };
}

interface ResponseTypes {
    header: {
        code: number;
        message: string;
        sid: string;
        status: number;
    };
    payload: {
        choices: {
            status: number;
            seq: number;
            text: ResponseChatMessage[];
        };
        usage?: {
            text: {
                question_tokens: number;
                prompt_tokens: number;
                completion_tokens: number;
                total_tokens: number;
            }
        };
    };
}


/**
 * Generates an authenticated URL for XunFei Spark LLM WebSocket Protocol. \
 * https://www.xfyun.cn/doc/spark/general_url_authentication.html
 *
 * @param {string} apiKey - The API key for authentication.
 * @param {string} apiSecret - The API secret key used to generate the HMAC signature.
 * @param {string} [wssURL ='wss://spark-api.xf-yun.com/v3.5/chat'] - The WebSocket Secure endpoint URL.
 * @returns {Promise<string>} - Authenticated WebSocket Secure URL with query parameters.
 */
function generateWebsocketUrl(apiKey: string, apiSecret: string,
                              wssURL: string = "wss://spark-api.xf-yun.com/v3.5/chat" ): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const dateRFC1123 = new Date().toUTCString();
            const url = new URL(wssURL);
            const wss_url: string = `wss://${url.host}${url.pathname}`

            // 使用CryptoJS生成签名
            const signatureOrigin: string = `host: ${location.host}\ndate: ${dateRFC1123}\nGET ${url.pathname} HTTP/1.1`;
            const signatureSha: CryptoJS.lib.WordArray = CryptoJS.HmacSHA256(signatureOrigin, apiSecret);
            const signature: string = CryptoJS.enc.Base64.stringify(signatureSha)

            // 授权头
            const algorithm: string = 'hmac-sha256'
            const headers: string = 'host date request-line'
            const authorizationOrigin: string = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
            const authorization: string = btoa(authorizationOrigin)

            // 设置URL查询参数
            const target_url: string = `${wss_url}?authorization=${authorization}&date=${dateRFC1123}&host=${location.host}`
            console.debug("WSS url: ", target_url)

            resolve(target_url)
        } catch (error) {
            reject(error)
        }
    })
}


export class TTSRecorder {
    // API
    private readonly APPID: string;
    private readonly APISecret: string;
    private readonly APIKey: string;
    // private Domain: string;    // 变更则重生成 TTSRecorder
    // private WssURL: string;    // 变更则重生成 TTSRecorder

    // Chat Info
    private readonly userID: string;     // 刷新对话后于类外部重生成
    private result: string = "";
    private status: 'init' | 'ttsing' | 'endPlay' | 'errorTTS' = "init";    // 外部读取 status 值以获取对话状态
    private Socket: WebSocket = new WebSocket("wss://baidu.com");
    onMessage?: (message: string) => void;
    onFinish?: (totalResult: string) => void;

    constructor(APPID: string, APISecret: string, APIKey: string, userID?: string) {
        // API
        this.APPID = APPID;
        this.APISecret = APISecret;
        this.APIKey = APIKey;

        // Chat
        this.userID = userID || nanoid()
    }

    private getDomain(wssURL: string): string {
        const url = new URL(wssURL);
        switch (url.pathname) {
            case "/v1.1/chat":
                return "general";
            case "/v2.1/chat":
                return "generalv2";
            case "/v3.1/chat":
                return "generalv3";
            case "/v3.5/chat":
                return "generalv3.5";
        }
        return "generalv3.5";
    }

    private generateMessages(conversations: ResponseChatMessage[]): ResponseChatMessage[]{
        // 克隆对话
        const extracted: ResponseChatMessage[] = [...conversations];

        // 校验最后一条消息的 role 是否是 'user', 不是则引发异常
        if (extracted[extracted.length - 1].role !== 'user') {
            throw new Error("The last message role must be 'user'");
        }

        // 清理超过20条的历史记录
        if (extracted.length > 20) {
            extracted.splice(0, extracted.length - 20);
        }

        return extracted
    }

    private onMessagePostprocess(responseData: string) {
        const response: ResponseTypes = JSON.parse(responseData);
        console.debug("Received Response: ", response);
        // verify
        if (response.header.code !== 0) {
            this.status = 'errorTTS';
            console.error("Error Response: ", response);
            return;
        }

        if (response.header.code === 0 && response.header.status === 2) {
            this.Socket.close();
            this.status = 'init';
        }

        // return
        const responseMessages: string = response.payload.choices.text[0].content;
        this.result += responseMessages;
        this.onMessage && this.onMessage(responseMessages);
    }

    private webSocketSend(conversations: ResponseChatMessage[], API_Domain: string,
                          chatParams?: RequestChatParameters, ChatID?: string) {
        const _chatParams: RequestChatParameters = {...chatParams};
        // 限制最大生成长度, 针对 v1.5 的 max_tokens 强制替换
        if (API_Domain === "general" && _chatParams.max_tokens) {
            _chatParams.max_tokens = (_chatParams.max_tokens >= 4096) ? 4096 : _chatParams.max_tokens;
        }

        const generateMessages: ResponseChatMessage[] = this.generateMessages(conversations);
        // 清理system
        if (API_Domain !== "generalv3.5") {
            generateMessages.forEach((item, index) => {
                if (item.role === "system") {
                    generateMessages.splice(index, 1);
                }
            });
        }

        // 构造请求体
        const requestParams: RequestTypes = {
            header: { app_id: this.APPID, uid: this.userID },
            parameter: {
                chat: {
                    domain: API_Domain,
                    ..._chatParams,
                    chat_id: ChatID || nanoid()
                }},
            payload: { message: { text: generateMessages } }
        }
        console.debug("Send Request: ", requestParams)
        this.Socket.send(JSON.stringify(requestParams))
    }

    connectWebSocket(conversations: ResponseChatMessage[],
                     WssURL: string = "wss://spark-api.xf-yun.com/v3.5/chat", API_Domain?: string,
                     chatParams?: RequestChatParameters, ChatID?: string
    ) {
        this.status = 'ttsing';
        generateWebsocketUrl(this.APIKey, this.APISecret, WssURL).then((url) => {
          this.Socket = new WebSocket(url);
            this.Socket.onopen = () => {
                console.debug("WebSocket Opened");
                this.webSocketSend(conversations, API_Domain || this.getDomain(WssURL), chatParams, ChatID);
            };

            this.Socket.onmessage = (event) => {
                this.onMessagePostprocess(event.data);
            };

            this.Socket.onerror = () => {
                this.status = 'errorTTS';
                console.error(`详情查看：${encodeURI(url.replace('wss:', 'https:'))}`);
            };

            this.Socket.onclose = () => {
                this.onFinish && this.onFinish(this.result);
            };
        }).catch((error) => {
            console.error(error);
        })
    }
}