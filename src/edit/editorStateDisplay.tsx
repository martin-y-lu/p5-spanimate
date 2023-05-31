import { Dispatch, SetStateAction, useEffect, useReducer, useRef, useState } from "react";
import { ColorData, EditorData, EditorDataEntry, EditorDataType, EditorDataValueColor, EditorDataValueInfo, EditorDataValueToggle, EditorDataValueVector2, EditorState, copyEditorValueInfo, editorDataTypeInfo } from "./editorState"
import Select from 'react-select'
import { Vector2, fixVec2 } from "../sketch/runtime";
import { Button } from "../ui/button";
import { text } from "stream/consumers";
import p5 from "p5";
import reactColor, {SketchPicker,CompactPicker} from "react-color"
import Switch from '@mui/material/Switch';
import { EditorDataCreationWidget } from "./editorDataCreationWidget";
import { EditorDataEditWidget } from "./editorDataEditWidget";
import { editorShapeTypeInfo } from "./shape/types";

export type EditorStateDisplayProps = {
    editorData: EditorData,
    depth?: number,
    setNewKey?:Dispatch<SetStateAction<string>>
}

export function ArrowToggle(props:{open:boolean,onClick:any,bgColor:string}){
    const {open,onClick,bgColor} = props;
    return  <div onClick={onClick} className={` ${bgColor} rounded-lg mr-2 w-4 flex flex-row justify-center align-middle`}>
        {open?"v":">"}
    </div>
}

function isDataArray(data: EditorDataEntry):boolean{
    if(! data?.data) return false;
    let keys = Object.keys(data?.data);
    if(keys.length < 1) return false;
    for(let key of keys){
        const asNum = Number.parseInt(key);
        if(Number.isNaN(asNum)) return false;
    }
    return true;
}

function EditorValueDisplay(props:{data:EditorDataEntry}){
    let {data} = props;
    if( ! data?.valueInfo) return <></>
    if( data.valueInfo.type == EditorDataType.COLOR){
        let col = data.valueInfo.value;
        return<div className= "flex flex-row">
            {/* Color: */}
            <div className = "w-5 h-5 ml-3 border-slate-500 border rounded-sm" style={{background: `rgba(${col.r},${col.g},${col.b},${col.a/255})`}}></div>
        </div>
    }
    if( data.valueInfo.type == EditorDataType.SHAPE){
        return <div> Shapes:</div>
    }
    let textDisplay = "";
    if(typeof data.valueInfo?.value === "object" && "prettyString" in data.valueInfo?.value){
        textDisplay = data.valueInfo?.value.prettyString();
    } else{
        textDisplay=JSON.stringify(data.valueInfo?.value)
    }
    return <div> 
        {textDisplay} 
    </div>
}

export function EditorDisplayEntry(props:{editorData:EditorData,ind:string,depth:number, setNewKey?: Dispatch<SetStateAction<string>>}){
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    
    let {editorData,ind,depth,setNewKey:parentSetNewKey} = props;
    let data = editorData[ind];
    let [open,setOpen] = useState("data" in data || ! ("valueInfo" in data));
    let [newKey,setNewKey] = useState("")

    let subDat = (data  && data.data ) ? <EditorStateDisplay editorData={data.data} depth={depth+1} setNewKey={setNewKey}/> : <></>
    const bgColor= depth%2 == 0 ?'bg-slate-200' : 'bg-slate-100';
    const notBgColor= depth%2 == 0 ? 'bg-slate-100' :'bg-slate-200';

    let dataIsArray = isDataArray(data);
    let childCount = Object.keys(data.data ?? {}).length;
  

  return <div key={ind} className= {`${bgColor} pl-3 mt-2 border-l-2 border-slate-400`}>
    <div className="flex flex-row justify-between">
        <div className="flex flex-row items-center w-2/3" >
        <ArrowToggle open={open} onClick={()=>setOpen(!open)} bgColor={notBgColor}/>
        <div className="mr-2" onClick={()=>{
            if(parentSetNewKey){
                parentSetNewKey(ind);
            }
        }}>
            {ind} { dataIsArray && `[${childCount}]`}:
        </div>
        <EditorValueDisplay data={data}/> 
        {data?.valueInfo !== undefined && (dataIsArray || childCount === 0) && <Button style= "text-xs h-5 bg-slate-50 ml-6" text="Copy >" onClick={()=>{
            if(data.valueInfo === undefined) return 
            if( ! data.data){
                data.data = {}
            }
            let ind = Object.keys(data.data).length;
            while(ind in data.data){
                ind += 1;
            }
            data.data[ind] = {valueInfo: copyEditorValueInfo(data.valueInfo)}
            // setOpen(true);
            forceUpdate();

        }}/>}
        </div>
        <div className="flex flex-row"> 
            <EditorDataEditWidget data={data} forceUpdate={forceUpdate}/>
        </div>
    </div>
    {open && <>
        {subDat}
        <EditorDataCreationWidget {...{data,bgColor,notBgColor,forceUpdate,newKey,setNewKey}}/>
    </>}
  </div>  
}

export function EditorStateDisplay(props: EditorStateDisplayProps){
    let {editorData,depth,setNewKey} = props;
    const _depth = depth !== undefined ? depth : 0;
    
    return <div className="flex flex-col pl-2 pb-1" >
        { editorData && Object.keys(editorData).map((key)=>{
            return <EditorDisplayEntry editorData={editorData} key={key} ind = {key} depth={_depth} setNewKey={ setNewKey}/>
        })
        }
       
    </div>
}