import axios from 'axios';

import {
    openaiChatCompletionRequestMessages,
    openaiChatCompletionRequestParams,
    openaiListModelsResponse
} from '@/types/OpenaiAPI'

import OpenAI from "openai";
import {Stream} from "openai/streaming";

const API_VERSION: string = "v1"
const OPENAI_API_KEY: string = "EMPTY"

const HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
}

const apiClient = axios.create({
    timeout: undefined,
    headers: HEADERS
})

// v1/models
export async function listModels(url: string): Promise<openaiListModelsResponse> {
    /* List all available models. */
    const modelListURL = new URL(url)
    modelListURL.pathname = `/${API_VERSION}/models`

    return new Promise((resolve, reject) => {
        apiClient({
            method: "GET",
            url: modelListURL.toString()
        }).then(response => {
            const data: openaiListModelsResponse = response.data
            resolve(data)
        }).catch(error => {
            console.error(error)
            reject(error)
        })
    })
}

// v1/chat/completions
export async function createChatCompletion(
    url: string,
    messages: openaiChatCompletionRequestMessages[],
    model_name: string,
    api_key?: string,
    additionalParams?: openaiChatCompletionRequestParams,
    ): Promise<OpenAI.Chat.Completions.ChatCompletion | Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    /* Create a chat completion. */
    const completionURL = new URL(url)
    completionURL.pathname = `/${API_VERSION}`
    const openai: OpenAI = new OpenAI({
        baseURL: completionURL.toString(),
        apiKey: api_key ? api_key : OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
    });
    return openai.chat.completions.create({
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessage[],
        model: model_name,
        stream: additionalParams?.stream
    });
}
