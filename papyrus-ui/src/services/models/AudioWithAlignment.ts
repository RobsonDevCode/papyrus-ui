import type { AlignmentData } from "./AlignmentData";

export interface AudioWithAlignment {
    audioUrl: string;
    alignment: AlignmentData[];
}