import {openaiChatCompletionRequestMessagesContent} from "@/types/OpenaiAPI";
// import type {FilePreviewRaw} from "@/components/FilePreview.vue";

interface FilePreviewRaw {
    xhr?: XMLHttpRequest,
    raw: File,
    uid: number,
    url?: string,
    b64?: string,
    progress?: number,
    status?: 'success' | 'warning' | 'exception'
}

interface matchBoxType {
    name: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
}

function getMatches(String: string): matchBoxType[] {
    const regex: RegExp = /<ref>\s*(.*?)\s*<\/ref><box>\s*\((\d+),(\d+)\),\((\d+),(\d+)\)\s*<\/box>/g;
    const matches: matchBoxType[] = [];
    let match;
    while ((match = regex.exec(String)) !== null) {
        matches.push({
            name: match[1],
            x1: parseInt(match[2], 10),
            y1: parseInt(match[3], 10),
            x2: parseInt(match[4], 10),
            y2: parseInt(match[5], 10)
        });
    }
    return matches;
}

function PlotImg(Box: matchBoxType[]){

}

export function testMain(): matchBoxType[] {
    const exampleString: string = "<ref> A woman</ref><box>(448,381),(726,797)</box> playing with<ref> her dog</ref><box>(219,427),(580,891)</box> on the beach";
    return getMatches(exampleString);
}

export async function createMessageContent(query: string, fileList?: FilePreviewRaw[]): Promise<
    string | openaiChatCompletionRequestMessagesContent[]
> {
    if (fileList && fileList.length) {
        const imageList: openaiChatCompletionRequestMessagesContent[] = []
        // filter and add img files
        fileList.map(file => {
            if (file.raw.type.includes('image') && file.url) {
                return imageList.push({type: "image_url", image_url: {url: file.url}})
            }
        })
        // add text
        imageList.push({type: "text", text: query})
        return imageList
    }
    return query
}