import p5 from "p5";
import { Vector2 } from "../../sketch/runtime";
import { ColorData, EditorShapeWidgetState, makeSketchColor, scaleAlpha } from "../editorState";

export enum EditorShapeType{
    RECT= "rect",
}
export const editorShapeTypeInfo : {[key :string] : {prettyName:string}} ={
    [EditorShapeType.RECT]:{
        prettyName:"Rect",
    }
}
export type EditorShape = EditorShapeRect;
export type EditorShapeRect = {
    type: EditorShapeType.RECT,
    origin: Vector2, 
    extent: Vector2, 
    fill?: ColorData,
    stroke?:{color: ColorData,weight: number},
}
export type DrawSpec = {
    alpha?: number,
}
export type Drawer={
    draw: (spec ?: DrawSpec)=> void;
}

export function yieldShapeDrawer(value: EditorShapeRect, widget: EditorShapeWidgetState, s: p5): Drawer {
    switch(value.type){
        case EditorShapeType.RECT : {
            return {
                draw: (spec)=>{
                    const alpha = spec?.alpha ?? 255;
                    // console.log("Drawing")
                    if(value.fill){
                        s.fill(makeSketchColor(scaleAlpha(value.fill,alpha),s))
                    }else{
                        s.noFill();
                    }
                    if(value.stroke){
                        s.stroke(makeSketchColor(scaleAlpha(value.stroke.color,alpha),s))
                        s.strokeWeight(value.stroke.weight);
                    }else{
                        s.noStroke();
                    }
                    s.rect(value.origin.x, value.origin.y,value.extent.x, value.extent.y)
                }
            }

        }
    }
}