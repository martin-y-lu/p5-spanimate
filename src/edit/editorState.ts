import { Vector2, fixVec2 } from "../sketch/runtime"
import p5 from "p5";
import { EditorShape, EditorShapeRect, yieldShapeDrawer } from "./shape/types";

export type Indexor = string | number 
export enum EditorDataType{
    ANY=  "any",
    NUMBER= "number",
    VECTOR2= "Vector2",
    COLOR= "Color",
    TOGGLE= "Toggle",
    SHAPE= "Shape"
}
export const editorDataTypeInfo : {[key :string] : {prettyName:string}} = {
    [EditorDataType.ANY]:{
        prettyName: "Any"
    },
    [EditorDataType.VECTOR2]:{
        prettyName: "Vector2"
    },
    [EditorDataType.NUMBER]:{
        prettyName: "Number"
    },
    [EditorDataType.COLOR ]:{
        prettyName: "Color",
    },
    [EditorDataType.TOGGLE ]:{
        prettyName: "Toggle",
    },
    [EditorDataType.SHAPE ]:{
        prettyName: "Shape",
    },
}
export type EditorDataValueInfo= EditorDataValueAny| EditorDataValueNumber | EditorDataValueVector2 | EditorDataValueColor | EditorDataValueToggle | EditorDataValueShape; 

export type EditorDataValueAny = {
    type: EditorDataType.ANY,
    value:any,
} 
export type EditorDataValueNumber =  {
    type: EditorDataType.NUMBER,
    value: number,
    max: number,
    min: number,
    step: number,
} 
export type EditorDataValueVector2 = {
    type: EditorDataType.VECTOR2,
    value: Vector2,
    editOrigin: Vector2,
    editScale: number,
}
export type ColorData = { r: number, g: number, b:number, a:number }

export type EditorDataValueColor = {
    type: EditorDataType.COLOR,
    value: ColorData, 
}
export type EditorDataValueToggle = {
    type: EditorDataType.TOGGLE,
    value: boolean, 
}
export type EditorShapeWidgetState = {
  showMouse: boolean,
}
export type EditorDataValueShape = {
    type: EditorDataType.SHAPE,
    value: EditorShape,
    widget: EditorShapeWidgetState,
    editOrigin: Vector2,
    editScale: number,
    editSize: number,
}

export function copyEditorValueInfo(evi: EditorDataValueInfo): EditorDataValueInfo{
    //do something better here
    const copy = JSON.parse(JSON.stringify(evi)) as EditorDataValueInfo
    cleanValue(copy)
    return copy
}

// Used in editor state to fix data
function cleanValue(entry: EditorDataValueInfo| undefined):any{
    if(!entry) return null;
    // console.log("cleaning value",entry,entry.value)
    if(entry.type === EditorDataType.VECTOR2){
      let fixed = fixVec2(entry.value)
      if(fixed){
        entry.value = fixed;
      }
    } 
    if(entry.type === EditorDataType.SHAPE){
      return null;
    }
    return entry.value
}

// 

export type EditorDataEntry = {data?: EditorData, valueInfo?:EditorDataValueInfo}

export function makeSketchColor(col:ColorData,s:p5): p5.Color{
  return s.color(col.r,col.g,col.b,col.a)
}
// Used when emitting to sketch
function yieldValue(entry: EditorDataEntry, sketch: p5) : any{
  if(!(entry?.valueInfo)) return null
  if(entry.valueInfo.type === EditorDataType.COLOR){
    let col = entry.valueInfo.value;
    return sketch.color(col.r,col.g,col.b,col.a)
  }
  if(entry.valueInfo.type === EditorDataType.SHAPE){
    return yieldShapeDrawer(entry.valueInfo.value,entry.valueInfo.widget,sketch);
  }
  return cleanValue(entry.valueInfo);
}

export type EditorData = {
  [key : Indexor]: EditorDataEntry
}

// used in importing editor data
export function cleanEditorData(ed:EditorData):EditorData{
    console.log("Cleaning ED",ed)
    for(let key of Object.keys(ed)){
        const ede = ed[key];
        console.log("EDE",ede)
        if(ede?.valueInfo){
            cleanValue(ede?.valueInfo);
        }
        if(ede?.data){
            cleanEditorData(ede.data)
        }
    }
    return ed
}

export type EditorStateInterface = {
  val: ()=> any;
  get: (...key: Indexor[]) => any;
  from: (...key: Indexor[]) => EditorStateInterface | null;
  count: (...key: Indexor[]) => number;
  push: (key: Indexor) => void;
  pop: () => void;
}
export class EditorState{
  //The context stores stack of all indexors pushed
  context: Indexor[] = [];
  //Stack stores stack of data that exists
  //Can be shorter than the context when nonexistant indexes pushed
  //Cannot be longer
  stack: EditorDataEntry[] = [];
  data: EditorDataEntry = {};
  constructor(data?:EditorData){
    if(data){
      this.data = {data};
      this.resetStack();
    }
  }
  resetStack(){
    this.context = ["root"];
    this.stack = [this.data];

  }
  current(): EditorDataEntry | null {
    //If context indexing nonexistanct data
    if(this.context.length > this.stack.length) return null;

    if(this.stack.length === 0){
      return null
    }
    return this.stack[this.stack.length -1]
  }
  getByKey(key:Indexor):EditorDataEntry | null {
    const currDat = this.current()?.data;
    if(!currDat) return null
    if(key in currDat) return currDat[key]
    return null;
  }
  getCurrentData(key:Indexor): any|null{
    return this.getByKey(key)
  }
  getCurrentValue(key:Indexor): any|null{
    return cleanValue(this.getByKey(key)?.valueInfo);
  }
  pushContext(key:Indexor){
    // console.log(this.context,this)
    const data = this.getCurrentData(key)
    this.context.push(key)
    // console.log({data})
    if(data != null){
      this.stack.push(data)
    }
    // console.log(this.context,this.stack)
  }
  popContext(){
    if(this.context.length > 1){
      if(this.context.length === this.stack.length) this.stack.pop()
      this.context.pop();
    }
  }
  makeSketchInterface(sketch:p5): EditorStateInterface{
    const self = this;
    return {
      val: ()=> {
        const current = self.current();
        if(!current) return null;
        return yieldValue(current,sketch)
      },
      get: (...keys) =>{
        // return self.getCurrentValue(keys[0])
        if( keys.length === 0 ) return null;
        let dat = self.current()?.data ?? null; 
        if(!dat) return null;
        for(let i =0; i<keys.length-1;i++){
          let key = keys[i];
          const new_dat : EditorData | null =  dat?.[key]?.data  ?? null;
          dat = new_dat
          if(! dat) return null;
        }
        let key = keys[keys.length-1];
        return yieldValue(dat?.[key],sketch) ?? null
      },
      from: (...keys) =>{
        // return self.getCurrentValue(keys[0])
        if( keys.length === 0 ) return null;
        let dat = self.current()?.data ?? null; 
        if(!dat) return null;
        for(let i =0; i<keys.length;i++){
          let key = keys[i];
          const new_dat : EditorData | null =  dat?.[key]?.data  ?? null;
          dat = new_dat
          if(! dat) return null;
        }
        // console.log("FromDat",dat)

        return new EditorState(dat).makeSketchInterface(sketch);
      },
      count: (...keys) =>{
        // return self.getCurrentValue(keys[0])
        let dat = self.current()?.data ?? null; 
        if(!dat) return 0;
        for(let i =0; i<keys.length;i++){
          let key = keys[i];
          const new_dat : EditorData | null =  dat?.[key]?.data  ?? null;
          dat = new_dat
          if(! dat) return 0;
        }
        return  Object.keys(dat).length;
      },
      push: (key)=> self.pushContext(key),
      pop: ()=> self.popContext(),
    }

  }
}


