import { CompiledSchematic } from "./compiler";
import { Skin } from "./skin";
export interface RenderOptions {
    optimize: boolean;
    drawBoxes?: boolean;
    fontFile?: string;
    fontSize: number;
    bakeText?: boolean;
}
export declare function render(schematic: CompiledSchematic, skin: Skin, options?: RenderOptions): Promise<string>;
