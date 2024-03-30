// /v1/models
export interface openaiListModelsResponse {
    object: string;
    data: {
        id: string;
        object?: string;
        created?: number;
        owned_by?: string;
        config?: {
            stream?: boolean;
            VL?: boolean,
            langchain?: boolean
        }
    }[];
}

// completions params
export interface openaiChatCompletionRequestParams {
    frequency_penalty?: number | null;
    logprobs?: number | null;
    max_tokens?: number | null;
    n?: number | null;
    presence_penalty?: number | null;
    seed?: number | null;
    stop?: string | string[] | any;
    stream?: boolean | null;
    temperature?: number | null;
    top_p?: number | null;
    user?: string;
}

// /v1/chat/completions
export interface openaiChatCompletionRequestMessagesContent {
    type: "image_url" | "text";
    image_url?: { url: string };
    text?: string;
}


export interface openaiChatCompletionRequestMessages {
    role: "system" | "user" | "assistant";
    content: string | openaiChatCompletionRequestMessagesContent[];
}

interface openaiChatCompletionRequest extends openaiChatCompletionRequestParams {
    model: string;
    messages: openaiChatCompletionRequestMessages[];
    functions?: any;    // deprecated
    function_call?: any;   // deprecated
    tools?: {
        type: string;
        function: {
            description?: string;
            name: string;
            parameters?: any;
        };
    }[];
    tool_choice?: "auto" | "none" | {
        type: "function";
        function: {
            name: string;
        };
    };
}

export interface openaiChatCompletionResponse {
    id: string;
    object: "chat.completion" | "chat.completion.chunk";
    created: number;
    model: string;
    system_fingerprint? : string;
    choices: {
        index: number;
        message?: {
            role: string;
            content?: string;
            tool_calls?: {
                id: string;
                type: string;
                function: {
                    name: string;
                    arguments: string;
                };
            }[];
            function_call?: any;    // deprecated
        };
        delta?: {
            role?: string;
            content?: string;
        }
        logprobs?: any | null;
        finish_reason: "stop" | "length" | "content_filter" | "tool_calls" | "function_call" | null;
    }[];
    usage?: {
        "prompt_tokens": number,
        "total_tokens": number,
        "completion_tokens": number
    }
}

// /v1/completions
interface openaiCompletionRequest extends openaiChatCompletionRequestParams {
    model: string;
    prompt: string;
    best_of?: number | null;
    echo?: boolean | null;
    suffix?: string | null;
}

// /v1/files
export interface openaiFileResponseObject {
    id: string;
    object: string;
    bytes: number;
    created_at?: number;
    filename: string;
    purpose: "fine-tune" | "fine-tune-results" | "assistants" | "assistants_output";
}