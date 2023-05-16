import p5 from "p5";
import { EditorStateInterface } from "../edit/editorState";

export type EvalResult = {
    ok: false,
    errorMessage: string,
  } | {
    ok: true,
    sketch: (p:p5,e:EditorStateInterface)=> void,
}
export function getErrorMessage(error:any){
    if ( error instanceof Error){
      return error.message;
    }
    if ( typeof error === "string") {
      return error
    }
    return "error?";
  }
  
export class Vector2 extends p5.Vector{
    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    };

    prettyString(): string {
        return `<${this.x.toFixed(6)}, ${this.y.toFixed(6)}>`
    }

    static add(v1: p5.Vector, v2: p5.Vector, target?: p5.Vector): Vector2{
        const result = new Vector2(v1.x+v2.x,v1.y+v2.y,v1.z+v2.z);
        if(target){
            target.x = result.x;
            target.y = result.y;
            target.z = result.z;
        }
        return result;
    }
}
function vec2(x:number,y:number): Vector2{
    return new Vector2(x,y)
}
export function fixVec2(v:any): Vector2 | null{
    if("x" in v && "y" in v) return new Vector2(v.x,v.y)
    return null;
}

export function evalScript(src:string): EvalResult{
    try{
      return {ok: true, sketch:eval("(s,e)=>{"+src+"}") }
    }catch (error) {
      return {ok: false, errorMessage: getErrorMessage(error)};
    }
} 