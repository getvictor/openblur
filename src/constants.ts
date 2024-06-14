export interface Mode {
    index: number;
    id: string;
    text: string;
    color: string;
}

export interface Message {
    action?: string;
    mode?: Mode;
    literals?: string[];
}

export interface StoredConfig {
    mode?: Mode;
    literals?: string[];
}

export const MODES: Mode[] = [
    {
        index: 0,
        id: "off",
        text: "off",
        color: "#AAAAAA",
    },
    {
        index: 1,
        id: "on",
        text: "blur",
        color: "#008C20",
    },
]

export const NUMBER_OF_LITERALS = 10
